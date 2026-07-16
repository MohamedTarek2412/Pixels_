import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const roomSchema = z.object({
  name: z.string().min(1),
  capacity: z.number().int().positive(),
  branchId: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const parsed = roomSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const room = await prisma.room.create({ data: parsed.data });
  return NextResponse.json({ room }, { status: 201 });
}
