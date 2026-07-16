import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";

const instructorSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  ratePerSession: z.number().positive(),
  specialty: z.string().optional(),
  branchId: z.string().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const instructors = await prisma.instructor.findMany({
    where: { user: { isActive: true } },
    include: {
      user: { select: { name: true, email: true, phone: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ instructors });
}

// إنشاء مستخدم Instructor جديد + سجل Instructor مرتبط بيه
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const parsed = instructorSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { name, email, password, phone, ratePerSession, specialty, branchId } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "البريد الإلكتروني مستخدم بالفعل" }, { status: 409 });

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      password: hashedPassword,
      role: "INSTRUCTOR",
      branchId,
      instructor: {
        create: { ratePerSession, specialty },
      },
    },
    include: { instructor: true },
  });

  return NextResponse.json({ instructor: user.instructor, user: { id: user.id, name: user.name } }, { status: 201 });
}
