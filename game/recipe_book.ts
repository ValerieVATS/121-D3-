import {
  type Command,
  type GameState,
  missingFor,
  RECIPES,
} from "../core/mod.ts";

// Buttons stay mounted so keyboard focus survives updates.
export class RecipeBook {
  private readonly buttons: HTMLButtonElement[] = [];

  constructor(
    list: HTMLElement,
    private readonly state: GameState,
    submit: (command: Command) => void,
  ) {
    for (const recipe of RECIPES) {
      const entry = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.addEventListener("click", (event) => {
        submit({ type: "craft", output: recipe.output });
        if (event.detail > 0) button.blur();
      });
      entry.appendChild(button);
      list.appendChild(entry);
      this.buttons.push(button);
    }
    this.update();
  }

  update() {
    RECIPES.forEach((recipe, index) => {
      this.buttons[index].disabled = this.state.ended;
      const missing = missingFor(this.state.inventory, recipe);
      const details = Object.entries(missing).map(([item, amount]) =>
        `${amount} ${amount === 1 && item === "stones" ? "stone" : item}`
      ).join(", ");
      const costs = Object.entries(recipe.inputs).map(([item, amount]) =>
        `${amount} ${amount === 1 && item === "stones" ? "stone" : item}`
      ).join(", ");
      this.buttons[index].textContent = `Craft ${recipe.output} (${costs}) — ${
        details ? `need ${details}` : "ready"
      }`;
    });
  }
}
