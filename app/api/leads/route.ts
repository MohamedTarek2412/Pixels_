import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const leadSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  source: z.enum(["FACEBOOK", "INSTAGRAM", "REFERRAL", "WEBSITE", "WALK_IN"]),
  status: z.enum(["INTERESTED", "CALLED", "TRIAL", "REGISTERED", "LOST"]).default("INTERESTED"),
  assignedEmployeeId: z.string().optional(),
  followUpDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const leads = await prisma.lead.findMany({
    include: { assignedEmployee: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ leads });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { followUpDate, ...rest } = parsed.data;
  const lead = await prisma.lead.create({
    data: { ...rest, followUpDate: followUpDate ? new Date(followUpDate) : undefined },
  });

  await logAudit({
    userId: session.userId,
    action: "CREATE",
    entityType: "Lead",
    entityId: lead.id,
    newValue: lead,
  });

  return NextResponse.json({ lead }, { status: 201 });
}
