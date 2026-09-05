"use client";

import { useState } from "react";
import { chartPalette } from "@/lib/categories";
import { api, formatMoney } from "@/lib/client";
import { useTheme } from "@/lib/theme";
import type { CategoryBreakdown } from "@/lib/summary";

export default function BudgetLimits({
  breakdown,
  onChange,
}: {
  breakdown: CategoryBreakdown[];
  onChange: () => void;
}) {
  const { theme } = useTheme();
  const palette = chartPalette(theme);

  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(category: string) {
    setBusy(true);
    const trimmed = draft.trim();

    try {
      await api("/api/budgets", {
        method: "PUT",
        body: { category, amount: trimmed === "" ? null : Number(trimmed) },
      });
      setEditing(null);
      setDraft("");
      onChange();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card rise p-5">
      <h2 className="font-semibold tracking-tight">Budget limits</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Set a monthly cap per category. Leave blank to remove it.
      </p>

      <ul className="mt-5 space-y-4">
        {breakdown.map((entry) => {
          const filled =
            entry.limit && entry.limit > 0 ? Math.min(100, (entry.amount / entry.limit) * 100) : 0;
          const color = entry.overLimit ? palette.over : palette.bar;

          return (
            <li key={entry.category}>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{entry.category}</span>

                {entry.overLimit && (
                  <span className="chip bg-danger-soft text-danger">
                    over by {formatMoney(entry.amount - (entry.limit ?? 0))}
                  </span>
                )}

                <span className="tnum ml-auto text-ink-soft">
                  {formatMoney(entry.amount)}
                  {entry.limit !== null && (
                    <span className="text-ink-muted"> / {formatMoney(entry.limit)}</span>
                  )}
                </span>

                {editing === entry.category ? (
                  <span className="flex gap-1">
                    <input
                      className="field tnum w-24 py-1"
                      type="number"
                      min="0"
                      step="1"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="No cap"
                      autoFocus
                    />
                    <button
                      className="btn btn-primary px-2.5 py-1"
                      disabled={busy}
                      onClick={() => save(entry.category)}
                    >
                      Save
                    </button>
                  </span>
                ) : (
                  <button
                    className="rounded-md px-2 py-1 text-xs text-ink-muted hover:bg-accent-soft hover:text-accent"
                    onClick={() => {
                      setEditing(entry.category);
                      setDraft(entry.limit === null ? "" : String(entry.limit));
                    }}
                  >
                    {entry.limit === null ? "Set cap" : "Edit"}
                  </button>
                )}
              </div>

              {entry.limit !== null && (
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${filled}%`,
                      background: `linear-gradient(90deg, ${color}99, ${color})`,
                    }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
