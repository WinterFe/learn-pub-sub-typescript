import type { Channel, ChannelModel, Replies } from "amqplib";

export type SimpleQueueType = "durable" | "transient";

export async function declareAndBind(
  client: ChannelModel,
  exchange: string,
  queueName: string,
  key: string,
  queueType: SimpleQueueType
): Promise<[Channel, Replies.AssertQueue]> {
  const channel = await client.createChannel();
  const queue = await channel.assertQueue(queueName, {
    durable: queueType === "durable" ? true : false,
    autoDelete: queueType === "transient" ? true : false,
    exclusive: queueType === "transient" ? true : false,
  });

  await channel.bindQueue(queueName, exchange, key);

  return [channel, queue];
}

export default declareAndBind;
