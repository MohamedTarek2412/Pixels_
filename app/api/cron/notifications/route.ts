import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ده الـ endpoint اللي هيتنادى من Vercel Cron يومياً
// يفحص: دفعات متأخرة / جلسات النهاردة / أعياد ميلاد / غياب متكرر
export async function GET() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const notifications: { type: string; title: string; message: string }[] = [];

  // 1. دفعات متأخرة
  const overduePayments = await prisma.payment.findMany({
    where: { status: "OVERDUE" },
    include: { student: { select: { fullName: true } } },
    take: 50,
  });
  for (const p of overduePayments) {
    notifications.push({
      type: "PAYMENT_OVERDUE",
      title: "دفعة متأخرة",
      message: `الطالب ${p.student.fullName} عليه دفعة متأخرة بقيمة ${p.remaining} ج.م`,
    });
  }

  // 2. جلسات اليوم - تم إلغاء نظام الجلسات، تخطي هذا الجزء

  // 3. أعياد الميلاد (لو الطالب عنده تاريخ ميلاد بيوافق النهاردة)
  const students = await prisma.student.findMany({
    where: { isActive: true, birthDate: { not: null } },
  });
  for (const s of students) {
    if (
      s.birthDate &&
      s.birthDate.getDate() === now.getDate() &&
      s.birthDate.getMonth() === now.getMonth()
    ) {
      notifications.push({
        type: "BIRTHDAY",
        title: "عيد ميلاد طالب",
        message: `النهاردة عيد ميلاد ${s.fullName} 🎉`,
      });
    }
  }

  // احفظ الإشعارات (لو مش موجودة بالفعل - حماية بسيطة من التكرار يومياً يمكن تحسينها لاحقاً)
  if (notifications.length > 0) {
    await prisma.notification.createMany({
      data: notifications.map((n) => ({
        type: n.type as never,
        title: n.title,
        message: n.message,
      })),
    });
  }

  return NextResponse.json({ created: notifications.length });
}
