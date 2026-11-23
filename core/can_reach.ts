import { type Recipe } from "./recipes.ts";
import { TERRAIN_ACCESS, TERRAIN_YIELDS } from "./terrain.ts";

// Ignore quantities here: this checks dependencies, not a particular seed's map.
export function unreachableRecipes(recipes: Recipe[]): string[] {
  const reached = new Set<string>();
  const made = new Set<string>();
  for (
    const terrain of Object.keys(
      TERRAIN_ACCESS,
    ) as (keyof typeof TERRAIN_ACCESS)[]
  ) {
    // Permanently blocked terrain is gatherable from an adjacent cell.
    if (TERRAIN_ACCESS[terrain] === null || TERRAIN_ACCESS[terrain] === false) {
      reached.add(TERRAIN_YIELDS[terrain]);
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const recipe of recipes) {
      if (made.has(recipe.output)) continue;
      if (Object.keys(recipe.inputs).some((item) => !reached.has(item))) {
        continue;
      }
      made.add(recipe.output);
      reached.add(recipe.output);
      for (
        const terrain of Object.keys(
          TERRAIN_ACCESS,
        ) as (keyof typeof TERRAIN_ACCESS)[]
      ) {
        if (TERRAIN_ACCESS[terrain] === recipe.output) {
          reached.add(TERRAIN_YIELDS[terrain]);
        }
      }
      changed = true;
    }
  }
  return recipes.filter((recipe) => !made.has(recipe.output)).map((recipe) =>
    recipe.output
  );
}
