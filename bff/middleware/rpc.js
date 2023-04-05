const {
  client: { RpcClient },//可以使用它创建RPC服务器
  registry: { ZookeeperRegistry }//可以通过它来创注册中心 
} = require('sofa-rpc-node');
const logger = console

const rpcMiddleware = (options = {}) => {
  return async function (ctx, next) {
    const registry = new ZookeeperRegistry({
      //记录日志用哪个工具
      logger,
      //zookeeper的地址
      address: '127.0.0.1:2181'
    });
    //创建RPC客户端
    const client = new RpcClient({
      logger,
      registry
    });
    const interfaceNames = options.interfaceNames || [];
    const rcpConsumers = {};
    for (let i = 0; i < interfaceNames.length; i++) {
      const interfaceName = interfaceNames[i];
      //创建RPC消费者，通过消费者调用RPC服务
      const consumer = client.createConsumer({ interfaceName });
      await consumer.ready();
      rcpConsumers[interfaceName.split('.').pop()] = consumer;
    }
    ctx.rcpConsumers = rcpConsumers;
    await next();
  }
}
module.exports = rpcMiddleware;