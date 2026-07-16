// generate-sessions is deprecated - groups and sessions are no longer used
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  return NextResponse.json({ error: "الجروبات والسيشنات تم إلغاؤها" }, { status: 410 });
}
