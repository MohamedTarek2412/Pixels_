import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const generateSchema = z.object({
  month: z.string(), // "2026-07"
  instructorId: z.string().optional(), // لو فاضي = كل المدرسين
  bonuses: z.record(z.string(), z.number()).optional(), // instructorId -> bonus
  penalties: z.record(z.string(), z.number()).optional(),
});

/**
 * منطق حساب المرتب:
 * - كل Session بحالة COMPLETED بتتحسب بسعر الـ session العادي
 * - Session بحالة CANCELLED: مش بتتحسب خالص
 * - Session isSubstitute=true: بتتحسب بس ممكن بسعر مختلف (نفس السعر حاليا، قابل للتعديل)
 * - Bonus بيتضاف / Penalty بيتخصم من الإجمالي
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { month, instructorId, bonuses = {}, penalties = {} } = parsed.data;
  const [year, monthNum] = month.split("-").map(Number);
  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = new Date(year, monthNum, 1);

  const instructors = await prisma.instructor.findMany({
    where: instructorId ? { id: instructorId } : {},
    include: { user: { select: { name: true } } },
  });

  const results = [];

  for (const instructor of instructors) {
    // عدد السيشنات المسجلة يدوياً من خلال log-sessions
    // نحسبها من الـ AuditLog لأن Session model اتشال
    const sessionLogs = await prisma.auditLog.findMany({
      where: {
        entityType: "SessionLog",
        entityId: instructor.id,
        createdAt: { gte: startDate, lt: endDate },
      },
    });
    const sessionsCount = sessionLogs.reduce((sum, log) => {
      const val = (log.newValue as Record<string, unknown>);
      return sum + (typeof val?.count === "number" ? val.count : 1);
    }, 0);
    const rate = Number(instructor.ratePerSession);
    const baseAmount = sessionsCount * rate;

    const bonus = bonuses[instructor.id] || 0;
    const penalty = penalties[instructor.id] || 0;
    const totalAmount = baseAmount + bonus - penalty;

    const payroll = await prisma.payroll.upsert({
      where: { instructorId_month: { instructorId: instructor.id, month } },
      update: { sessionsCount, baseAmount, bonus, penalty, totalAmount },
      create: {
        instructorId: instructor.id,
        month,
        sessionsCount,
        baseAmount,
        bonus,
        penalty,
        totalAmount,
      },
    });

    await logAudit({
      userId: session.userId,
      action: "CREATE",
      entityType: "Payroll",
      entityId: payroll.id,
      newValue: payroll,
    });

    results.push({
      instructorName: instructor.user.name,
      ...payroll,
    });
  }

  return NextResponse.json({ payrolls: results });
}
