import { assertEquals } from "@std/assert";
import {
  apply,
  type Cell,
  cellAt,
  isPassable,
  newGame,
  type Terrain,
  terrainAt,
} from "./mod.ts";

const SEED = 121;

const NEIGHBORS: Cell[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

// Find a passable cell with no adjacent impassable cells.
function findPlayerCell(terrain: Terrain): Cell {
  for (let y = -100; y <= 100; y++) {
    for (let x = -100; x <= 100; x++) {
      if (terrainAt(SEED, x, y) !== terrain) continue;

      const clear = NEIGHBORS.every((step) =>
        isPassable(terrainAt(SEED, x + step.x, y + step.y))
      );

      if (clear) return { x, y };
    }
  }
  throw new Error(`No suitable ${terrain} cell found.`);
}

// Find a grassland cell whose eastern neighbor is trees.
function findPlayerWithTreesEast(): Cell {
  for (let y = -100; y <= 100; y++) {
    for (let x = -100; x <= 100; x++) {
      const player = { x, y };
      const trees = { x: x + 1, y };

      if (terrainAt(SEED, x, y) !== "grassland") continue;
      if (terrainAt(SEED, trees.x, trees.y) !== "trees") continue;

      const playerNeighborsClear = NEIGHBORS.every((step) =>
        isPassable(terrainAt(SEED, x + step.x, y + step.y))
      );

      const treesNeighborsClear = NEIGHBORS.every((step) =>
        isPassable(
          terrainAt(SEED, trees.x + step.x, trees.y + step.y),
        )
      );

      if (playerNeighborsClear && treesNeighborsClear) {
        return player;
      }
    }
  }

  throw new Error("No suitable grassland and trees pair found.");
}

// Find a player cell with exactly one adjacent impassable cell
function findAdjacentSource(terrain: Terrain): {
  player: Cell;
  source: Cell;
} {
  for (let y = -100; y <= 100; y++) {
    for (let x = -100; x <= 100; x++) {
      const player = { x, y };

      if (!isPassable(terrainAt(SEED, x, y))) continue;

      let source: Cell | undefined;
      let valid = true;

      for (const step of NEIGHBORS) {
        const next = { x: x + step.x, y: y + step.y };
        if (!isPassable(terrainAt(SEED, next.x, next.y))) {
          if (source !== undefined) {
            valid = false;
            break;
          }
          source = next;
        }
      }

      if (
        valid &&
        source !== undefined &&
        terrainAt(SEED, source.x, source.y) === terrain
      ) {
        return { player, source };
      }
    }
  }
  throw new Error(`No suitable adjacent ${terrain} found.`);
}

Deno.test("gathering from grassland adds feathers", () => {
  const state = newGame(SEED);
  const player = findPlayerCell("grassland");
  state.player = player;

  const events = apply(state, { type: "gather" });

  assertEquals(state.inventory, { feathers: 1 });
  assertEquals(
    state.changedCells[`${player.x},${player.y}`],
    "depleted",
  );
  assertEquals(events, [{
    type: "gathered",
    at: player,
    source: player,
    item: "feathers",
    inventory: { feathers: 1 },
  }]);
});

Deno.test("moss is only gathered after entering the lake", () => {
  const state = newGame(SEED);
  const { player, source } = findAdjacentSource("lake");
  state.player = player;

  const before = apply(state, { type: "gather" });
  assertEquals(before[0].type, "gathered");
  assertEquals(state.inventory.moss, undefined);
  assertEquals(state.changedCells[`${source.x},${source.y}`], undefined);

  state.inventory["twig bridge"] = 1;
  const direction = NEIGHBORS.find((step) =>
    player.x + step.x === source.x && player.y + step.y === source.y
  )!;
  const directions = ["north", "east", "south", "west"] as const;
  apply(state, {
    type: "move",
    direction: directions[NEIGHBORS.indexOf(direction)],
  });
  const events = apply(state, { type: "gather" });

  assertEquals(state.inventory.moss, 1);
  assertEquals(
    state.changedCells[`${source.x},${source.y}`],
    "depleted",
  );
  assertEquals(events, [{
    type: "gathered",
    at: source,
    source,
    item: "moss",
    inventory: { ...state.inventory },
  }]);
});

Deno.test("gathering beside a mountain adds stones", () => {
  const state = newGame(SEED);
  const { player, source } = findAdjacentSource("mountain");
  state.player = player;

  const events = apply(state, { type: "gather" });

  assertEquals(state.inventory, { stones: 1 });
  assertEquals(
    state.changedCells[`${source.x},${source.y}`],
    "depleted",
  );
  assertEquals(events, [{
    type: "gathered",
    at: player,
    source,
    item: "stones",
    inventory: { stones: 1 },
  }]);
});

Deno.test("a gathering event keeps its inventory while state moves on", () => {
  const state = newGame(SEED);
  const player = findPlayerWithTreesEast();
  state.player = { ...player };

  const firstEvents = apply(state, { type: "gather" });
  const firstEvent = firstEvents[0];

  apply(state, { type: "move", direction: "east" });
  apply(state, { type: "gather" });

  assertEquals(state.inventory, {
    feathers: 1,
    sticks: 1,
  });
  assertEquals(firstEvent, {
    type: "gathered",
    at: player,
    source: player,
    item: "feathers",
    inventory: { feathers: 1 },
  });
});

Deno.test("gathering the same cell twice gives nothing", () => {
  const state = newGame(SEED);
  const player = findPlayerCell("grassland");
  state.player = player;

  apply(state, { type: "gather" });
  const events = apply(state, { type: "gather" });

  assertEquals(state.inventory, { feathers: 1 });
  assertEquals(events, [{
    type: "gather-failed",
    at: player,
    reason: "no-resource",
  }]);
});

Deno.test("failed gathering changes nothing", () => {
  const state = newGame(SEED);
  const player = findPlayerCell("grassland");
  state.player = player;

  // Mark the current cell as already depleted.
  state.changedCells[`${player.x},${player.y}`] = "depleted";

  const snapshot = JSON.parse(JSON.stringify(state));

  const events = apply(state, { type: "gather" });

  assertEquals(state, snapshot);
  assertEquals(events, [{
    type: "gather-failed",
    at: player,
    reason: "no-resource",
  }]);
});

Deno.test("inventory and changed cells survive JSON", () => {
  const state = newGame(SEED);
  const player = findPlayerCell("grassland");
  state.player = player;

  apply(state, { type: "gather" });

  const restored = JSON.parse(JSON.stringify(state));

  assertEquals(restored, state);
  assertEquals(restored.inventory, { feathers: 1 });
  assertEquals(
    cellAt(restored, player),
    { terrain: "grassland", depleted: true },
  );
});
