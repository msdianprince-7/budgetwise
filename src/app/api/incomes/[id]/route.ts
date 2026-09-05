import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, jsonError, parseBody, requireUserId } from "@/lib/api";

const updateSchema = z
  .object({
    source: z.string().trim().min(1).max(80).optional(),
    amount: z.number().positive().max(1e12).optional(),
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

type Params = { params: Promise<{ id: string }> };

async function ownedIncome(id: string, userId: string) {
  const income = await prisma.income.findFirst({ where: { id, userId } });
  if (!income) throw jsonError("Income entry not found", 404);
  return income;
}

export const PATCH = handler(async (req: Request, { params }: Params) => {
  const userId = await requireUserId(req);
  const { id } = await params;
  await ownedIncome(id, userId);

  const data = await parseBody(req, updateSchema);
  const income = await prisma.income.update({ where: { id }, data });
  return NextResponse.json({ income });
});

export const DELETE = handler(async (req: Request, { params }: Params) => {
  const userId = await requireUserId(req);
  const { id } = await params;
  await ownedIncome(id, userId);

  await prisma.income.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
