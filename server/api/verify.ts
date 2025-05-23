export default eventHandler((event) => {
  return {
    name: 'Sink',
    url: 'https://sink.cool',
    isAdmin: event.context.isAdmin || false, // 添加管理员标识
  }
})
