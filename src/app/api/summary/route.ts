import { NextResponse } from "next/server";
import { handler, requireUserId } from "@/lib/api";
import { buildSummary } from "@/lib/summary";
import { currentMonth } from "@/lib/categories";

export const GET = handler(async (req: Request) => {
  const userId = await requireUserId(req);
  const month = new URL(req.url).searchParams.get("month") ?? currentMonth();

  return NextResponse.json({ summary: await buildSummary(userId, month) });
});
