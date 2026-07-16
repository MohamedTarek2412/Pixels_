import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const itemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().int().min(0),
  available: z.number().int().min(0),
  broken: z.number().int().min(0).default(0),
  lost: z.number().int().min(0).default(0),
  branchId: z.string().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const items = await prisma.inventoryItem.findMany({
    include: { branch: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const parsed = itemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const item = await prisma.inventoryItem.create({ data: parsed.data });
  return NextResponse.json({ item }, { status: 201 });
}
