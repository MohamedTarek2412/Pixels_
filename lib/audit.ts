import { prisma } from "./prisma";

type AuditParams = {
  userId?: string | null;
  action: "CREATE" | "UPDATE" | "DELETE";
  entityType: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
};

export async function logAudit({
  userId,
  action,
  entityType,
  entityId,
  oldValue,
  newValue,
}: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId ?? undefined,
        action,
        entityType,
        entityId,
        oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : undefined,
        newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : undefined,
      },
    });
  } catch (err) {
    // Never let audit logging break the main request
    console.error("Audit log failed:", err);
  }
}
