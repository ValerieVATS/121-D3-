export type Recipe = {
  output: string;
  inputs: Record<string, number>;
};

// An ordinary new row needs no new crafting rule.
export const RECIPES: Recipe[] = [
  { output: "ladder", inputs: { sticks: 4 } },
  { output: "twig bridge", inputs: { sticks: 2 } },
  { output: "beacon", inputs: { stones: 20, iron: 20, water: 10 } },
];
