import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  month: z.string().optional(),
  amount: z.number().positive().optional(),
  discount: z.number().min(0).optional(),
  paidAmount: z.number().min(0).optional(),
  dueDate: z.string().optional(),
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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const before = await prisma.payment.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "الدفعة مش موجودة" }, { status: 404 });

  const amount = parsed.data.amount ?? Number(before.amount);
  const discount = parsed.data.discount ?? Number(before.discount);
  const paidAmount = parsed.data.paidAmount ?? Number(before.paidAmount);
  const dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : before.dueDate;
  const { status, remaining } = computeStatus(amount, discount, paidAmount, dueDate);

  const { dueDate: _unusedDueDate, paidAt, ...rest } = parsed.data;
  void _unusedDueDate;

  const payment = await prisma.payment.update({
    where: { id },
    data: {
      ...rest,
      amount,
      discount,
      paidAmount,
      remaining,
      dueDate,
      status,
      ...(paidAt ? { paidAt: new Date(paidAt) } : {}),
    },
  });

  await logAudit({
    userId: session.userId,
    action: "UPDATE",
    entityType: "Payment",
    entityId: id,
    oldValue: before,
    newValue: payment,
  });

  return NextResponse.json({ payment });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  const before = await prisma.payment.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "الدفعة مش موجودة" }, { status: 404 });

  await prisma.payment.delete({ where: { id } });

  await logAudit({
    userId: session.userId,
    action: "DELETE",
    entityType: "Payment",
    entityId: id,
    oldValue: before,
  });

  return NextResponse.json({ success: true });
}
