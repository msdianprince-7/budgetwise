# BudgetWise

Track monthly income and expenses by category, see where the money actually goes, and get an
AI financial health check written against your own numbers.

Built as the Zenara Technologies / ADWIZR take-home assignment for Full Stack Developer (AI-Enabled).

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 |
| Backend | Next.js Route Handlers (Node runtime) |
| Database | SQLite via Prisma 7 with the better-sqlite3 driver adapter |
| Auth | JWT (`jose`) in an HttpOnly cookie, bcrypt password hashes |
| AI | Groq (`openai/gpt-oss-120b`) with JSON-schema structured output |
| Charts | Recharts |

SQLite keeps setup to a single command. Moving to Postgres means changing the `provider` in
`prisma/schema.prisma` and swapping the adapter in `src/lib/db.ts`; no application code changes.

---

## Running it locally

Requires Node 20+.

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open <http://localhost:3000>. Seeded demo login: **demo@budgetwise.app** / **demo1234**, or
create your own account at `/signup`.

### Environment variables

| Variable | Required | What it is |
|---|---|---|
| `DATABASE_URL` | yes | SQLite file path. `file:./dev.db` works as-is. |
| `JWT_SECRET` | yes | Signing secret for session tokens. Generate one with `openssl rand -base64 32`. |
| `GROQ_API_KEY` | for the AI check | From <https://console.groq.com/keys>. Everything else works without it; the health check returns a clear message when it is missing. |
| `GROQ_MODEL` | no | Defaults to `openai/gpt-oss-120b`. |

`.env` is gitignored; `.env.example` ships blank. The key is only ever read server-side.

### Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run db:migrate` | Apply schema changes |
| `npm run db:seed` | Reset the demo account and reseed it |
| `npm run db:studio` | Browse the database in Prisma Studio |
| `npm run lint` | ESLint |

---

## Features

**Required**

- Signup, login and logout with JWT auth; every data route is scoped to the caller
- Income entries: add, edit, delete, per month
- Expenses across Housing, Food, Transport, Entertainment, Health, Subscriptions and Other
- Dashboard: income vs expenses, category breakdown chart, savings amount and savings rate
- AI Financial Health Check: a score, a verdict, and three ranked recommendations built from
  the user's real figures
- Persistence in SQLite through Prisma

**Also built**

- Month selector with a six-month income-vs-expenses trend chart
- Per-category budget limits with a meter and an over-budget alert
- 50/30/20 breakdown showing needs, wants and savings against their targets
- CSV export of the month: totals, per-category split, and every entry
- Dark and light themes, dark by default, remembered per browser
- Responsive down to phone width

---

## API

All routes take and return JSON. Auth is the `bw_token` HttpOnly cookie; an
`Authorization: Bearer <jwt>` header also works, which makes the API testable with curl.

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/auth/signup` | Create account, sets the session cookie |
| `POST` | `/api/auth/login` | Log in |
| `POST` | `/api/auth/logout` | Clear the session |
| `GET` | `/api/auth/me` | Current user |
| `GET` `POST` | `/api/incomes?month=YYYY-MM` | List and create income |
| `PATCH` `DELETE` | `/api/incomes/:id` | Update and delete income |
| `GET` `POST` | `/api/expenses?month=YYYY-MM` | List and create expenses |
| `PATCH` `DELETE` | `/api/expenses/:id` | Update and delete expenses |
| `GET` `PUT` | `/api/budgets` | Read and set a category limit; `amount: null` clears it |
| `GET` | `/api/summary?month=YYYY-MM` | Totals, savings rate, breakdown, 50/30/20, six-month trend |
| `POST` | `/api/ai/health-check?month=YYYY-MM` | Run the AI health check |

```bash
curl -c jar -X POST localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@budgetwise.app","password":"demo1234"}'

curl -b jar localhost:3000/api/summary
```

---

## How the AI check works

`src/lib/ai.ts` holds all of it.

1. **The model gets computed figures, not raw rows.** `buildSummary()` produces totals, each
   category as a share of both spend and income, the 50/30/20 position, budget-limit breaches
   and recent-month history. The model never does arithmetic, so it cannot get the arithmetic
   wrong.
2. **Structured output enforces the shape.** The request uses Groq's `json_schema` response
   format in strict mode, with per-field descriptions, and the reply is validated again with Zod
   before it reaches the UI. There is no JSON-from-prose parsing and never four recommendations
   instead of three.
3. **The prompt bans generic advice.** Each recommendation must quote the user's own numbers,
   ranked by money freed up, with 50/30/20 as the yardstick. The prompt also states that the 50
   and 30 targets apply to the grouped categories rather than any single one, and that every
   figure is monthly.
4. **`monthlyImpact` makes the ranking checkable.** Each recommendation carries what it frees up
   per month, shown in the UI and an easy way to see whether the ranking is honest.

Failure paths are handled rather than assumed away: a missing key, a rejected key, a Groq API
error and an unexpected response shape each return a specific message and a 503.

The output is guidance, not licensed financial advice, and the UI says so.

---

## Design notes

- **Dark by default, light on request.** Both themes are defined as CSS custom properties on
  `:root[data-theme]`. A small inline script applies the stored choice before first paint, so
  there is no flash. The choice persists in `localStorage`.
- **The category chart uses one hue, not seven.** Seven categorical colours cannot be told apart
  under colour-vision deficiency; this palette was checked with a contrast and CVD validator and
  failed badly on all-pairs separation. Identity comes from the axis labels instead. Only the
  two-series trend chart uses colour for identity, and that pair passes in both themes.
- **Chart colours are per-theme.** The dark palette is not the light one brightened; each was
  validated against its own surface for lightness, chroma, CVD separation and contrast.
- **Over-budget is never colour alone.** The bar turns red and the row is labelled with the
  amount it is over by.
- **Money is set in tabular figures** so columns do not jitter as values change.

---

## Project layout

```
prisma/schema.prisma      User, Income, Expense, BudgetLimit
prisma/seed.ts            Demo account with four months of data
prisma.config.ts          Prisma 7 config: datasource URL and migration paths
src/lib/summary.ts        All budget maths, shared by the dashboard and the AI prompt
src/lib/ai.ts             Groq prompt, schema and call
src/lib/auth.ts           JWT sign and verify, session cookie
src/lib/api.ts            Route helpers: auth guard, Zod body parsing, error shaping
src/lib/theme.tsx         Theme store and toggle
src/app/api/...           REST route handlers
src/components/...        Dashboard, charts, entry panels, budget limits, health check
```

---

## Security notes

- Passwords are bcrypt-hashed at cost 12 and never returned by any endpoint.
- Login returns the same message for an unknown email and a wrong password, so the response
  cannot be used to probe for registered accounts.
- Every write checks the row belongs to the caller before touching it. A valid session carrying
  someone else's record id gets a 404, not their data.
- All request bodies are validated with Zod; the category list is an enum, not free text.
- The session cookie is HttpOnly, SameSite=Lax and Secure in production.
- Secrets come from the environment only.

Known gaps for a real deployment: no rate limiting on the auth or AI endpoints, and the AI route
is unthrottled per user.

---

## AI tools used

Per the brief, an honest account:

- **Claude Code** wrote the bulk of this project, driven through an interactive session with the
  assignment brief as the starting spec: schema, API routes, auth, the summary maths, the React
  components, the theming and this README.
- I directed the architectural calls: SQLite so the app runs with one command; all budget maths
  in `summary.ts` so the dashboard and the AI prompt can never disagree; and JSON-schema
  structured output rather than parsing prose.
- Three things changed after seeing them fail in practice. The seven-colour category palette was
  replaced after a colour-vision validator failed it. The first prompt produced a recommendation
  comparing one category against the 50% needs target, which is wrong, so the prompt now states
  that the targets apply to grouped categories. And a hydration warning from the pre-paint theme
  script was fixed rather than ignored.
- Every endpoint was exercised with curl and the UI walked through in the browser, in both
  themes, before this was called done.
