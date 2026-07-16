import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const months = parseInt(searchParams.get("months") || "6");

  const now = new Date();
  const results = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);

    const [revenue, expenses, newStudents, enrollmentCount] = await Promise.all([
      prisma.payment.aggregate({ _sum: { paidAmount: true }, where: { month: monthKey } }),
      prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: start, lt: end } } }),
      prisma.student.count({ where: { createdAt: { gte: start, lt: end } } }),
      prisma.enrollment.count({ where: { enrolledAt: { gte: start, lt: end } } }),
    ]);

    results.push({
      month: monthKey,
      revenue: Number(revenue._sum.paidAmount || 0),
      expenses: Number(expenses._sum.amount || 0),
      profit: Number(revenue._sum.paidAmount || 0) - Number(expenses._sum.amount || 0),
      newStudents,
      enrollments: enrollmentCount,
    });
  }

  const coursePopularity = await prisma.course.findMany({
    select: {
      name: true,
      _count: { select: { enrollments: true } },
    },
  });

  const popularity = coursePopularity.map((c: (typeof coursePopularity)[number]) => ({
    name: c.name,
    students: c._count.enrollments,
  }));

  return NextResponse.json({ monthly: results, coursePopularity: popularity });
}
