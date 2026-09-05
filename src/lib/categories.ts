import type { Theme } from "./theme";

export const CATEGORIES = [
  "Housing",
  "Food",
  "Transport",
  "Entertainment",
  "Health",
  "Subscriptions",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const NEEDS: Category[] = ["Housing", "Food", "Transport", "Health"];
export const WANTS: Category[] = ["Entertainment", "Subscriptions", "Other"];

export type ChartPalette = {
  income: string;
  expenses: string;
  savings: string;
  over: string;
  bar: string;
  grid: string;
  axis: string;
  cursor: string;
};

const PALETTES: Record<Theme, ChartPalette> = {
  dark: {
    income: "#5c7fee",
    expenses: "#c47c33",
    savings: "#12a672",
    over: "#e5566d",
    bar: "#5c7fee",
    grid: "rgba(255,255,255,0.07)",
    axis: "#6f7787",
    cursor: "rgba(255,255,255,0.05)",
  },
  light: {
    income: "#4f7cff",
    expenses: "#b45309",
    savings: "#0f9d63",
    over: "#d1495b",
    bar: "#4f7cff",
    grid: "rgba(0,0,0,0.07)",
    axis: "#858a96",
    cursor: "rgba(0,0,0,0.04)",
  },
};

export function chartPalette(theme: Theme): ChartPalette {
  return PALETTES[theme];
}

export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(month: string): string {
  const [year, index] = month.split("-").map(Number);
  return new Date(year, index - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function recentMonths(month: string, count: number): string[] {
  const [year, index] = month.split("-").map(Number);
  const months: string[] = [];

  for (let offset = count - 1; offset >= 0; offset--) {
    const date = new Date(year, index - 1 - offset, 1);
    months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  }

  return months;
}
