import type { ChannelModel } from "amqplib";
import declareAndBind from "./declare.js";

export type SimpleQueueType = "durable" | "transient";
export type AckType = "Ack" | "NackRequeue" | "NackDiscard";

export async function subscribeJSON<T>(
  client: ChannelModel,
  exchange: string,
  queueName: string,
  key: string,
  queueType: SimpleQueueType, // an enum to represent "durable" or "transient"
  handler: (data: T) => Promise<AckType> | AckType
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

    const handlerData = handler(parsedMsgContent);

    if (handlerData === "Ack") {
      await channel.ack(msg);
    } else if (handlerData === "NackDiscard") {
      await channel.nack(msg, false, false);
    } else {
      await channel.nack(msg, false, true);
    }
  });
}

export default subscribeJSON;
