import Groq from "groq-sdk";
import { z } from "zod";
import { monthLabel } from "./categories";
import type { MonthlySummary } from "./summary";

const MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";

const RecommendationSchema = z.object({
  title: z.string(),
  detail: z.string(),
  category: z.string(),
  monthlyImpact: z.number(),
});

const HealthCheckSchema = z.object({
  headline: z.string(),
  score: z.number(),
  recommendations: z.array(RecommendationSchema).min(1),
});

export type HealthCheck = z.infer<typeof HealthCheckSchema>;

const JSON_SCHEMA = {
  type: "object",
  properties: {
    headline: {
      type: "string",
      description:
        "One sentence verdict on this month, quoting the savings rate as a percentage.",
    },
    score: {
      type: "number",
      description:
        "Financial health score between 0 and 100, where 100 is excellent. This is NOT the savings rate.",
    },
    recommendations: {
      type: "array",
      description: "Exactly three recommendations, largest money impact first.",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Specific headline, at most eight words." },
          detail: {
            type: "string",
            description:
              "Two or three sentences quoting at least one of the user's own monthly amounts or percentages, then what to do about it.",
          },
          category: {
            type: "string",
            description:
              "One of Housing, Food, Transport, Entertainment, Health, Subscriptions, Other, or Overall.",
          },
          monthlyImpact: {
            type: "number",
            description:
              "Money freed up per month, not per year, as a plain number. Use 0 when it cannot be quantified.",
          },
        },
        required: ["title", "detail", "category", "monthlyImpact"],
        additionalProperties: false,
      },
    },
  },
  required: ["headline", "score", "recommendations"],
  additionalProperties: false,
} as const;

const SYSTEM = `You are a personal finance analyst inside a budgeting app called BudgetWise.

You are given one user's actual figures for a single month. Return a health check and exactly three recommendations.

Rules:
- Cite the user's real numbers. Write "Your food spend is 20,720, which is 27% of your income", never "try to spend less on food".
- Every figure you quote is monthly. Never convert to annual amounts.
- Rank recommendations by how much money they free up. Biggest lever first.
- Use the 50/30/20 rule as the yardstick: needs (Housing, Food, Transport, Health) near 50% of income, wants (Entertainment, Subscriptions, Other) near 30%, savings at least 20%. State where the user sits against it.
- The 50 and 30 targets apply to those groups combined, never to a single category. Do not compare one category's share against 50% or 30%. The combined figures are given to you.
- The score is an overall health rating from 0 to 100. It is not the savings rate.
- Do not invent a problem with a category that is already reasonable.
- If expenses exceed income, lead with the shortfall and be direct about it.
- If a category is over the user's own budget limit, name it and the amount.
- Write amounts as plain numbers with no currency symbol.
- Be concrete and non-judgemental.`;

function buildPrompt(summary: MonthlySummary): string {
  const lines = [
    `Month: ${monthLabel(summary.month)}`,
    `Total income: ${summary.totalIncome}`,
    `Total expenses: ${summary.totalExpenses}`,
    `Savings: ${summary.savings}`,
    `Savings rate: ${summary.savingsRate === null ? "n/a (no income recorded)" : `${summary.savingsRate}%`}`,
  ];

  if (summary.rule503020) {
    const r = summary.rule503020;
    lines.push(
      `50/30/20 position: needs ${r.needs}% of income (target 50), wants ${r.wants}% (target 30), savings ${r.savings}% (target at least 20)`,
    );
  }

  lines.push("", "Spending by category (amount, % of expenses, % of income, budget limit):");
  for (const b of summary.breakdown) {
    if (b.amount === 0 && b.limit === null) continue;
    const limit = b.limit === null ? "no limit set" : `limit ${b.limit}${b.overLimit ? " — EXCEEDED" : ""}`;
    const ofIncome = b.shareOfIncome === null ? "n/a" : `${b.shareOfIncome}%`;
    lines.push(`- ${b.category}: ${b.amount}, ${b.shareOfSpend}% of spend, ${ofIncome} of income, ${limit}`);
  }

  const history = summary.trend.filter((t) => t.income > 0 || t.expenses > 0);
  if (history.length > 1) {
    lines.push("", "Recent months (income / expenses / savings):");
    for (const t of history) lines.push(`- ${t.month}: ${t.income} / ${t.expenses} / ${t.savings}`);
  }

  return lines.join("\n");
}

export class AiUnavailableError extends Error {}

export async function runHealthCheck(summary: MonthlySummary): Promise<HealthCheck> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new AiUnavailableError("GROQ_API_KEY is not set. Add it to .env and restart the server.");
  }

  const client = new Groq({ apiKey });

  let completion;
  try {
    completion = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      max_completion_tokens: 2048,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Here is my budget. Give me my financial health check.\n\n${buildPrompt(summary)}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "financial_health_check", schema: JSON_SCHEMA, strict: true },
      },
    });
  } catch (err) {
    if (err instanceof Groq.APIError) {
      throw new AiUnavailableError(
        err.status === 401
          ? "Groq rejected the API key. Check GROQ_API_KEY in .env."
          : `Groq request failed (${err.status ?? "network"}). Try again in a moment.`,
      );
    }
    throw err;
  }

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new AiUnavailableError("The model returned an empty response. Try again.");

  const parsed = HealthCheckSchema.safeParse(JSON.parse(content));
  if (!parsed.success) {
    throw new AiUnavailableError("The model returned an unexpected shape. Try again.");
  }

  return {
    ...parsed.data,
    score: Math.max(0, Math.min(100, Math.round(parsed.data.score))),
    recommendations: parsed.data.recommendations.slice(0, 3),
  };
}
