import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [
    revenueToday,
    revenueMonth,
    expensesMonth,
    activeEnrollments,
    activeStudents,
    pendingPayments,
    debts,
    totalAttendanceRecords,
    presentRecords,
  ] = await Promise.all([
    prisma.payment.aggregate({
      _sum: { paidAmount: true },
      where: { updatedAt: { gte: startOfToday, lt: endOfToday } },
    }),
    prisma.payment.aggregate({
      _sum: { paidAmount: true },
      where: { month: monthKey },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { date: { gte: startOfMonth } },
    }),
    prisma.enrollment.count({ where: { isActive: true } }),
    prisma.student.count({ where: { isActive: true } }),
    prisma.payment.count({ where: { status: { in: ["DUE", "PARTIAL"] } } }),
    prisma.payment.aggregate({
      _sum: { remaining: true },
      where: { status: { in: ["DUE", "PARTIAL", "OVERDUE"] } },
    }),
    prisma.attendance.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.attendance.count({
      where: { createdAt: { gte: startOfMonth }, status: "PRESENT" },
    }),
  ]);

  const revToday = Number(revenueToday._sum.paidAmount || 0);
  const revMonth = Number(revenueMonth._sum.paidAmount || 0);
  const expMonth = Number(expensesMonth._sum.amount || 0);

  return NextResponse.json({
    revenueToday: revToday,
    revenueThisMonth: revMonth,
    expenses: expMonth,
    profit: revMonth - expMonth,
    activeStudents,
    activeEnrollments,
    pendingPayments,
    debts: Number(debts._sum.remaining || 0),
    attendancePercentage:
      totalAttendanceRecords > 0
        ? Math.round((presentRecords / totalAttendanceRecords) * 100)
        : 0,
  });
}
