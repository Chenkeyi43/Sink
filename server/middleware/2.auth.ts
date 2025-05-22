export default eventHandler((event) => {
  const token = getHeader(event, 'Authorization')?.replace('Bearer ', '')
  
  // 检查是否为管理员 Token
  if (event.path.startsWith('/api/') && !event.path.startsWith('/api/_')) {
    // 先检查是否为管理员 Token
    if (token === useRuntimeConfig(event).siteToken) {
      // 设置管理员标识
      event.context.isAdmin = true
    } 
    // 如果不是管理员 Token，检查是否为项目组 Token
    else {
      const { cloudflare } = event.context
      if (cloudflare && cloudflare.env && cloudflare.env.KV) {
        // 异步检查项目组 Token
        event.context.projectPromise = cloudflare.env.KV.list({ prefix: 'project:' })
          .then(async (projects) => {
            if (Array.isArray(projects.keys)) {
              for (const key of projects.keys) {
                const projectData = await cloudflare.env.KV.get(key.name, { type: 'json' })
                if (projectData && projectData.token === token) {
                  // 找到匹配的项目组 Token，修改返回的项目信息结构
                  event.context.project = {
                    name: projectData.projectName,
                  }
                  return true
                }
              }
            }
            // 未找到匹配的 Token，抛出错误
            throw createError({
              status: 401,
              statusText: 'Unauthorized',
            })
          })
          .catch(() => {
            throw createError({
              status: 401,
              statusText: 'Unauthorized',
            })
          })
      } else {
        // 如果不是管理员 Token 且没有 KV 环境，则未授权
        throw createError({
          status: 401,
          statusText: 'Unauthorized',
        })
      }
    }
  }
  
  // 检查 Token 长度
  if (token && token.length < 8) {
    throw createError({
      status: 401,
      statusText: 'Token is too short',
    })
  }
})
