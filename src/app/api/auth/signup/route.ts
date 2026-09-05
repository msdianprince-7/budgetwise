import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { signToken, setSessionCookie } from "@/lib/auth";
import { handler, jsonError, parseBody } from "@/lib/api";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.email("Enter a valid email address").transform((v) => v.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const POST = handler(async (req: Request) => {
  const { name, email, password } = await parseBody(req, schema);

  if (await prisma.user.findUnique({ where: { email } })) {
    return jsonError("An account with that email already exists", 409);
  }

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 12) },
    select: { id: true, email: true, name: true },
  });

  await setSessionCookie(await signToken(user.id));
  return NextResponse.json({ user }, { status: 201 });
});
