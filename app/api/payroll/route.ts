import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") || undefined;

  const payrolls = await prisma.payroll.findMany({
    where: month ? { month } : {},
    include: { instructor: { include: { user: { select: { name: true } } } } },
    orderBy: { generatedAt: "desc" },
  });

  return NextResponse.json({ payrolls });
}
