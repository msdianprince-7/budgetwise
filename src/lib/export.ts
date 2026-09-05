"use client";

import type { MonthlySummary } from "./summary";
import type { Expense, Income } from "@/components/Entries";

function escape(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(escape).join(",")).join("\n");
}

export function downloadCsv(summary: MonthlySummary, incomes: Income[], expenses: Expense[]) {
  const rows: (string | number)[][] = [
    ["BudgetWise summary", summary.month],
    [],
    ["Total income", summary.totalIncome],
    ["Total expenses", summary.totalExpenses],
    ["Savings", summary.savings],
    ["Savings rate (%)", summary.savingsRate ?? ""],
    [],
    ["Category", "Amount", "% of spend", "% of income", "Budget limit", "Over limit"],
    ...summary.breakdown.map((b) => [
      b.category,
      b.amount,
      b.shareOfSpend,
      b.shareOfIncome ?? "",
      b.limit ?? "",
      b.overLimit ? "yes" : "no",
    ]),
    [],
    ["Income entries"],
    ["Source", "Amount"],
    ...incomes.map((i) => [i.source, i.amount]),
    [],
    ["Expense entries"],
    ["Category", "Description", "Amount"],
    ...expenses.map((e) => [e.category, e.note, e.amount]),
  ];

  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `budgetwise-${summary.month}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
