"use client";

import { useState } from "react";
import { CATEGORIES, type Category } from "@/lib/categories";
import { api, formatMoney } from "@/lib/client";

export type Income = { id: string; source: string; amount: number; month: string };
export type Expense = { id: string; category: string; note: string; amount: number; month: string };

function Row({
  title,
  subtitle,
  amount,
  tone,
  onEdit,
  onDelete,
}: {
  title: string;
  subtitle: string;
  amount: number;
  tone: "income" | "expense";
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="group flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-ink-muted">{subtitle}</p>
      </div>

      <span
        className={`tnum text-sm font-medium ${tone === "income" ? "text-savings" : "text-ink"}`}
      >
        {tone === "income" ? "+" : "−"}
        {formatMoney(amount)}
      </span>

      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <button
          onClick={onEdit}
          className="rounded-md px-2 py-1 text-xs text-ink-muted hover:bg-accent-soft hover:text-accent"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="rounded-md px-2 py-1 text-xs text-ink-muted hover:bg-danger-soft hover:text-danger"
        >
          Delete
        </button>
      </div>
    </li>
  );
}

export function IncomePanel({
  month,
  incomes,
  onChange,
}: {
  month: string;
  incomes: Income[];
  onChange: () => void;
}) {
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const total = incomes.reduce((sum, entry) => sum + entry.amount, 0);

  function reset() {
    setEditing(null);
    setSource("");
    setAmount("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    try {
      if (editing) {
        await api(`/api/incomes/${editing}`, {
          method: "PATCH",
          body: { source, amount: Number(amount) },
        });
      } else {
        await api("/api/incomes", {
          method: "POST",
          body: { source, amount: Number(amount), month },
        });
      }
      reset();
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    }
  }

  async function remove(id: string) {
    await api(`/api/incomes/${id}`, { method: "DELETE" });
    if (editing === id) reset();
    onChange();
  }

  return (
    <section className="card rise p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold tracking-tight">Income</h2>
        <span className="tnum text-sm text-ink-muted">{formatMoney(total)}</span>
      </div>

      <form onSubmit={submit} className="mt-4 flex flex-wrap gap-2">
        <input
          className="field min-w-[9rem] flex-1"
          placeholder="Source (e.g. Salary)"
          value={source}
          onChange={(event) => setSource(event.target.value)}
          required
        />
        <input
          className="field tnum w-28"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="Amount"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />
        <button type="submit" className="btn btn-primary">
          {editing ? "Save" : "Add"}
        </button>
        {editing && (
          <button type="button" className="btn btn-ghost" onClick={reset}>
            Cancel
          </button>
        )}
      </form>

      {error && (
        <p role="alert" className="alert mt-3">
          {error}
        </p>
      )}

      {incomes.length === 0 ? (
        <p className="mt-5 text-sm text-ink-muted">No income recorded for this month.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {incomes.map((entry) => (
            <Row
              key={entry.id}
              title={entry.source}
              subtitle="Monthly income"
              amount={entry.amount}
              tone="income"
              onEdit={() => {
                setEditing(entry.id);
                setSource(entry.source);
                setAmount(String(entry.amount));
              }}
              onDelete={() => remove(entry.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export function ExpensePanel({
  month,
  expenses,
  onChange,
}: {
  month: string;
  expenses: Expense[];
  onChange: () => void;
}) {
  const [category, setCategory] = useState<Category>("Housing");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const total = expenses.reduce((sum, entry) => sum + entry.amount, 0);

  function reset() {
    setEditing(null);
    setNote("");
    setAmount("");
    setCategory("Housing");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    try {
      if (editing) {
        await api(`/api/expenses/${editing}`, {
          method: "PATCH",
          body: { category, note, amount: Number(amount) },
        });
      } else {
        await api("/api/expenses", {
          method: "POST",
          body: { category, note, amount: Number(amount), month },
        });
      }
      reset();
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    }
  }

  async function remove(id: string) {
    await api(`/api/expenses/${id}`, { method: "DELETE" });
    if (editing === id) reset();
    onChange();
  }

  return (
    <section className="card rise p-5" style={{ animationDelay: "60ms" }}>
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold tracking-tight">Expenses</h2>
        <span className="tnum text-sm text-ink-muted">{formatMoney(total)}</span>
      </div>

      <form onSubmit={submit} className="mt-4 flex flex-wrap gap-2">
        <select
          className="field w-36"
          value={category}
          onChange={(event) => setCategory(event.target.value as Category)}
          aria-label="Category"
        >
          {CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <input
          className="field min-w-[9rem] flex-1"
          placeholder="What was it for?"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          required
        />
        <input
          className="field tnum w-28"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="Amount"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />
        <button type="submit" className="btn btn-primary">
          {editing ? "Save" : "Add"}
        </button>
        {editing && (
          <button type="button" className="btn btn-ghost" onClick={reset}>
            Cancel
          </button>
        )}
      </form>

      {error && (
        <p role="alert" className="alert mt-3">
          {error}
        </p>
      )}

      {expenses.length === 0 ? (
        <p className="mt-5 text-sm text-ink-muted">Nothing logged for this month yet.</p>
      ) : (
        <ul className="mt-3 max-h-96 divide-y divide-border overflow-y-auto">
          {expenses.map((entry) => (
            <Row
              key={entry.id}
              title={entry.note}
              subtitle={entry.category}
              amount={entry.amount}
              tone="expense"
              onEdit={() => {
                setEditing(entry.id);
                setCategory(entry.category as Category);
                setNote(entry.note);
                setAmount(String(entry.amount));
              }}
              onDelete={() => remove(entry.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
