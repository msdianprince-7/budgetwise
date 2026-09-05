"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { chartPalette, currentMonth, monthLabel, recentMonths } from "@/lib/categories";
import { api, formatMoney } from "@/lib/client";
import { downloadCsv } from "@/lib/export";
import { ThemeToggle, useTheme } from "@/lib/theme";
import type { MonthlySummary } from "@/lib/summary";
import { CategoryChart, Legend, TrendChart } from "./charts";
import { ExpensePanel, IncomePanel, type Expense, type Income } from "./Entries";
import BudgetLimits from "./BudgetLimits";
import HealthCheckPanel from "./HealthCheck";
import { Logo } from "./Logo";

type User = { id: string; name: string; email: string };

export default function Dashboard({ user }: { user: User }) {
  const router = useRouter();
  const { theme } = useTheme();
  const palette = chartPalette(theme);

  const [month, setMonth] = useState(currentMonth());
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [summaryResponse, incomeResponse, expenseResponse] = await Promise.all([
      api<{ summary: MonthlySummary }>(`/api/summary?month=${month}`),
      api<{ incomes: Income[] }>(`/api/incomes?month=${month}`),
      api<{ expenses: Expense[] }>(`/api/expenses?month=${month}`),
    ]);
    setSummary(summaryResponse.summary);
    setIncomes(incomeResponse.incomes);
    setExpenses(expenseResponse.expenses);
  }, [month]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().then(
      () => setError(null),
      (err: unknown) => setError(err instanceof Error ? err.message : "Could not load data"),
    );
  }, [load]);

  const loading = !error && (!summary || summary.month !== month);
  const months = recentMonths(currentMonth(), 12).reverse();

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-9">
      <header className="mb-7 flex flex-wrap items-center gap-2.5">
        <div className="mr-auto">
          <Logo subtitle={`Hello, ${user.name}`} />
        </div>

        <label className="sr-only" htmlFor="month">
          Month
        </label>
        <select
          id="month"
          className="field w-auto min-w-[10.5rem]"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        >
          {months.map((value) => (
            <option key={value} value={value}>
              {monthLabel(value)}
            </option>
          ))}
        </select>

        <button
          className="btn btn-ghost"
          onClick={() => summary && downloadCsv(summary, incomes, expenses)}
          disabled={!summary}
        >
          Export
        </button>
        <ThemeToggle />
        <button className="btn btn-ghost" onClick={logout}>
          Log out
        </button>
      </header>

      {error && (
        <p role="alert" className="alert mb-5">
          {error}
        </p>
      )}

      {loading || !summary ? (
        <div className="space-y-5" aria-busy="true">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="skeleton h-[104px]" />
            ))}
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="skeleton h-[340px]" />
            <div className="skeleton h-[340px]" />
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <StatRow summary={summary} />

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="card card-interactive rise p-5">
              <h2 className="font-semibold tracking-tight">Where the money went</h2>
              <p className="mb-4 text-sm text-ink-muted">
                {monthLabel(summary.month)} · {formatMoney(summary.totalExpenses)} across{" "}
                {summary.breakdown.filter((entry) => entry.amount > 0).length} categories
              </p>
              <CategoryChart summary={summary} />
            </section>

            <section className="card card-interactive rise p-5" style={{ animationDelay: "60ms" }}>
              <h2 className="font-semibold tracking-tight">Income vs expenses</h2>
              <p className="mb-4 text-sm text-ink-muted">Last six months</p>
              <TrendChart summary={summary} />
            </section>
          </div>

          <RuleBar summary={summary} palette={palette} />

          <HealthCheckPanel month={month} />

          <div className="grid gap-5 lg:grid-cols-2">
            <IncomePanel month={month} incomes={incomes} onChange={load} />
            <ExpensePanel month={month} expenses={expenses} onChange={load} />
          </div>

          <BudgetLimits breakdown={summary.breakdown} onChange={load} />
        </div>
      )}
    </div>
  );
}

function StatRow({ summary }: { summary: MonthlySummary }) {
  const { theme } = useTheme();
  const palette = chartPalette(theme);
  const negative = summary.savings < 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label="Income" value={formatMoney(summary.totalIncome)} accent={palette.income} delay={0} />
      <Stat label="Expenses" value={formatMoney(summary.totalExpenses)} accent={palette.expenses} delay={60} />
      <Stat
        label={negative ? "Shortfall" : "Savings"}
        value={formatMoney(Math.abs(summary.savings))}
        accent={negative ? palette.over : palette.savings}
        note={negative ? "Spending more than you earn" : undefined}
        delay={120}
      />
      <Stat
        label="Savings rate"
        value={summary.savingsRate === null ? "—" : `${summary.savingsRate}%`}
        accent={negative ? palette.over : palette.savings}
        note={
          summary.savingsRate === null
            ? "Add income to calculate"
            : summary.savingsRate >= 20
              ? "At or above the 20% target"
              : "Below the 20% target"
        }
        delay={180}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  note,
  delay,
}: {
  label: string;
  value: string;
  accent: string;
  note?: string;
  delay: number;
}) {
  return (
    <div className="card card-interactive rise p-4" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: accent, boxShadow: `0 0 10px ${accent}` }}
        />
        <span className="text-sm text-ink-soft">{label}</span>
      </div>
      <p className="tnum display mt-2 text-[28px] leading-none">{value}</p>
      {note && <p className="mt-2 text-xs text-ink-muted">{note}</p>}
    </div>
  );
}

function RuleBar({
  summary,
  palette,
}: {
  summary: MonthlySummary;
  palette: ReturnType<typeof chartPalette>;
}) {
  const rule = summary.rule503020;

  return (
    <section className="card rise p-5">
      <h2 className="font-semibold tracking-tight">The 50/30/20 rule</h2>
      <p className="mb-4 text-sm text-ink-muted">
        Needs near 50% of income, wants near 30%, savings at least 20%.
      </p>

      {!rule ? (
        <p className="text-sm text-ink-muted">Add income for this month to see the split.</p>
      ) : (
        <>
          <Legend
            items={[
              { name: `Needs ${rule.needs}% of 50%`, color: palette.income },
              { name: `Wants ${rule.wants}% of 30%`, color: palette.expenses },
              { name: `Savings ${rule.savings}% of 20%`, color: palette.savings },
            ]}
          />
          <div className="flex h-5 w-full gap-[3px] overflow-hidden rounded-full bg-surface-2 p-[3px]">
            <Segment value={rule.needs} color={palette.income} />
            <Segment value={rule.wants} color={palette.expenses} />
            <Segment value={Math.max(0, rule.savings)} color={palette.savings} />
          </div>
        </>
      )}
    </section>
  );
}

function Segment({ value, color }: { value: number; color: string }) {
  if (value <= 0) return null;

  return (
    <div
      className="rounded-full transition-all duration-500"
      style={{
        width: `${Math.min(100, value)}%`,
        background: `linear-gradient(90deg, ${color}b0, ${color})`,
      }}
    />
  );
}
