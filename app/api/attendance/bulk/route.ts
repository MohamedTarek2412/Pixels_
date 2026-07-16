import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    const courseId = searchParams.get("courseId");

    if (!dateStr) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    // 1. Fetch Students
    const studentsWhere: any = { isActive: true };
    if (courseId) {
      studentsWhere.enrollments = { some: { courseId, isActive: true } };
    }

    const students = await prisma.student.findMany({
      where: studentsWhere,
      select: {
        id: true,
        fullName: true,
        enrollments: {
          where: courseId ? { courseId, isActive: true } : { isActive: true },
          select: {
            courseId: true,
            subscribedSessions: true,
            course: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { fullName: "asc" },
    });

    // 2. Fetch Today's Attendances
    const attendanceWhere: any = {
      date: { gte: startOfDay, lte: endOfDay },
    };
    if (courseId) {
      attendanceWhere.courseId = courseId;
    }

    const todayAttendances = await prisma.attendance.findMany({
      where: attendanceWhere,
      select: {
        id: true,
        studentId: true,
        status: true,
        courseId: true,
      },
    });

    // 3. For each student, count their PRESENT sessions per course
    // We need to count all PRESENT records (not just today) per course enrollment
    const studentIds = students.map((s) => s.id);
    const presentCounts = await prisma.attendance.groupBy({
      by: ["studentId", "courseId"],
      where: {
        studentId: { in: studentIds },
        status: "PRESENT",
        ...(courseId ? { courseId } : {}),
      },
      _count: { id: true },
    });

    // Build a map: studentId -> courseId -> presentCount
    const presentMap: Record<string, Record<string, number>> = {};
    for (const row of presentCounts) {
      if (!presentMap[row.studentId]) presentMap[row.studentId] = {};
      presentMap[row.studentId][row.courseId ?? "null"] = row._count.id;
    }

    // 4. Map everything together
    const result = students.map((s) => {
      const studentAttendances = todayAttendances.filter((a) => a.studentId === s.id);

      const enrollmentInfo = s.enrollments.map((e) => {
        const cId = e.courseId;
        const attended = presentMap[s.id]?.[cId] ?? 0;
        const subscribed = e.subscribedSessions ?? 8; // default 8
        return {
          courseId: cId,
          courseName: e.course.name,
          attended,
          subscribed,
          needsRenewal: attended >= subscribed,
        };
      });

      return {
        id: s.id,
        fullName: s.fullName,
        courses: s.enrollments.map((e) => e.course),
        attendances: studentAttendances,
        enrollmentInfo,
      };
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Bulk Attendance GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { studentId, date, status, courseId } = await req.json();

    if (!studentId || !date || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const existing = await prisma.attendance.findFirst({
      where: {
        studentId,
        courseId: courseId || null,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (existing) {
      const updated = await prisma.attendance.update({
        where: { id: existing.id },
        data: { status },
      });
      return NextResponse.json(updated);
    } else {
      const created = await prisma.attendance.create({
        data: {
          studentId,
          courseId: courseId || null,
          date: startOfDay,
          status,
        },
      });
      return NextResponse.json(created);
    }
  } catch (error) {
    console.error("Bulk Attendance POST Error:", error);
    return NextResponse.json({ error: "Failed to save attendance" }, { status: 500 });
  }
}
