export function Logo({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 17.5 9 11l4 4 7.5-7.5" />
          <path d="M15 7h6v6" />
        </svg>
      </span>
      <span>
        <span className="block font-semibold tracking-tight">BudgetWise</span>
        {subtitle && <span className="block text-xs text-ink-muted">{subtitle}</span>}
      </span>
    </div>
  );
}
