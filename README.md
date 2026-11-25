# Escape the Planet

Craft a beacon, summon a spaceship, and escape the planet. Play at https://valerievats.github.io/121-D3-/

## How to play

- Use the arrow keys to move one cell at a time. Press G to gather from the cell you are standing on. A cell can be gathered from only once; gathered cells turn darker.
- Gather 4 sticks from trees and craft a ladder to enter the grey mountains. Gather there for stone or iron. Each mountain cell gives iron with a seeded 30% chance, otherwise stone. You cannot mine a mountain from beside it.
- Gather 2 more sticks and craft a twig bridge to enter blue lakes. Gather water while standing in a lake cell.
- Craft a beacon from 20 stones, 20 iron, and 10 water. It calls a spaceship and ends the game; no more commands can change the finished world.
- Press Tab to reach a crafting button, then Enter or Space to craft. The buttons show their costs and any missing materials. The sound toggle is keyboard accessible too. Refresh the page to start over; add `?seed=7` to the URL for another world.

## Run locally

Install [Deno](https://docs.deno.com/runtime/getting_started/installation/) and [Git](https://git-scm.com/downloads/), then from this repository's root run:

```sh
deno task setup
deno task dev
```

Open the local URL printed by Vite (normally `http://localhost:3000/`). `setup` installs dependencies and the commit hook; run it once per clone. `deno task dev` also installs dependencies if needed. To check the code, run `deno task ci` (format, lint, type checking, core tests, import boundaries, and production build). `deno task test` runs the core tests alone. See [TESTING.md](TESTING.md) for the manual playtest, including the escape ending.

## Add a recipe

Add an ordinary row to the `RECIPES` array in [`core/recipes.ts`](core/recipes.ts):

```ts
{ output: "signal flare", inputs: { sticks: 3, iron: 1 } },
```

The core's crafting rule in [`core/rules.ts`](core/rules.ts) and the buttons in [`game/recipe_book.ts`](game/recipe_book.ts) use that data automatically. Use input names that actually have a source; the tests in [`core/recipes_test.ts`](core/recipes_test.ts) check this, and [`core/can_reach.ts`](core/can_reach.ts) checks whether ingredient dependencies are reachable. If you add a new resource or terrain requirement, update [`core/terrain.ts`](core/terrain.ts) and its tests too. The beacon is a special capstone in `core/rules.ts`: crafting it ends the game, so a new ending requires more than an ordinary recipe row.

## How it works

[`core/`](core/) owns the seeded terrain, access rules, inventory, crafting, and `apply(state, command)`. State saves the seed and only cells that have changed, not the whole world. Mountain drops are determined by seed and coordinates, so a replay gives the same results. The core returns copied events for the client to present; it does not import the browser or Phaser.

[`game/controller.ts`](game/controller.ts) turns keys and crafting clicks into commands and waits for playback before submitting the next one. [`game/presenter.ts`](game/presenter.ts) delivers each event to the Phaser grid in [`game/grid/`](game/grid/), the HTML HUD in [`game/hud.ts`](game/hud.ts), and synthesized audio in [`game/sounds.ts`](game/sounds.ts). The client displays the core's outcomes rather than deciding whether a move, gather, or craft is legal. `deno task boundary` checks the import boundaries.

The deterministic finishing test in [`core/escape_test.ts`](core/escape_test.ts) walks, gathers, crafts the ladder and bridge, and escapes through `apply`, then repeats the run to compare states and events. For manual debugging, `game.state` in the browser console shows the current logical state and `#live` shows the most recently presented event.

## Credits

Tooling adapted from the [CMPM 121 Fall 2026 D2 starter](https://github.com/ucsc-cmpm-121-f26/d2-starter), with the Phaser setup following the instructor's E4 starter. Those repositories have no explicit repository license; no new license is assigned to that material. The D3 scaffold was instructor-directed and authored with Anthropic Claude agent assistance. Dependencies retain their respective licenses.
