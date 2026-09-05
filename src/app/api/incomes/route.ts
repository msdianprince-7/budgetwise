import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, parseBody, requireUserId } from "@/lib/api";
import { currentMonth } from "@/lib/categories";

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

const createSchema = z.object({
  source: z.string().trim().min(1, "Source is required").max(80),
  amount: z.number().positive("Amount must be greater than zero").max(1e12),
  month: z.string().regex(monthPattern, "Month must look like 2026-09"),
});

export const GET = handler(async (req: Request) => {
  const userId = await requireUserId(req);
  const month = new URL(req.url).searchParams.get("month") ?? currentMonth();

  const incomes = await prisma.income.findMany({
    where: { userId, month },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ incomes });
});

export const POST = handler(async (req: Request) => {
  const userId = await requireUserId(req);
  const data = await parseBody(req, createSchema);

  const income = await prisma.income.create({ data: { ...data, userId } });
  return NextResponse.json({ income }, { status: 201 });
});
