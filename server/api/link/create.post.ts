import { LinkSchema } from '@/schemas/link'

export default eventHandler(async (event) => {
  // 如果有项目组验证的异步操作，等待完成
  if (event.context.projectPromise) {
    await event.context.projectPromise
  }
  
  const link = await readValidatedBody(event, LinkSchema.parse)

  const { caseSensitive } = useRuntimeConfig(event)

  if (!caseSensitive) {
    link.slug = link.slug.toLowerCase()
  }

  // 添加项目组关联
  if (event.context.project) {
    link.projectId = event.context.project.id
  }

  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  const existingLink = await KV.get(`link:${link.projectId}:${link.slug}`)
  if (existingLink) {
    throw createError({
      status: 409, // Conflict
      statusText: 'Link already exists',
    })
  }

  else {
    const expiration = getExpiration(event, link.expiration)
    const application = getHeader(event, 'application') || 'unknown'
    link.application = application
    await KV.put(`link:${link.projectId}:${link.slug}`, JSON.stringify(link), {
      expiration,
      metadata: {
        expiration,
        url: link.url,
        comment: link.comment,
        application,
        projectId: link.projectId,
      },
    })
    setResponseStatus(event, 201)
    const shortLink = `${getRequestProtocol(event)}://${getRequestHost(event)}/${link.slug}`
    return { link, shortLink }
  }
})
