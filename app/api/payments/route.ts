import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const paymentSchema = z.object({
  studentId: z.string(),
  month: z.string(), // "2026-07"
  amount: z.number().positive(),
  discount: z.number().min(0).default(0),
  paidAmount: z.number().min(0).default(0),
  dueDate: z.string(),
  paidAt: z.string().optional(),
  sessionsCovered: z.number().int().positive().optional(),
  paymentMethod: z.enum(["CASH", "INSTAPAY", "VODAFONE_CASH", "CARD"]).optional(),
  receiptNumber: z.string().optional(),
  notes: z.string().optional(),
});

function computeStatus(amount: number, discount: number, paid: number, dueDate: Date) {
  const remaining = amount - discount - paid;
  if (remaining <= 0) return { status: "PAID" as const, remaining: 0 };
  if (paid > 0) return { status: "PARTIAL" as const, remaining };
  if (new Date() > dueDate) return { status: "OVERDUE" as const, remaining };
  return { status: "DUE" as const, remaining };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId") || undefined;
  const status = searchParams.get("status") || undefined;
  const month = searchParams.get("month") || undefined;

  const payments = await prisma.payment.findMany({
    where: {
      ...(studentId ? { studentId } : {}),
      ...(status ? { status: status as never } : {}),
      ...(month ? { month } : {}),
    },
    include: { student: { select: { fullName: true, whatsapp: true } } },
    orderBy: { dueDate: "desc" },
  });

  return NextResponse.json({ payments });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { amount, discount, paidAmount, dueDate, paidAt, ...rest } = parsed.data;
  const due = new Date(dueDate);
  const { status, remaining } = computeStatus(amount, discount, paidAmount, due);

  const payment = await prisma.payment.create({
    data: {
      ...rest,
      amount,
      discount,
      paidAmount,
      remaining,
      dueDate: due,
      paidAt: paidAt ? new Date(paidAt) : paidAmount > 0 ? new Date() : undefined,
      status,
    },
  });

  await logAudit({
    userId: session.userId,
    action: "CREATE",
    entityType: "Payment",
    entityId: payment.id,
    newValue: payment,
  });

  // TODO: trigger notification if status is OVERDUE or DUE close to dueDate

  return NextResponse.json({ payment }, { status: 201 });
}
