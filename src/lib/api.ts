import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { getUserId } from "./auth";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireUserId(req?: Request): Promise<string> {
  const id = await getUserId(req);
  if (!id) throw jsonError("Not authenticated", 401);
  return id;
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw jsonError("Request body must be valid JSON");
  }
  try {
    return schema.parse(raw);
  } catch (err) {
    if (err instanceof ZodError) {
      throw jsonError(err.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; "));
    }
    throw err;
  }
}

export function handler<A extends unknown[]>(
  fn: (...args: A) => Promise<Response>,
): (...args: A) => Promise<Response> {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof Response) return err;
      console.error(err);
      return jsonError("Something went wrong", 500);
    }
  };
}
