import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const studentSchema = z.object({
  fullName: z.string().min(2),
  age: z.number().int().positive().optional(),
  birthDate: z.string().optional(),
  school: z.string().optional(),
  guardianName: z.string().optional(),
  fatherPhone: z.string().optional(),
  motherPhone: z.string().optional(),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  photoUrl: z.string().optional(),
  branchId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const branchId = searchParams.get("branchId") || undefined;
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = 20;

  const where = {
    isActive: true,
    ...(branchId ? { branchId } : {}),
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" as const } },
            { fatherPhone: { contains: search } },
            { motherPhone: { contains: search } },
          ],
        }
      : {}),
  };

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        enrollments: { include: { course: true } },
        payments: { orderBy: { createdAt: "desc" }, take: 3 },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.student.count({ where }),
  ]);

  return NextResponse.json({ students, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const parsed = studentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const student = await prisma.student.create({
    data: {
      ...parsed.data,
      birthDate: parsed.data.birthDate ? new Date(parsed.data.birthDate) : undefined,
    },
  });

  await logAudit({
    userId: session.userId,
    action: "CREATE",
    entityType: "Student",
    entityId: student.id,
    newValue: student,
  });

  return NextResponse.json({ student }, { status: 201 });
}
