import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// بيسجل ساعات/سيشنات للمدرس يدوي بدون جروبات - بيتحسبوا في المرتب (Payroll)
const logSchema = z.object({
  date: z.string(), // "2026-07-15"
  count: z.number().int().min(1).max(50).default(1),
  note: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = logSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const instructor = await prisma.instructor.findUnique({ where: { id } });
  if (!instructor) return NextResponse.json({ error: "المدرس مش موجود" }, { status: 404 });

  await logAudit({
    userId: session.userId,
    action: "CREATE",
    entityType: "SessionLog",
    entityId: id,
    newValue: { instructorId: id, date: parsed.data.date, count: parsed.data.count, note: parsed.data.note },
  });

  return NextResponse.json({ created: parsed.data.count }, { status: 201 });
}
