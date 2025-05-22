import type { LinkSchema } from '@/schemas/link'
import type { z } from 'zod'
import { parsePath, withQuery } from 'ufo'

export default eventHandler(async (event) => {
  const { pathname: slug } = parsePath(event.path.replace(/^\/|\/$/g, '')) // remove leading and trailing slashes
  const { slugRegex, reserveSlug } = useAppConfig(event)
  const { homeURL, linkCacheTtl, redirectWithQuery, caseSensitive } = useRuntimeConfig(event)
  const { cloudflare } = event.context

  if (event.path === '/' && homeURL)
    return sendRedirect(event, homeURL)

  if (slug && !reserveSlug.includes(slug) && slugRegex.test(slug) && cloudflare) {
    const { KV } = cloudflare.env

    let link: z.infer<typeof LinkSchema> | null = null

    // 修改获取链接的方法，支持多项目组
    const getLink = async (slugKey: string) => {
      // 查询所有项目的链接
      const list = await KV.list({
        prefix: 'link:',
      })
      
      // 遍历所有键，找到匹配 slug 的记录
      if (Array.isArray(list.keys)) {
        for (const key of list.keys) {
          // 从键名中提取 slug
          const parts = key.name.split(':')
          const keySlug = parts[parts.length - 1]
          
          if (keySlug === slugKey) {
            // 找到匹配的键，获取链接数据
            return await KV.get(key.name, { type: 'json', cacheTtl: linkCacheTtl })
          }
        }
      }
      return null
    }

    const lowerCaseSlug = slug.toLowerCase()
    link = await getLink(caseSensitive ? slug : lowerCaseSlug)

    // fallback to original slug if caseSensitive is false and the slug is not found
    if (!caseSensitive && !link && lowerCaseSlug !== slug) {
      console.log('original slug fallback:', `slug:${slug} lowerCaseSlug:${lowerCaseSlug}`)
      link = await getLink(slug)
    }

    if (link) {
      event.context.link = link
      console.log('event',event)
      try {
        await useAccessLog(event)
      }
      catch (error) {
        console.error('Failed write access log:', error)
      }
      const target = redirectWithQuery ? withQuery(link.url, getQuery(event)) : link.url
      return sendRedirect(event, target, +useRuntimeConfig(event).redirectStatusCode)
    }
  }
})
