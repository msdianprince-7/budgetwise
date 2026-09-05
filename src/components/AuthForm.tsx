"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/client";
import { ThemeToggle } from "@/lib/theme";
import { Logo } from "./Logo";

type Mode = "login" | "signup";

const HIGHLIGHTS = [
  {
    title: "See where it actually goes",
    body: "Seven categories, a ranked breakdown, and month-over-month trend in one view.",
  },
  {
    title: "Measured against 50/30/20",
    body: "Needs, wants and savings scored against the rule real advisors start from.",
  },
  {
    title: "AI health check on your numbers",
    body: "Three ranked moves that quote your own figures, not generic budgeting tips.",
  },
];

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await api(`/api/auth/${mode}`, {
        method: "POST",
        body: isSignup ? { name, email, password } : { email, password },
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="hidden flex-col justify-between border-r border-border p-12 lg:flex">
        <Logo />

        <div className="max-w-md">
          <h1 className="display text-4xl leading-tight">
            Know exactly where
            <br />
            your month went.
          </h1>
          <p className="mt-4 text-ink-soft">
            BudgetWise turns a list of transactions into a clear picture of your finances, then
            tells you what to do about it.
          </p>

          <ul className="mt-10 space-y-5">
            {HIGHLIGHTS.map((item, index) => (
              <li key={item.title} className="rise flex gap-4" style={{ animationDelay: `${index * 80}ms` }}>
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-xs font-semibold text-accent">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-0.5 text-sm text-ink-soft">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-ink-muted">Your data stays in your own database.</p>
      </section>

      <section className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between">
            <span className="lg:hidden">
              <Logo />
            </span>
            <span className="ml-auto">
              <ThemeToggle />
            </span>
          </div>

          <h2 className="display text-2xl">{isSignup ? "Create your account" : "Welcome back"}</h2>
          <p className="mt-1.5 text-sm text-ink-soft">
            {isSignup
              ? "One minute to set up, then start tracking."
              : "Log in to pick up where you left off."}
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            {isSignup && (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Name</span>
                <input
                  className="field"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  autoComplete="name"
                  placeholder="Priyansh"
                />
              </label>
            )}

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Email</span>
              <input
                className="field"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Password</span>
              <input
                className="field"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={isSignup ? 8 : undefined}
                autoComplete={isSignup ? "new-password" : "current-password"}
                placeholder={isSignup ? "At least 8 characters" : "••••••••"}
              />
            </label>

            {error && (
              <p role="alert" className="alert">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn btn-primary w-full">
              {busy ? "Please wait…" : isSignup ? "Create account" : "Log in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-muted">
            {isSignup ? "Already have an account? " : "New here? "}
            <Link
              href={isSignup ? "/login" : "/signup"}
              className="font-medium text-accent hover:text-accent-strong"
            >
              {isSignup ? "Log in" : "Create one"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
