import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/db";
import { storeState } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_STAFF, hasPermission, type AdminRole, type Permission } from "@/admin/rbac";

export const ADMIN_COOKIE = "gs_admin_session";
const SESSION_MS = 12 * 60 * 60 * 1000;
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export interface AdminSession {
  staffId: string;
  name: string;
  role: AdminRole;
}

export async function createAdminSession(staffId: string) {
  const staff = DEFAULT_STAFF.find(member => member.id === staffId && member.active);
  if (!staff) return null;
  const token = randomBytes(32).toString("base64url");
  const session = { staffId: staff.id, name: staff.name, role: staff.role, expiresAt: Date.now() + SESSION_MS };
  await db.insert(storeState).values({ key: `admin:session:${hash(token)}`, value: session, updatedAt: new Date() });
  return { token, session: { staffId: staff.id, name: staff.name, role: staff.role } satisfies AdminSession, maxAge: Math.floor(SESSION_MS / 1000) };
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const key = `admin:session:${hash(token)}`;
  const [row] = await db.select().from(storeState).where(eq(storeState.key, key));
  if (!row) return null;
  const value = row.value as AdminSession & { expiresAt: number };
  if (value.expiresAt <= Date.now()) {
    await db.delete(storeState).where(eq(storeState.key, key));
    return null;
  }
  const staff = DEFAULT_STAFF.find(member => member.id === value.staffId && member.active);
  return staff ? { staffId: staff.id, name: staff.name, role: staff.role } : null;
}

export async function requirePermission(permission: Permission): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) throw new Error("ADMIN_UNAUTHORIZED");
  if (!hasPermission(session.role, permission)) throw new Error("ADMIN_FORBIDDEN");
  return session;
}

export async function destroyAdminSession() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (token) await db.delete(storeState).where(eq(storeState.key, `admin:session:${hash(token)}`));
}
