import { prisma } from "./db";
import { CATEGORIES, NEEDS, WANTS, recentMonths, type Category } from "./categories";

export type CategoryBreakdown = {
  category: Category;
  amount: number;
  shareOfSpend: number;
  shareOfIncome: number | null;
  limit: number | null;
  overLimit: boolean;
};

export type MonthlySummary = {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  savings: number;
  savingsRate: number | null;
  breakdown: CategoryBreakdown[];
  rule503020: { needs: number; wants: number; savings: number } | null;
  trend: { month: string; income: number; expenses: number; savings: number }[];
};

const round = (n: number) => Math.round(n * 100) / 100;
const pct = (part: number, whole: number) => (whole > 0 ? round((part / whole) * 100) : 0);

export async function buildSummary(userId: string, month: string): Promise<MonthlySummary> {
  const months = recentMonths(month, 6);

  const [incomes, expenses, limits] = await Promise.all([
    prisma.income.findMany({ where: { userId, month: { in: months } } }),
    prisma.expense.findMany({ where: { userId, month: { in: months } } }),
    prisma.budgetLimit.findMany({ where: { userId } }),
  ]);

  const thisMonthIncome = incomes.filter((i) => i.month === month);
  const thisMonthExpenses = expenses.filter((e) => e.month === month);

  const totalIncome = round(thisMonthIncome.reduce((s, i) => s + i.amount, 0));
  const totalExpenses = round(thisMonthExpenses.reduce((s, e) => s + e.amount, 0));
  const savings = round(totalIncome - totalExpenses);

  const limitByCategory = new Map(limits.map((l) => [l.category, l.amount]));

  const breakdown: CategoryBreakdown[] = CATEGORIES.map((category) => {
    const amount = round(
      thisMonthExpenses.filter((e) => e.category === category).reduce((s, e) => s + e.amount, 0),
    );
    const limit = limitByCategory.get(category) ?? null;
    return {
      category,
      amount,
      shareOfSpend: pct(amount, totalExpenses),
      shareOfIncome: totalIncome > 0 ? pct(amount, totalIncome) : null,
      limit,
      overLimit: limit !== null && amount > limit,
    };
  });

  const sumOf = (cats: Category[]) =>
    breakdown.filter((b) => cats.includes(b.category)).reduce((s, b) => s + b.amount, 0);

  const trend = months.map((m) => {
    const income = round(incomes.filter((i) => i.month === m).reduce((s, i) => s + i.amount, 0));
    const spend = round(expenses.filter((e) => e.month === m).reduce((s, e) => s + e.amount, 0));
    return { month: m, income, expenses: spend, savings: round(income - spend) };
  });

  return {
    month,
    totalIncome,
    totalExpenses,
    savings,
    savingsRate: totalIncome > 0 ? pct(savings, totalIncome) : null,
    breakdown,
    rule503020:
      totalIncome > 0
        ? {
            needs: pct(sumOf(NEEDS), totalIncome),
            wants: pct(sumOf(WANTS), totalIncome),
            savings: pct(savings, totalIncome),
          }
        : null,
    trend,
  };
}
