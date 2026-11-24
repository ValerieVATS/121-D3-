import { assertEquals } from "@std/assert";
import {
  apply,
  missingFor,
  newGame,
  RECIPES,
  TERRAIN_YIELDS,
  unreachableRecipes,
} from "./mod.ts";

const bridge = RECIPES.find((r) => r.output === "twig bridge")!;

Deno.test("crafting without materials changes nothing and reports what is missing", () => {
  const state = newGame(121);
  const before = JSON.parse(JSON.stringify(state));
  const events = apply(state, { type: "craft", output: bridge.output });
  assertEquals(state, before);
  assertEquals(events, [{
    type: "craft-failed",
    output: bridge.output,
    reason: "missing-materials",
    missing: missingFor(state.inventory, bridge),
  }]);
  assertEquals(
    apply(state, { type: "craft", output: "unknown" })[0].type,
    "craft-failed",
  );
  assertEquals(state, before);
});

Deno.test("craft spends ingredients and a retained event keeps its inventory", () => {
  const state = newGame(121);
  state.inventory = { ...bridge.inputs };
  const event = apply(state, { type: "craft", output: bridge.output })[0];
  const copied = JSON.parse(JSON.stringify(event));
  assertEquals(state.inventory, { [bridge.output]: 1 });
  state.inventory.sticks = 3;
  assertEquals(event, copied);
});

Deno.test("every recipe ingredient has a gatherable or crafted source", () => {
  const sources = new Set([
    "iron",
    ...Object.values(TERRAIN_YIELDS),
    ...RECIPES.map((r) => r.output),
  ]);
  for (const recipe of RECIPES) {
    for (const item of Object.keys(recipe.inputs)) {
      assertEquals(sources.has(item), true, `${item} has no source`);
    }
  }
});

Deno.test("fixpoint reaches the escape recipe but catches self-dependency", () => {
  assertEquals(unreachableRecipes(RECIPES), []);
  assertEquals(
    unreachableRecipes([
      ...RECIPES,
      { output: "water flask", inputs: { water: 1 } },
    ]),
    [],
  );
  assertEquals(
    unreachableRecipes([
      ...RECIPES,
      { output: "impossible", inputs: { impossible: 1, water: 1 } },
    ]),
    ["impossible"],
  );
  assertEquals(
    unreachableRecipes([
      { output: "twig bridge", inputs: { water: 1 } },
    ]),
    ["twig bridge"],
  );
});

Deno.test("beacon spends exact ingredients, summons escape, and ends all commands", () => {
  const state = newGame(121);
  const beacon = RECIPES.find((r) => r.output === "beacon")!;
  assertEquals(beacon.inputs, { stones: 20, iron: 20, water: 10 });
  assertEquals(
    apply(state, { type: "craft", output: "beacon" })[0].type,
    "craft-failed",
  );
  state.inventory = { stones: 21, iron: 20, water: 10, ladder: 1 };
  const events = apply(state, { type: "craft", output: "beacon" });
  assertEquals(events, [{
    type: "escaped",
    inventory: { stones: 1, ladder: 1, beacon: 1 },
  }]);
  assertEquals(state.ended, true);
  const snapshot = JSON.parse(JSON.stringify(state));
  for (
    const command of [
      { type: "gather" } as const,
      { type: "move", direction: "north" } as const,
      { type: "craft", output: "ladder" } as const,
    ]
  ) {
    assertEquals(apply(state, command), []);
    assertEquals(state, snapshot);
  }
});
