import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const expenseSchema = z.object({
  category: z.enum([
    "RENT", "SALARIES", "BILLS", "EQUIPMENT", "MARKETING",
    "WATER", "ELECTRICITY", "INTERNET", "MAINTENANCE", "MISC",
  ]),
  amount: z.number().positive(),
  date: z.string(),
  notes: z.string().optional(),
  branchId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");

  const where = month
    ? {
        date: {
          gte: new Date(`${month}-01`),
          lt: new Date(new Date(`${month}-01`).setMonth(new Date(`${month}-01`).getMonth() + 1)),
        },
      }
    : {};

  const expenses = await prisma.expense.findMany({
    where,
    include: { branch: { select: { name: true } } },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ expenses });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const expense = await prisma.expense.create({
    data: { ...parsed.data, date: new Date(parsed.data.date) },
  });

  await logAudit({
    userId: session.userId,
    action: "CREATE",
    entityType: "Expense",
    entityId: expense.id,
    newValue: expense,
  });

  return NextResponse.json({ expense }, { status: 201 });
}
