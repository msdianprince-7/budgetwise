"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartPalette, monthLabel } from "@/lib/categories";
import { formatMoney } from "@/lib/client";
import { useTheme } from "@/lib/theme";
import type { MonthlySummary } from "@/lib/summary";

type TooltipRow = { name: string; value: number; color: string };

function TooltipCard({ rows, label }: { rows: TooltipRow[]; label: string }) {
  return (
    <div className="card px-3 py-2 text-xs">
      <p className="mb-1.5 font-medium text-ink">{label}</p>
      {rows.map((row) => (
        <p key={row.name} className="flex items-center gap-2 text-ink-soft">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} />
          {row.name}
          <span className="tnum ml-auto pl-4 font-medium text-ink">{formatMoney(row.value)}</span>
        </p>
      ))}
    </div>
  );
}

export function CategoryChart({ summary }: { summary: MonthlySummary }) {
  const { theme } = useTheme();
  const palette = chartPalette(theme);

  const data = summary.breakdown
    .filter((entry) => entry.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  if (data.length === 0) {
    return <EmptyPlot message="No expenses logged for this month yet." />;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
        <defs>
          <linearGradient id="barFill" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={palette.bar} stopOpacity={0.55} />
            <stop offset="100%" stopColor={palette.bar} stopOpacity={1} />
          </linearGradient>
          <linearGradient id="barFillOver" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={palette.over} stopOpacity={0.55} />
            <stop offset="100%" stopColor={palette.over} stopOpacity={1} />
          </linearGradient>
        </defs>
        <CartesianGrid horizontal={false} stroke={palette.grid} />
        <XAxis
          type="number"
          stroke={palette.grid}
          tickLine={false}
          fontSize={12}
          tick={{ fill: palette.axis }}
          tickFormatter={formatMoney}
        />
        <YAxis
          type="category"
          dataKey="category"
          width={104}
          stroke={palette.grid}
          tickLine={false}
          fontSize={12}
          tick={{ fill: palette.axis }}
        />
        <Tooltip
          cursor={{ fill: palette.cursor }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const entry = payload[0].payload as (typeof data)[number];
            return (
              <TooltipCard
                label={`${entry.category} · ${entry.shareOfSpend}% of spend`}
                rows={[
                  {
                    name: entry.overLimit ? "Spent (over limit)" : "Spent",
                    value: entry.amount,
                    color: entry.overLimit ? palette.over : palette.bar,
                  },
                ]}
              />
            );
          }}
        />
        <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={20} isAnimationActive={false}>
          {data.map((entry) => (
            <Cell
              key={entry.category}
              fill={entry.overLimit ? "url(#barFillOver)" : "url(#barFill)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendChart({ summary }: { summary: MonthlySummary }) {
  const { theme } = useTheme();
  const palette = chartPalette(theme);

  const data = summary.trend.map((entry) => ({
    ...entry,
    label: `${entry.month.slice(5)}/${entry.month.slice(2, 4)}`,
  }));

  if (!data.some((entry) => entry.income > 0 || entry.expenses > 0)) {
    return <EmptyPlot message="Add a couple of months to see the trend." />;
  }

  return (
    <>
      <Legend
        items={[
          { name: "Income", color: palette.income },
          { name: "Expenses", color: palette.expenses },
        ]}
      />
      <ResponsiveContainer width="100%" height={228}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={palette.income} stopOpacity={1} />
              <stop offset="100%" stopColor={palette.income} stopOpacity={0.45} />
            </linearGradient>
            <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={palette.expenses} stopOpacity={1} />
              <stop offset="100%" stopColor={palette.expenses} stopOpacity={0.45} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={palette.grid} />
          <XAxis
            dataKey="label"
            stroke={palette.grid}
            tickLine={false}
            fontSize={12}
            tick={{ fill: palette.axis }}
          />
          <YAxis
            width={56}
            stroke={palette.grid}
            tickLine={false}
            fontSize={12}
            tick={{ fill: palette.axis }}
            tickFormatter={formatMoney}
          />
          <Tooltip
            cursor={{ fill: palette.cursor }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const entry = payload[0].payload as (typeof data)[number];
              return (
                <TooltipCard
                  label={monthLabel(entry.month)}
                  rows={[
                    { name: "Income", value: entry.income, color: palette.income },
                    { name: "Expenses", value: entry.expenses, color: palette.expenses },
                    { name: "Savings", value: entry.savings, color: palette.savings },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="income" fill="url(#incomeFill)" radius={[5, 5, 0, 0]} barSize={16} isAnimationActive={false} />
          <Bar dataKey="expenses" fill="url(#expenseFill)" radius={[5, 5, 0, 0]} barSize={16} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}

export function Legend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
      {items.map((item) => (
        <li key={item.name} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
          {item.name}
        </li>
      ))}
    </ul>
  );
}

function EmptyPlot({ message }: { message: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-ink-muted">
      {message}
    </div>
  );
}
