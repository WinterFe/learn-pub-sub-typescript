import amqp from "amqplib";
import {
  clientWelcome,
  commandStatus,
  getInput,
  printClientHelp,
  printQuit,
} from "../internal/gamelogic/gamelogic.js";
import declareAndBind from "../internal/pubsub/declare.js";
import {
  ArmyMovesPrefix,
  ExchangePerilDirect,
  ExchangePerilTopic,
  PauseKey,
} from "../internal/routing/routing.js";
import {
  GameState,
  type PlayingState,
} from "../internal/gamelogic/gamestate.js";
import { commandSpawn } from "../internal/gamelogic/spawn.js";
import {
  commandMove,
  handleMove,
  MoveOutcome,
} from "../internal/gamelogic/move.js";
import { handlePause } from "../internal/gamelogic/pause.js";
import subscribeJSON from "../internal/pubsub/subscribe.js";
import type { ArmyMove } from "../internal/gamelogic/gamedata.js";
import publishJSON from "../internal/pubsub/publish.js";

function handlerPause(gs: GameState): (ps: PlayingState) => void {
  return (ps: PlayingState) => {
    handlePause(gs, ps);
    console.log("> ");
  };
}

function handlerMove(gs: GameState): (am: ArmyMove) => void {
  return (am: ArmyMove) => {
    handleMove(gs, am);
    console.log("> ");
  };
}

async function main() {
  console.log("Starting Peril client...");

  const connectionUri = "amqp://guest:guest@localhost:5672/";
  const client = await amqp.connect(connectionUri);
  console.log("Client connected to RabbitMQ!");

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

  const username = await clientWelcome();
  await declareAndBind(
    client,
    ExchangePerilDirect,
    `${PauseKey}.${username}`,
    PauseKey,
    "transient"
  );
  const game = new GameState(username);
  const confirmChannel = await client.createConfirmChannel();

  subscribeJSON(
    client,
    ExchangePerilDirect,
    `pause.${username}`,
    PauseKey,
    "transient",
    handlerPause(game)
  );

  subscribeJSON(
    client,
    ExchangePerilTopic,
    username,
    `${ArmyMovesPrefix}.*`,
    "transient",
    handlerMove(game)
  );

  while (true) {
    const input = await getInput();
    if (input.length === 0) continue;

    if (input[0] === "spawn") {
      commandSpawn(game, input);
    } else if (input[0] === "move") {
      try {
        const move = commandMove(game, input);

        publishJSON(
          confirmChannel,
          ExchangePerilTopic,
          `${ArmyMovesPrefix}.${username}`,
          move
        );
      } catch (err) {
        console.error(err);
        continue;
      }
    } else if (input[0] === "status") {
      await commandStatus(game);
    } else if (input[0] === "help") {
      printClientHelp();
    } else if (input[0] === "spam") {
      console.log("Spamming is not allowed yet!");
    } else if (input[0] === "quit") {
      printQuit();
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
