import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  fullName: z.string().min(2).optional(),
  age: z.number().int().positive().optional(),
  school: z.string().optional(),
  guardianName: z.string().optional(),
  fatherPhone: z.string().optional(),
  motherPhone: z.string().optional(),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  photoUrl: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      enrollments: { include: { course: true } },
      payments: { orderBy: { dueDate: "desc" } },
      attendances: { include: { course: true }, orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!student) return NextResponse.json({ error: "الطالب مش موجود" }, { status: 404 });
  return NextResponse.json({ student });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const before = await prisma.student.findUnique({ where: { id } });
  const student = await prisma.student.update({ where: { id }, data: parsed.data });

  await logAudit({
    userId: session.userId,
    action: "UPDATE",
    entityType: "Student",
    entityId: id,
    oldValue: before,
    newValue: student,
  });

  return NextResponse.json({ student });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  const before = await prisma.student.findUnique({ where: { id } });
  // Soft delete
  const student = await prisma.student.update({ where: { id }, data: { isActive: false } });

  await logAudit({
    userId: session.userId,
    action: "DELETE",
    entityType: "Student",
    entityId: id,
    oldValue: before,
  });

  return NextResponse.json({ student });
}
