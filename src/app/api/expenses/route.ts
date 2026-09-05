import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/db";
import { handler, parseBody, requireUserId } from "@/lib/api";
import { CATEGORIES, currentMonth } from "@/lib/categories";

const createSchema = z.object({
  category: z.enum(CATEGORIES),
  note: z.string().trim().min(1, "Description is required").max(120),
  amount: z.number().positive("Amount must be greater than zero").max(1e12),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must look like 2026-09"),
});

export const GET = handler(async (req: Request) => {
  const userId = await requireUserId(req);
  const month = new URL(req.url).searchParams.get("month") ?? currentMonth();

  const expenses = await getPrisma().expense.findMany({
    where: { userId, month },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ expenses });
});

export const POST = handler(async (req: Request) => {
  const userId = await requireUserId(req);
  const data = await parseBody(req, createSchema);

  const expense = await getPrisma().expense.create({ data: { ...data, userId } });
  return NextResponse.json({ expense }, { status: 201 });
});
