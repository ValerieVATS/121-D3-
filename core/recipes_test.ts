import { assertEquals } from "@std/assert";
import {
  apply,
  missingFor,
  newGame,
  RECIPES,
  TERRAIN_YIELDS,
  unreachableRecipes,
} from "./mod.ts";

const bridge = RECIPES[0];

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
    ...Object.values(TERRAIN_YIELDS),
    ...RECIPES.map((r) => r.output),
  ]);
  for (const recipe of RECIPES) {
    for (const item of Object.keys(recipe.inputs)) {
      assertEquals(sources.has(item), true, `${item} has no source`);
    }
  }
});

Deno.test("fixpoint reaches the bridge and lake moss but catches self-dependency", () => {
  assertEquals(unreachableRecipes(RECIPES), []);
  assertEquals(
    unreachableRecipes([
      ...RECIPES,
      { output: "mossy nest", inputs: { moss: 1 } },
    ]),
    [],
  );
  assertEquals(
    unreachableRecipes([
      ...RECIPES,
      { output: "impossible", inputs: { impossible: 1, moss: 1 } },
    ]),
    ["impossible"],
  );
  assertEquals(
    unreachableRecipes([
      { output: "twig bridge", inputs: { moss: 1 } },
    ]),
    ["twig bridge"],
  );
});
