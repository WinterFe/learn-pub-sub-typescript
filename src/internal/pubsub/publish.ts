import type { ConfirmChannel } from "amqplib";

function publishJSON<T>(
  ch: ConfirmChannel,
  exchange: string,
  routingKey: string,
  value: T
): Promise<void> {
  const payload = Buffer.from(
    new TextEncoder().encode(JSON.stringify(value))
  ) as Buffer<ArrayBufferLike>;

  ch.publish(exchange, routingKey, payload, {
    contentType: "application/json",
  });

  // Satisfy return type
  return Promise.resolve();
}

export default publishJSON;
