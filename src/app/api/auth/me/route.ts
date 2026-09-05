import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { handler, jsonError } from "@/lib/api";

export const GET = handler(async (req: Request) => {
  const user = await getCurrentUser(req);
  if (!user) return jsonError("Not authenticated", 401);
  return NextResponse.json({ user });
});
