import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const before = await prisma.attendance.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "السجل مش موجود" }, { status: 404 });

  const attendance = await prisma.attendance.update({ where: { id }, data: { status: parsed.data.status } });

  await logAudit({
    userId: session.userId,
    action: "UPDATE",
    entityType: "Attendance",
    entityId: id,
    oldValue: before,
    newValue: attendance,
  });

  return NextResponse.json({ attendance });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  const before = await prisma.attendance.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "السجل مش موجود" }, { status: 404 });

  await prisma.attendance.delete({ where: { id } });

  await logAudit({
    userId: session.userId,
    action: "DELETE",
    entityType: "Attendance",
    entityId: id,
    oldValue: before,
  });

  return NextResponse.json({ success: true });
}
