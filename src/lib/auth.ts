import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { getPrisma } from "./db";

const COOKIE = "bw_token";
const ALG = "HS256";

function secret(): Uint8Array {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET is not set — see .env.example");
  return new TextEncoder().encode(value);
}

export async function signToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getUserId(req?: Request): Promise<string | null> {
  let token: string | undefined;

  const header = req?.headers.get("authorization");
  if (header?.startsWith("Bearer ")) token = header.slice(7);

  if (!token) {
    const store = await cookies();
    token = store.get(COOKIE)?.value;
  }
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: [ALG] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function getCurrentUser(req?: Request) {
  const id = await getUserId(req);
  if (!id) return null;
  return getPrisma().user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true },
  });
}
