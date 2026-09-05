import { NextResponse } from "next/server";
import { handler, jsonError, requireUserId } from "@/lib/api";
import { buildSummary } from "@/lib/summary";
import { currentMonth } from "@/lib/categories";
import { AiUnavailableError, runHealthCheck } from "@/lib/ai";

export const maxDuration = 120;

export const POST = handler(async (req: Request) => {
  const userId = await requireUserId(req);
  const month = new URL(req.url).searchParams.get("month") ?? currentMonth();

  const summary = await buildSummary(userId, month);
  if (summary.totalIncome === 0 && summary.totalExpenses === 0) {
    return jsonError("Add some income and expenses for this month first", 422);
  }

  try {
    return NextResponse.json({ result: await runHealthCheck(summary) });
  } catch (err) {
    if (err instanceof AiUnavailableError) return jsonError(err.message, 503);
    throw err;
  }
});
