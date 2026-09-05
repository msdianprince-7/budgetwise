"use client";

import { useState } from "react";
import { api, formatMoney } from "@/lib/client";
import { chartPalette } from "@/lib/categories";
import { useTheme } from "@/lib/theme";
import type { HealthCheck } from "@/lib/ai";

function scoreTone(score: number, palette: ReturnType<typeof chartPalette>) {
  if (score >= 70) return palette.savings;
  if (score >= 40) return palette.expenses;
  return palette.over;
}

export default function HealthCheckPanel({ month }: { month: string }) {
  const { theme } = useTheme();
  const palette = chartPalette(theme);

  const [result, setResult] = useState<HealthCheck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);

    try {
      const data = await api<{ result: HealthCheck }>(`/api/ai/health-check?month=${month}`, {
        method: "POST",
      });
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the model");
    } finally {
      setBusy(false);
    }
  }

  const tone = result ? scoreTone(result.score, palette) : palette.income;

  return (
    <section className="card rise overflow-hidden">
      <div
        className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5"
        style={{ background: `linear-gradient(180deg, var(--accent-soft), transparent)` }}
      >
        <div>
          <div className="flex items-center gap-2">
            <SparkIcon />
            <h2 className="font-semibold tracking-tight">AI Financial Health Check</h2>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            Reads this month&apos;s actual numbers and returns three specific moves.
          </p>
        </div>
        <button onClick={run} disabled={busy} className="btn btn-primary">
          {busy ? "Analysing…" : result ? "Run again" : "Run check"}
        </button>
      </div>

      <div className="p-5">
        {error && (
          <p role="alert" className="alert">
            {error}
          </p>
        )}

        {busy && !result && (
          <div className="space-y-3" aria-hidden>
            {[0, 1, 2].map((index) => (
              <div key={index} className="skeleton h-[76px]" />
            ))}
          </div>
        )}

        {!busy && !result && !error && (
          <p className="text-sm text-ink-muted">
            Nothing generated yet. Run the check to see where your month stands.
          </p>
        )}

        {result && (
          <div className="rise">
            <div className="flex flex-wrap items-center gap-5">
              <ScoreRing score={result.score} color={tone} />
              <p className="min-w-[16rem] flex-1 text-ink-soft">{result.headline}</p>
            </div>

            <ol className="mt-6 space-y-3">
              {result.recommendations.map((recommendation, index) => (
                <li
                  key={recommendation.title}
                  className="card card-interactive rise p-4"
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="chip bg-accent-soft text-accent">{recommendation.category}</span>
                    <h3 className="font-medium">{recommendation.title}</h3>
                    {recommendation.monthlyImpact > 0 && (
                      <span
                        className="tnum ml-auto text-sm font-semibold"
                        style={{ color: palette.savings }}
                      >
                        +{formatMoney(recommendation.monthlyImpact)}/mo
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {recommendation.detail}
                  </p>
                </li>
              ))}
            </ol>

            <p className="mt-4 text-xs text-ink-muted">
              Generated from your recorded figures. Guidance, not licensed financial advice.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, score)) / 100);

  return (
    <div className="relative h-[76px] w-[76px] shrink-0">
      <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90">
        <circle cx="38" cy="38" r={radius} fill="none" stroke="var(--border)" strokeWidth="7" />
        <circle
          cx="38"
          cy="38"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <span className="tnum display absolute inset-0 flex items-center justify-center text-xl">
        {score}
      </span>
    </div>
  );
}

function SparkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-accent" aria-hidden>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
    </svg>
  );
}
