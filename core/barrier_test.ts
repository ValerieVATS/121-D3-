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

Deno.test("lake blocks movement until bridge is crafted, then yields water", () => {
  const state = newGame(seed);
  const { player, lake } = shore();
  state.player = player;
  const blocked = apply(state, { type: "move", direction: lake.direction });
  assertEquals(blocked[0].type, "blocked");
  assertEquals(state.player, player);

  const recipe = RECIPES.find((r) => r.output === "twig bridge")!;
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
  assertEquals(state.inventory.water, 1);
  assertEquals(state.changedCells[`${lake.x},${lake.y}`], "depleted");

  const snapshot = JSON.parse(JSON.stringify(state));
  assertEquals(snapshot, state);
});

Deno.test("mountain blocks mining until ladder permits entering it", () => {
  const state = newGame(seed);
  for (let y = -60; y <= 60; y++) {
    for (let x = -60; x <= 60; x++) {
      if (!isPassable(terrainAt(seed, x, y))) continue;
      if (terrainAt(seed, x + 1, y) !== "mountain") continue;
      state.player = { x, y };
      assertEquals(
        apply(state, { type: "move", direction: "east" })[0].type,
        "blocked",
      );
      apply(state, { type: "gather" });
      assertEquals(state.inventory.stones, undefined);
      assertEquals(state.inventory.iron, undefined);
      assertEquals(state.changedCells[`${x + 1},${y}`], undefined);
      state.inventory = { sticks: 4 };
      assertEquals(
        apply(state, { type: "craft", output: "ladder" })[0].type,
        "crafted",
      );
      assertEquals(
        apply(state, { type: "move", direction: "east" })[0].type,
        "moved",
      );
      assertEquals(apply(state, { type: "gather" })[0].type, "gathered");
      assertEquals(
        (state.inventory.stones ?? 0) + (state.inventory.iron ?? 0),
        1,
      );
      return;
    }
  }
  throw new Error("No mountain shore found");
});
