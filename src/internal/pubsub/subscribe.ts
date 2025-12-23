import type { ChannelModel, ConfirmChannel, Message } from "amqplib";
import declareAndBind from "./declare.js";

export type SimpleQueueType = "durable" | "transient";

export async function subscribeJSON<T>(
  client: ChannelModel,
  exchange: string,
  queueName: string,
  key: string,
  queueType: SimpleQueueType, // an enum to represent "durable" or "transient"
  handler: (data: T) => void
): Promise<void> {
  const [channel, queue] = await declareAndBind(
    client,
    exchange,
    queueName,
    key,
    queueType
  );
  await channel.consume(queue.queue, async (msg) => {
    if (msg === null) return;
    const msgContentString: string = msg?.content.toString("utf8") ?? "";
    const parsedMsgContent = JSON.parse(msgContentString);

    handler(parsedMsgContent);

    await channel.ack(msg);
  });
}

export default subscribeJSON;
