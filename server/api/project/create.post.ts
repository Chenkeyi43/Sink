import { z } from 'zod'
import { nanoid } from 'nanoid'

export default eventHandler(async (event) => {
  // 只允许管理员创建项目组，useRuntimeConfig(event) 请求特定 的运行时配置
  const config = useRuntimeConfig(event)
  const token = getRequestHeader(event, 'authorization')?.replace('Bearer ', '')
  console.log(token,"========", config.siteToken)
  if (token !== config.siteToken)
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  
  const body = await readBody(event)
  const { name, description } = await z.object({
    name: z.string().min(1).max(50),
    description: z.string().optional(),
  }).parseAsync(body)
  
  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  
  // 生成项目 ID 和 Token
  const projectId = nanoid(10)
  const projectToken = nanoid(32)
  
  const project = {
    id: projectId,
    name,
    description,
    token: projectToken,
    createdAt: Math.floor(Date.now() / 1000),
  }
  
  // 存储项目信息
  await KV.put(`project:${projectId}`, JSON.stringify(project))
  
  // 返回项目信息（不包含 token）
  const { token: _, ...projectInfo } = project
  
  return {
    project: {
      ...projectInfo,
      token: projectToken, // 只在创建时返回 token
    },
  }
})