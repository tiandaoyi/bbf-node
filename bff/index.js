const Koa = require('koa');
const router = require('koa-router')();
const logger = require('koa-logger');
const rpcMiddleware = require('./middleware/rpc');
const cacheMiddleware = require('./middleware/cache');
const mqMiddleware = require('./middleware/mq');
const app = new Koa();
app.use(logger());
app.use(rpcMiddleware({
  interfaceNames: [
    'com.zhufeng.user',
    'com.zhufeng.post'
  ]
}));
app.use(cacheMiddleware());
app.use(mqMiddleware());
router.get('/', async (ctx) => {
  const userId = ctx.query.userId;
  // 消息队列
  // 使用sendToQueue往队列中发送消息
  ctx.channels.logger.sendToQueue('logger', Buffer.from(JSON.stringify({
    method: ctx.method,
    path: ctx.path,
    userId
  })))
  //现在想把用户的访问情况写入文件持久化保存
  const cacheKey = `${ctx.method}-${ctx.path}-${userId}`;
  let cacheData = await ctx.cache.get(cacheKey);
  if (cacheData && typeof cacheData !== 'undefined') {
    ctx.body = cacheData;
    return;
  }
  // 接口聚合
  const { rcpConsumers: { user, post } } = ctx;
  const [userInfo, postCount] = await Promise.all([
    user.invoke('getUserInfo', [userId]),
    post.invoke('getPostCount', [userId])
  ]);
  //数据的裁剪，把不需要的信息和字符裁剪掉,不返回给客户端
  delete userInfo.password;
  //数据需要脱敏
  userInfo.phone = userInfo.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  //数据适配
  userInfo.avatar = `http://img.zhufeng.com/${userInfo.avatar}`
  cacheData = {
    userInfo,
    postCount
  }
  await ctx.cache.set(cacheKey, cacheData)
  ctx.body = cacheData
});
app.use(router.routes()).use(router.allowedMethods());
app.listen(3000, () => {
  console.log(`bff server is running at 3000`);
});