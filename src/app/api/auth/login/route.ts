import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getPrisma } from "@/lib/db";
import { signToken, setSessionCookie } from "@/lib/auth";
import { handler, jsonError, parseBody } from "@/lib/api";

const schema = z.object({
  email: z.email("Enter a valid email address").transform((v) => v.toLowerCase()),
  password: z.string().min(1, "Password is required"),
});

export const POST = handler(async (req: Request) => {
  const { email, password } = await parseBody(req, schema);

  const user = await getPrisma().user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return jsonError("Incorrect email or password", 401);
  }

  await setSessionCookie(await signToken(user.id));
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
});
