import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  subscribedSessions: z.number().int().positive().optional(),
  paidAmount: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const before = await prisma.enrollment.findUnique({ where: { id } });
  const enrollment = await prisma.enrollment.update({ where: { id }, data: parsed.data });

  await logAudit({
    userId: session.userId,
    action: "UPDATE",
    entityType: "Enrollment",
    entityId: id,
    oldValue: before,
    newValue: enrollment,
  });

  return NextResponse.json({ enrollment });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  const before = await prisma.enrollment.findUnique({ where: { id } });
  await prisma.enrollment.delete({ where: { id } });

  await logAudit({
    userId: session.userId,
    action: "DELETE",
    entityType: "Enrollment",
    entityId: id,
    oldValue: before,
  });

  return NextResponse.json({ success: true });
}
