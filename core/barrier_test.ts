import { assertEquals } from "@std/assert";
import { apply, isPassable, newGame, RECIPES, terrainAt } from "./mod.ts";

const seed = 121;

function shore() {
  for (let y = -100; y <= 100; y++) {
    for (let x = -100; x <= 100; x++) {
      if (!isPassable(terrainAt(seed, x, y))) continue;
      const neighbors = [
        { x, y: y - 1, direction: "north" as const },
        { x: x + 1, y, direction: "east" as const },
        { x, y: y + 1, direction: "south" as const },
        { x: x - 1, y, direction: "west" as const },
      ];
      const lake = neighbors.find((cell) =>
        terrainAt(seed, cell.x, cell.y) === "lake"
      );
      if (lake) return { player: { x, y }, lake };
    }
  }
  throw new Error("No lake shore found");
}

Deno.test("lake blocks movement until bridge is crafted, then yields moss", () => {
  const state = newGame(seed);
  const { player, lake } = shore();
  state.player = player;
  const blocked = apply(state, { type: "move", direction: lake.direction });
  assertEquals(blocked[0].type, "blocked");
  assertEquals(state.player, player);

  const recipe = RECIPES[0];
  state.inventory = { ...recipe.inputs };
  const crafted = apply(state, { type: "craft", output: recipe.output });
  assertEquals(crafted[0].type, "crafted");
  assertEquals(state.inventory[recipe.output], 1);
  assertEquals(isPassable("lake", state.inventory), true);

  const moved = apply(state, { type: "move", direction: lake.direction });
  assertEquals(moved[0].type, "moved");
  assertEquals(state.player, { x: lake.x, y: lake.y });
  const gathered = apply(state, { type: "gather" });
  assertEquals(gathered[0].type, "gathered");
  assertEquals(state.inventory.moss, 1);
  assertEquals(state.changedCells[`${lake.x},${lake.y}`], "depleted");

  const snapshot = JSON.parse(JSON.stringify(state));
  assertEquals(snapshot, state);
});
