/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, AttendanceStatus } from "@prisma/client";

// نوع البيانات المستلمة في POST مع تحديد status كنوع AttendanceStatus
type AttendancePostBody = {
  studentId: string;
  date: string;
  status: AttendanceStatus;  // <- التغيير هنا
  courseId?: string;
};

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const dateStr = searchParams.get("date");
    const courseId = searchParams.get("courseId");

    if (!dateStr) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    const studentsWhere: Prisma.StudentWhereInput = { isActive: true };
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

    const attendanceWhere: Prisma.AttendanceWhereInput = {
      date: { gte: startOfDay, lte: endOfDay },
    };
    if (courseId) {
      attendanceWhere.courseId = courseId;
    }

    const todayAttendances = await prisma.attendance.findMany({
      where: attendanceWhere,
      select: { id: true, studentId: true, status: true, courseId: true },
    });

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

    const presentMap: Record<string, Record<string, number>> = {};
    for (const row of presentCounts) {
      if (!presentMap[row.studentId]) presentMap[row.studentId] = {};
      presentMap[row.studentId][row.courseId ?? "null"] = row._count.id;
    }

    const result = students.map((s) => {
      const studentAttendances = todayAttendances.filter((a) => a.studentId === s.id);
      const enrollmentInfo = s.enrollments.map((e) => {
        const cId = e.courseId;
        const attended = presentMap[s.id]?.[cId] ?? 0;
        const subscribed = e.subscribedSessions ?? 8;
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
  } catch (error: unknown) {
    console.error("Bulk Attendance GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: AttendancePostBody = await req.json();
    const { studentId, date, status, courseId } = body;

    if (!studentId || !date || !status) {
      return NextResponse.json(
        { error: "Missing required fields (studentId, date, status)" },
        { status: 400 }
      );
    }

    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const existing = await prisma.attendance.findFirst({
      where: {
        studentId,
        courseId: courseId || null,
        date: { gte: startOfDay, lte: endOfDay },
      },
    });

    if (existing) {
      const updated = await prisma.attendance.update({
        where: { id: existing.id },
        data: { status }, // الآن status من النوع AttendanceStatus
      });
      return NextResponse.json(updated);
    } else {
      const created = await prisma.attendance.create({
        data: {
          studentId,
          courseId: courseId || null,
          date: startOfDay,
          status, // نفس الشيء
        },
      });
      return NextResponse.json(created);
    }
  } catch (error: unknown) {
    console.error("Bulk Attendance POST Error:", error);
    return NextResponse.json({ error: "Failed to save attendance" }, { status: 500 });
  }
}
