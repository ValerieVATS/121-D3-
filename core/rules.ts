// The rules of the game. There is no clock here: a command updates the state at
// once, and the events it returns are a record of what happened. Whoever called
// apply() decides how, or whether, to show them over time.

import {
  isPassable,
  mountainYield,
  type Terrain,
  TERRAIN_YIELDS,
  terrainAt,
} from "./terrain.ts";
import { type Recipe, RECIPES } from "./recipes.ts";

export type Cell = { x: number; y: number };

export type Direction = "north" | "south" | "east" | "west";

// Plain data that survives JSON. Terrain is absent because the seed can recompute
// it: besides the seed, only what the player has caused belongs here.
export type GameState = {
  seed: number;
  player: Cell;
  inventory: Record<string, number>;
  changedCells: Record<string, string>;
  ended: boolean;
};

// Command: https://gameprogrammingpatterns.com/command.html
export type Command =
  | { type: "move"; direction: Direction }
  | { type: "gather" }
  | { type: "craft"; output: string };

// Domain Event: https://martinfowler.com/eaaDev/DomainEvent.html
export type GameEvent =
  | { type: "moved"; from: Cell; to: Cell }
  | { type: "blocked"; at: Cell; toward: Cell; terrain: Terrain }
  | {
    type: "gathered";
    at: Cell;
    source: Cell;
    item: string;
    inventory: Record<string, number>;
  }
  | { type: "gather-failed"; at: Cell; reason: "no-resource" }
  | { type: "crafted"; output: string; inventory: Record<string, number> }
  | { type: "escaped"; inventory: Record<string, number> }
  | {
    type: "craft-failed";
    output: string;
    missing: Record<string, number>;
    reason: "unknown-recipe" | "missing-materials";
  };

const STEPS: Record<Direction, Cell> = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  east: { x: 1, y: 0 },
  west: { x: -1, y: 0 },
};

// Singleton, avoided on purpose: tests make as many games as they need. https://gameprogrammingpatterns.com/singleton.html
export function newGame(seed: number): GameState {
  return {
    seed,
    player: { x: 0, y: 0 },
    inventory: {},
    changedCells: {},
    ended: false,
  };
}

export function cellAt(
  state: GameState,
  cell: Cell,
): { terrain: Terrain; depleted: boolean } {
  const key = `${cell.x},${cell.y}`;

  return {
    terrain: terrainAt(state.seed, cell.x, cell.y),
    depleted: state.changedCells[key] === "depleted",
  };
}

// The single way in. It updates the state it is given and returns the events.
export function apply(state: GameState, command: Command): GameEvent[] {
  if (state.ended) return [];
  switch (command.type) {
    case "move":
      return move(state, command.direction);
    case "gather":
      return gather(state);
    case "craft":
      return craft(state, command.output);
  }
}

export function missingFor(
  inventory: Record<string, number>,
  recipe: Recipe,
): Record<string, number> {
  const missing: Record<string, number> = {};
  for (const [item, needed] of Object.entries(recipe.inputs)) {
    const deficit = needed - (inventory[item] ?? 0);
    if (deficit > 0) missing[item] = deficit;
  }
  return missing;
}

function craft(state: GameState, output: string): GameEvent[] {
  const recipe = RECIPES.find((entry) => entry.output === output);
  if (!recipe) {
    return [{
      type: "craft-failed",
      output,
      missing: {},
      reason: "unknown-recipe",
    }];
  }
  const missing = missingFor(state.inventory, recipe);
  if (Object.keys(missing).length > 0) {
    return [{
      type: "craft-failed",
      output,
      missing,
      reason: "missing-materials",
    }];
  }
  for (const [item, amount] of Object.entries(recipe.inputs)) {
    state.inventory[item] -= amount;
    if (state.inventory[item] === 0) delete state.inventory[item];
  }
  state.inventory[output] = (state.inventory[output] ?? 0) + 1;
  if (output === "beacon") {
    state.ended = true;
    return [{ type: "escaped", inventory: { ...state.inventory } }];
  }
  return [{ type: "crafted", output, inventory: { ...state.inventory } }];
}

function move(state: GameState, direction: Direction): GameEvent[] {
  const step = STEPS[direction];
  // Events are retained and played back later, while state keeps changing. So an
  // event gets cells of its own, never an object that state still holds.
  // Aliasing Bug: https://martinfowler.com/bliki/AliasingBug.html
  // Cells in events act as a Value Object: https://martinfowler.com/bliki/ValueObject.html
  const from = { ...state.player };
  const to = { x: from.x + step.x, y: from.y + step.y };
  const terrain = terrainAt(state.seed, to.x, to.y);
  if (!isPassable(terrain, state.inventory)) {
    return [{ type: "blocked", at: from, toward: to, terrain }];
  }
  state.player.x = to.x;
  state.player.y = to.y;
  return [{ type: "moved", from, to }];
}

function gather(state: GameState): GameEvent[] {
  const at = { ...state.player };
  const source = !cellAt(state, at).depleted ? at : undefined;

  // Nothing available to gather.
  if (!source) {
    return [{ type: "gather-failed", at, reason: "no-resource" }];
  }

  const terrain = terrainAt(state.seed, source.x, source.y);
  const item = terrain === "mountain"
    ? mountainYield(state.seed, source.x, source.y)
    : TERRAIN_YIELDS[terrain];
  const key = `${source.x},${source.y}`;

  state.changedCells[key] = "depleted";
  state.inventory[item] = (state.inventory[item] ?? 0) + 1;

  return [{
    type: "gathered",
    at,
    source: { ...source },
    item,
    inventory: { ...state.inventory },
  }];
}
