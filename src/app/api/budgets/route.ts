import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/db";
import { handler, parseBody, requireUserId } from "@/lib/api";
import { CATEGORIES } from "@/lib/categories";

const putSchema = z.object({
  category: z.enum(CATEGORIES),
  amount: z.number().nonnegative().max(1e12).nullable(),
});

export const GET = handler(async (req: Request) => {
  const userId = await requireUserId(req);
  const budgets = await getPrisma().budgetLimit.findMany({ where: { userId } });
  return NextResponse.json({ budgets });
});

export const PUT = handler(async (req: Request) => {
  const userId = await requireUserId(req);
  const { category, amount } = await parseBody(req, putSchema);

  if (amount === null) {
    await getPrisma().budgetLimit.deleteMany({ where: { userId, category } });
    return NextResponse.json({ budget: null });
  }

  const budget = await getPrisma().budgetLimit.upsert({
    where: { userId_category: { userId, category } },
    create: { userId, category, amount },
    update: { amount },
  });
  return NextResponse.json({ budget });
});
