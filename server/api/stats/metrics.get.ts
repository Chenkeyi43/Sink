import type { H3Event } from 'h3'
import { QuerySchema } from '@/schemas/query'
import { z } from 'zod'

const { select } = SqlBricks

const MetricsQuerySchema = QuerySchema.extend({
  type: z.string(),
})

function query2sql(query: z.infer<typeof MetricsQuerySchema>, event: H3Event): string {
  const filter = query2filter(query)
  const { dataset } = useRuntimeConfig(event)

  // @ts-expect-error todo
  const sql = select(`${logsMap[query.type]} as name, SUM(_sample_interval) as count`).from(dataset).where(filter).groupBy('name').orderBy('count DESC').limit(query.limit)
  if query.type === 'slug'
    console.log('打印下查询slug SQL',sql.toString())
    
  appendTimeFilter(sql, query)
  return sql.toString()
}

export default eventHandler(async (event) => {
  const query = await getValidatedQuery(event, MetricsQuerySchema.parse)
  const sql = query2sql(query, event)
  return useWAE(event, sql)
})
