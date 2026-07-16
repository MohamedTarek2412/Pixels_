// This endpoint is deprecated - we now use per-student attendance directly
// Keeping it for backwards compatibility as a no-op
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  return NextResponse.json({ message: "استخدم endpoint الحضور الفردي /api/attendance/student/[id]" });
}
