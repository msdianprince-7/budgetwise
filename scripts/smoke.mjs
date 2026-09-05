const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const EMAIL = "demo@budgetwise.app";
const PASSWORD = "demo1234";

let cookie = "";
let passed = 0;
let failed = 0;

async function call(method, path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];

  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}

function check(label, condition, detail = "") {
  if (condition) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

const month = new Date().toISOString().slice(0, 7);

section("Auth");
const anon = await call("GET", "/api/summary");
check("unauthenticated request is rejected", anon.status === 401, `got ${anon.status}`);

const badLogin = await call("POST", "/api/auth/login", { email: EMAIL, password: "wrong" });
check("wrong password is rejected", badLogin.status === 401, `got ${badLogin.status}`);

const login = await call("POST", "/api/auth/login", { email: EMAIL, password: PASSWORD });
check("demo login succeeds", login.status === 200, login.payload.error ?? `got ${login.status}`);

if (login.status !== 200) {
  console.log("\nCannot continue without a session. Run: npm run db:seed");
  process.exit(1);
}

const me = await call("GET", "/api/auth/me");
check("session resolves to the demo user", me.payload?.user?.email === EMAIL);

section("Validation");
const invalid = await call("POST", "/api/expenses", {
  category: "Yacht",
  note: "",
  amount: -5,
  month: "nope",
});
check("bad expense payload is rejected", invalid.status === 400, `got ${invalid.status}`);
if (invalid.status === 400) console.log(`        ${invalid.payload.error}`);

section("Expense CRUD");
const created = await call("POST", "/api/expenses", {
  category: "Health",
  note: "Smoke test entry",
  amount: 1234,
  month,
});
check("create expense", created.status === 201, `got ${created.status}`);

const id = created.payload?.expense?.id;

const updated = await call("PATCH", `/api/expenses/${id}`, { amount: 4321 });
check("update expense", updated.payload?.expense?.amount === 4321);

const savedCookie = cookie;
cookie = "";
const stranger = await call("PATCH", `/api/expenses/${id}`, { amount: 1 });
check("another session cannot touch the row", stranger.status === 401, `got ${stranger.status}`);
cookie = savedCookie;

const removed = await call("DELETE", `/api/expenses/${id}`);
check("delete expense", removed.payload?.ok === true);

const missing = await call("DELETE", `/api/expenses/${id}`);
check("deleting twice returns 404", missing.status === 404, `got ${missing.status}`);

section("Budgets");
const budget = await call("PUT", "/api/budgets", { category: "Transport", amount: 8000 });
check("set a category cap", budget.payload?.budget?.amount === 8000);

section("Summary");
const summary = await call("GET", `/api/summary?month=${month}`);
const data = summary.payload?.summary;
check("summary returns totals", typeof data?.totalIncome === "number");
check("summary returns all seven categories", data?.breakdown?.length === 7);
check("summary returns a six-month trend", data?.trend?.length === 6);

if (data) {
  const arithmetic = Math.abs(data.totalIncome - data.totalExpenses - data.savings) < 0.01;
  check("savings equals income minus expenses", arithmetic);
  console.log(
    `        income ${data.totalIncome} · expenses ${data.totalExpenses} · savings ${data.savings} (${data.savingsRate}%)`,
  );
}

section("AI health check (Groq)");
const started = Date.now();
const ai = await call("POST", `/api/ai/health-check?month=${month}`);
const seconds = ((Date.now() - started) / 1000).toFixed(1);

if (ai.status === 503) {
  console.log(`  SKIP  ${ai.payload.error}`);
} else {
  const result = ai.payload?.result;
  check("returns a result", ai.status === 200, ai.payload.error ?? `got ${ai.status}`);
  check("exactly three recommendations", result?.recommendations?.length === 3);
  check("score is within 0-100", result?.score >= 0 && result?.score <= 100);
  check(
    "every recommendation quotes a number",
    result?.recommendations?.every((item) => /\d/.test(item.detail)),
  );

  if (result) {
    console.log(`\n        score ${result.score}/100 in ${seconds}s`);
    console.log(`        ${result.headline}`);
    for (const item of result.recommendations) {
      console.log(`\n        [${item.category}] ${item.title}  +${item.monthlyImpact}/mo`);
      console.log(`        ${item.detail}`);
    }
  }
}

section(`${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
