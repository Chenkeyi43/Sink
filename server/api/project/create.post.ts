import { z } from 'zod'
import { nanoid } from 'nanoid'

export default eventHandler(async (event) => {
  // 只允许管理员创建项目组，useRuntimeConfig(event) 请求特定 的运行时配置
  const config = useRuntimeConfig(event)
  const token = getRequestHeader(event, 'authorization')?.replace('Bearer ', '')
  if (token !== config.siteToken)
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  
  const body = await readBody(event)
  const { projectName, description } = await z.object({
    projectName: z.string().min(1).max(50),
    description: z.string().optional(),
  }).parseAsync(body)
  
  const { cloudflare } = event.context
  const { KV } = cloudflare.env

  // 直接检查项目名称是否存在
  const existingProject = await KV.get(`project:${projectName}`)
  if (existingProject) {
    throw createError({
      status: 409,
      statusText: `项目 "${projectName}" 已存在`,
    })
  }
  
  // 生成项目Token
  const projectToken = nanoid(12)
  
  const project = {
    projectName,
    description,
    token: projectToken,
    createdAt: Math.floor(Date.now() / 1000),
  }
  
  // 使用项目名称作为存储键
  await KV.put(`project:${projectName}`, JSON.stringify(project))
  
  // 返回项目信息（不包含 token）
  const { token: _, ...projectInfo } = project
  
  return {
    project: {
      ...projectInfo,
      token: projectToken, // 只在创建时返回 token
    },
  }
})