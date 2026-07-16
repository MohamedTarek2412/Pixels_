import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  ratePerSession: z.number().positive().optional(),
  specialty: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  const instructor = await prisma.instructor.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      payrolls: { orderBy: { generatedAt: "desc" }, take: 5 },
    },
  });

  if (!instructor) return NextResponse.json({ error: "المدرس مش موجود" }, { status: 404 });
  return NextResponse.json({ instructor });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { name, phone, ratePerSession, specialty } = parsed.data;

  const before = await prisma.instructor.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "المدرس مش موجود" }, { status: 404 });

  const instructor = await prisma.instructor.update({
    where: { id },
    data: {
      ratePerSession,
      specialty,
      user: {
        update: {
          ...(name ? { name } : {}),
          ...(phone !== undefined ? { phone } : {}),
        },
      },
    },
    include: { user: { select: { name: true, email: true, phone: true } } },
  });

  await logAudit({
    userId: session.userId,
    action: "UPDATE",
    entityType: "Instructor",
    entityId: id,
    oldValue: before,
    newValue: instructor,
  });

  return NextResponse.json({ instructor });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  const before = await prisma.instructor.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "المدرس مش موجود" }, { status: 404 });

  // Soft delete: عطّل حساب المستخدم بتاع المدرس بدل ما نمسحه نهائي عشان السجلات القديمة (السيشنز والمرتبات) تفضل موجودة
  const instructor = await prisma.instructor.update({
    where: { id },
    data: { user: { update: { isActive: false } } },
  });

  await logAudit({
    userId: session.userId,
    action: "DELETE",
    entityType: "Instructor",
    entityId: id,
    oldValue: before,
  });

  return NextResponse.json({ instructor });
}
