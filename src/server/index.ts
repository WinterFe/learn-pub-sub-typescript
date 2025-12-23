import amqp from "amqplib";
import publishJSON from "../internal/pubsub/publish.js";
import {
  ExchangePerilDirect,
  ExchangePerilTopic,
  GameLogSlug,
  PauseKey,
} from "../internal/routing/routing.js";
import type { PlayingState } from "../internal/gamelogic/gamestate.js";
import { getInput, printServerHelp } from "../internal/gamelogic/gamelogic.js";
import declareAndBind from "../internal/pubsub/declare.js";

async function main() {
  const connectionUri = "amqp://guest:guest@localhost:5672/";
  const client = await amqp.connect(connectionUri);
  console.log("Server connected to RabbitMQ!");

  ["SIGINT", "SIGTERM"].forEach((signal) =>
    process.on(signal, async () => {
      try {
        await client.close();
        console.log("RabbitMQ connection closed.");
      } catch (err) {
        console.error(`Error while closing RabbitMQ connection: ${err}`);
      } finally {
        process.exit(0);
      }
    })
  );

  printServerHelp();

  await declareAndBind(
    client,
    ExchangePerilTopic,
    GameLogSlug,
    `${GameLogSlug}.*`,
    "durable"
  );
  const confirmChannel = await client.createConfirmChannel();

  // We're now publishing the state via commands below.
  // publishJSON(confirmChannel, ExchangePerilDirect, PauseKey, state);

  while (true) {
    const input = await getInput();
    if (input.length === 0) continue;

    if (input[0] === "pause") {
      console.log("Sending pause message to RabbitMQ.");
      const pauseState: PlayingState = { isPaused: true };

      publishJSON(confirmChannel, ExchangePerilDirect, PauseKey, pauseState);
    } else if (input[0] === "resume") {
      console.log("Sending resume message to RabbitMQ.");
      const resumeState: PlayingState = { isPaused: false };

      publishJSON(confirmChannel, ExchangePerilDirect, PauseKey, resumeState);
    } else if (input[0] === "quit") {
      console.log("Exiting...");
      process.exit(1);
    } else {
      console.log("Unknown command.");
      continue;
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
