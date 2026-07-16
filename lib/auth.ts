import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET!;
const COOKIE_NAME = "erp_session";

export type SessionPayload = {
  userId: string;
  role: string;
  branchId?: string | null;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function createToken(payload: SessionPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = createToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Role-based permission map: which roles can access which modules
export const PERMISSIONS: Record<string, string[]> = {
  ADMIN: ["*"],
  MANAGER: [
    "dashboard", "students", "courses", "payments", "attendance",
    "groups", "instructors", "payroll", "expenses", "crm",
    "branches", "reports", "inventory",
  ],
  RECEPTION: ["dashboard", "students", "payments", "attendance", "crm"],
  INSTRUCTOR: ["dashboard", "attendance", "instructor-portal"],
  ACCOUNTANT: ["dashboard", "payments", "payroll", "expenses", "reports"],
  PARENT: ["parent-portal"],
};

export function canAccess(role: string, module: string) {
  const allowed = PERMISSIONS[role] || [];
  return allowed.includes("*") || allowed.includes(module);
}
