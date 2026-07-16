import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const enrollmentSchema = z.object({
  studentId: z.string(),
  courseId: z.string(),
  subscribedSessions: z.number().int().positive().optional(),
  paidAmount: z.number().min(0).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId") || undefined;
  const courseId = searchParams.get("courseId") || undefined;

  const enrollments = await prisma.enrollment.findMany({
    where: {
      ...(studentId ? { studentId } : {}),
      ...(courseId ? { courseId } : {}),
    },
    include: { course: true, student: { select: { fullName: true } } },
    orderBy: { enrolledAt: "desc" },
  });

  return NextResponse.json({ enrollments });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const parsed = enrollmentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const enrollment = await prisma.enrollment.upsert({
    where: {
      studentId_courseId: {
        studentId: parsed.data.studentId,
        courseId: parsed.data.courseId,
      },
    },
    update: {
      isActive: true,
      subscribedSessions: parsed.data.subscribedSessions,
      paidAmount: parsed.data.paidAmount,
    },
    create: parsed.data,
    include: { course: true },
  });

  await logAudit({
    userId: session.userId,
    action: "CREATE",
    entityType: "Enrollment",
    entityId: enrollment.id,
    newValue: enrollment,
  });

  return NextResponse.json({ enrollment }, { status: 201 });
}
