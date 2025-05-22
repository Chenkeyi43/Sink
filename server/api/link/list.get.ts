import { z } from 'zod'

export default eventHandler(async (event) => {
  // 如果有项目组验证的异步操作，等待完成
  if (event.context.projectPromise) {
    await event.context.projectPromise
  }
  
  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  const { limit, cursor, projectId } = await getValidatedQuery(event, z.object({
    limit: z.coerce.number().max(1024).default(20),
    cursor: z.string().trim().max(1024).optional(),
    projectId: z.string().optional(), // 新增项目组筛选
  }).parse)
  
  // 构建查询前缀
  let prefix = 'link:'
  if (!event.context.isAdmin && event.context.project) {
    // 非管理员只能查看自己项目组的链接
    prefix = `link:${event.context.project.id}:`
  } else if (event.context.isAdmin && projectId) {
    // 管理员可以按项目组筛选
    prefix = `link:${projectId}:`
  }
  
  const list = await KV.list({
    prefix,
    limit,
    cursor: cursor || undefined,
  })
  
  if (Array.isArray(list.keys)) {
    list.links = await Promise.all(list.keys.map(async (key) => {
      const { metadata, value: link } = await KV.getWithMetadata(key.name, { type: 'json' })
      if (link) {
        return {
          ...metadata,
          ...link,
        }
      }
      return link
    }))
  }
  
  delete list.keys
  return list
})
