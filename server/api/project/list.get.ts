import { z } from 'zod'

export default eventHandler(async (event) => {
  // 只允许管理员查看项目列表
  const config = useRuntimeConfig(event)
  const token = getHeader(event, 'Authorization')?.replace('Bearer ', '')
  
  if (token !== config.siteToken)
    throw createError({
      status: 401,
      statusText: 'Unauthorized',
    })
  
  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  const { limit, cursor } = await getValidatedQuery(event, z.object({
    limit: z.coerce.number().max(1024).default(20),
    cursor: z.string().trim().max(1024).optional(),
  }).parse)
  
  const list = await KV.list({
    prefix: 'project:',
    limit,
    cursor: cursor || undefined,
  })
  
  if (Array.isArray(list.keys)) {
    list.projects = await Promise.all(list.keys.map(async (key) => {
      const project = await KV.get(key.name, { type: 'json' })
      if (project) {
        // 不返回 token
        const { token: _, ...projectInfo } = project
        return projectInfo
      }
      return null
    }))
  }
  
  delete list.keys
  return list
})