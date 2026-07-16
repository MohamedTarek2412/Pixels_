import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  status: z.enum(["INTERESTED", "CALLED", "TRIAL", "REGISTERED", "LOST"]).optional(),
  notes: z.string().optional(),
  followUpDate: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { followUpDate, ...rest } = parsed.data;
  const before = await prisma.lead.findUnique({ where: { id } });

  const lead = await prisma.lead.update({
    where: { id },
    data: { ...rest, followUpDate: followUpDate ? new Date(followUpDate) : undefined },
  });

  await logAudit({
    userId: session.userId,
    action: "UPDATE",
    entityType: "Lead",
    entityId: id,
    oldValue: before,
    newValue: lead,
  });

  return NextResponse.json({ lead });
}
