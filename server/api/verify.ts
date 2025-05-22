export default eventHandler((event) => {
  return {
    name: 'Sink',
    url: 'https://sink.cool',
    isAdmin: event.context.isAdmin || false, // 添加管理员标识
    role: event.context.isAdmin ? 'admin' : 'project', // 添加用户角色
  }
})
