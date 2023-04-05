const amqplib = require('amqplib');
const fs = require('fs-extra');
(async function () {
  //连接 MQ服务器
  const mqClient = await amqplib.connect('amqp://localhost');
  //创建一个通道
  const logger = await mqClient.createChannel();
  //创建一个名称为logger的队列，如果已经存在，不会重复创建
  await logger.assertQueue('logger')

  // 消费者(相当于订阅logger这个通道)
  logger.consume('logger', async (event) => {
    await fs.appendFile('./logger.txt', event.content.toString() + '\n');
  });
})();