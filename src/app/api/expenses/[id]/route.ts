import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/db";
import { handler, jsonError, parseBody, requireUserId } from "@/lib/api";
import { CATEGORIES } from "@/lib/categories";

const updateSchema = z
  .object({
    category: z.enum(CATEGORIES).optional(),
    note: z.string().trim().min(1).max(120).optional(),
    amount: z.number().positive().max(1e12).optional(),
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

type Params = { params: Promise<{ id: string }> };

async function ownedExpense(id: string, userId: string) {
  const expense = await getPrisma().expense.findFirst({ where: { id, userId } });
  if (!expense) throw jsonError("Expense not found", 404);
  return expense;
}

export const PATCH = handler(async (req: Request, { params }: Params) => {
  const userId = await requireUserId(req);
  const { id } = await params;
  await ownedExpense(id, userId);

  const data = await parseBody(req, updateSchema);
  const expense = await getPrisma().expense.update({ where: { id }, data });
  return NextResponse.json({ expense });
});

export const DELETE = handler(async (req: Request, { params }: Params) => {
  const userId = await requireUserId(req);
  const { id } = await params;
  await ownedExpense(id, userId);

  await getPrisma().expense.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
