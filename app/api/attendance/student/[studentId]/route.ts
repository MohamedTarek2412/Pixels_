import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const addSchema = z.object({
  courseId: z.string().optional(),
  date: z.string(), // "2026-07-15"
  status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { studentId } = await params;

  const attendances = await prisma.attendance.findMany({
    where: { studentId },
    include: { course: true },
    orderBy: { date: "desc" },
  });

  const presentCount = attendances.filter((a: (typeof attendances)[number]) => a.status === "PRESENT").length;

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId, isActive: true },
    include: { course: true },
  });

  return NextResponse.json({
    courses: enrollments.map((e: (typeof enrollments)[number]) => ({
      id: e.course.id,
      name: e.course.name,
    })),
    attendances: attendances.map((a: (typeof attendances)[number]) => ({
      id: a.id,
      status: a.status,
      date: a.date,
      courseId: a.courseId,
      courseName: a.course ? a.course.name : null,
    })),
    presentCount,
    totalCount: attendances.length,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { studentId } = await params;
  const body = await req.json();
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { courseId, date, status } = parsed.data;
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  const existing = await prisma.attendance.findFirst({
    where: {
      studentId,
      date: {
        gte: dayStart,
        lt: new Date(dayStart.getTime() + 24 * 60 * 60 * 1000),
      },
      ...(courseId ? { courseId } : {}),
    },
  });

  let attendance;
  if (existing) {
    attendance = await prisma.attendance.update({
      where: { id: existing.id },
      data: { status, courseId: courseId || existing.courseId },
    });
  } else {
    attendance = await prisma.attendance.create({
      data: { studentId, date: dayStart, status, courseId },
    });
  }

  await logAudit({
    userId: session.userId,
    action: existing ? "UPDATE" : "CREATE",
    entityType: "Attendance",
    entityId: attendance.id,
    newValue: attendance,
  });

  return NextResponse.json({ attendance });
}
