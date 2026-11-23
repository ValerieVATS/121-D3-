import {
  type GameEvent,
  type GameState,
  TERRAIN_ACCESS,
  terrainAt,
} from "../core/mod.ts";

function element(id: string): HTMLElement {
  return document.getElementById(id)!;
}

function describe(event: GameEvent): string {
  switch (event.type) {
    case "moved":
      return `moved to ${event.to.x}, ${event.to.y}`;
    case "blocked":
      return `blocked by ${event.terrain} at ${event.toward.x}, ${event.toward.y}${
        typeof TERRAIN_ACCESS[event.terrain] === "string"
          ? ` (requires ${TERRAIN_ACCESS[event.terrain]})`
          : ""
      }`;
    case "gathered":
      return `gathered ${event.item}`;
    case "gather-failed":
      return "nothing available to gather";
    case "crafted":
      return `crafted ${event.output}; the lake is now passable`;
    case "craft-failed":
      return event.reason === "unknown-recipe"
        ? `unknown recipe: ${event.output}`
        : `need ${
          Object.entries(event.missing).map(([item, count]) =>
            `${count} ${count === 1 && item === "stones" ? "stone" : item}`
          ).join(", ")
        } to craft ${event.output}`;
  }
}

// The readout, as ordinary page elements that CSS can style and that assistive
// tools can read. It changes only as events play.

export class Hud {
  private readonly seed: number;

  constructor(state: GameState) {
    this.seed = state.seed;
    this.showPosition(state.player.x, state.player.y);
  }

  show(event: GameEvent) {
    element("live").textContent = describe(event);

    if (event.type === "moved") {
      this.showPosition(event.to.x, event.to.y);
    }

    if (event.type === "gathered" || event.type === "crafted") {
      this.showInventory(event.inventory);
    }
  }

  private showPosition(x: number, y: number) {
    element("position").textContent = `${x}, ${y}`;
    element("terrain").textContent = terrainAt(this.seed, x, y);
  }

  private showInventory(inventory: Record<string, number>) {
    const list = element("inventory");
    list.replaceChildren();

    for (const [item, count] of Object.entries(inventory)) {
      const entry = document.createElement("li");
      entry.textContent = `${item}: ${count}`;
      list.appendChild(entry);
    }
  }
}
