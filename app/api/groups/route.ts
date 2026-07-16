// Groups API is deprecated - groups replaced by direct course enrollment
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  return NextResponse.json({ groups: [] });
}

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  return NextResponse.json({ error: "الجروبات تم إلغاؤها، سجّل الطلاب في الكورس مباشرة" }, { status: 410 });
}
