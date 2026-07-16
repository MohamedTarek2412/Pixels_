// This endpoint was for group-session-based attendance - now deprecated
// Attendance is managed per-student via /api/attendance/student/[studentId]
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  return NextResponse.json({ message: "استخدم endpoint الحضور الفردي /api/attendance/student/[id]" });
}
