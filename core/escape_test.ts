import { assert, assertEquals } from "@std/assert";
import {
  apply,
  type Command,
  type Direction,
  isPassable,
  mountainYield,
  newGame,
  type Terrain,
  terrainAt,
} from "./mod.ts";

const DIRECTIONS: [Direction, number, number][] = [
  ["north", 0, -1],
  ["east", 1, 0],
  ["south", 0, 1],
  ["west", -1, 0],
];

// Search actual walkable cells from the current position; no teleporting or
// granting inventory. The resulting commands are played through apply().
function route(
  state: ReturnType<typeof newGame>,
  terrain: Terrain,
): Direction[] {
  const start = state.player;
  const visited = new Set([`${start.x},${start.y}`]);
  const queue: { x: number; y: number; path: Direction[] }[] = [
    { ...start, path: [] },
  ];
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i];
    if (
      terrainAt(state.seed, cell.x, cell.y) === terrain &&
      state.changedCells[`${cell.x},${cell.y}`] !== "depleted"
    ) {
      return cell.path;
    }
    for (const [direction, dx, dy] of DIRECTIONS) {
      const x = cell.x + dx;
      const y = cell.y + dy;
      const key = `${x},${y}`;
      if (
        Math.abs(x) > 80 || Math.abs(y) > 80 || visited.has(key) ||
        !isPassable(terrainAt(state.seed, x, y), state.inventory)
      ) continue;
      visited.add(key);
      queue.push({ x, y, path: [...cell.path, direction] });
    }
  }
  throw new Error(`Cannot reach another ${terrain} cell`);
}

function replay() {
  const state = newGame(121);
  const commands: Command[] = [];
  const events: ReturnType<typeof apply>[] = [];
  const issue = (command: Command) => {
    commands.push(command);
    events.push(apply(state, command));
  };
  const gather = (terrain: Terrain) => {
    for (const direction of route(state, terrain)) {
      issue({ type: "move", direction });
    }
    issue({ type: "gather" });
  };
  for (let i = 0; i < 6; i++) gather("trees");
  issue({ type: "craft", output: "ladder" });
  issue({ type: "craft", output: "twig bridge" });
  while (
    (state.inventory.stones ?? 0) < 20 || (state.inventory.iron ?? 0) < 20
  ) {
    gather("mountain");
  }
  for (let i = 0; i < 10; i++) gather("lake");
  issue({ type: "craft", output: "beacon" });
  return { state, commands, events };
}

Deno.test("iron drops at approximately 30% and each cell's roll is repeatable", () => {
  let iron = 0;
  let total = 0;
  for (let y = -110; y <= 110; y++) {
    for (let x = -110; x <= 110; x++) {
      if (terrainAt(121, x, y) !== "mountain") continue;
      const item = mountainYield(121, x, y);
      assertEquals(item, mountainYield(121, x, y));
      if (item === "iron") iron++;
      total++;
    }
  }
  assert(total > 1000);
  assert(iron / total > 0.28 && iron / total < 0.32);
});

Deno.test("seed 121 can gather, craft, summon a spaceship and escape twice identically", () => {
  const first = replay();
  assertEquals(first.state.ended, true);
  assertEquals(first.events.at(-1)?.[0].type, "escaped");
  assertEquals(first.state.inventory.beacon, 1);
  assertEquals(first.state.inventory.iron, undefined);
  assertEquals(first.state.inventory.water, undefined);
  assertEquals(replay(), first);
  const restored = JSON.parse(JSON.stringify(first.state));
  assertEquals(restored, first.state);
  assertEquals(apply(restored, { type: "gather" }), []);
});
