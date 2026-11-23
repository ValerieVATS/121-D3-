export type Recipe = {
  output: string;
  inputs: Record<string, number>;
};

// An ordinary new row needs no new crafting rule.
export const RECIPES: Recipe[] = [
  { output: "twig bridge", inputs: { sticks: 2, stones: 1 } },
];
