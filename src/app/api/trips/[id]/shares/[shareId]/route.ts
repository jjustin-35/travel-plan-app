import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/db/prisma";

type Params = { params: Promise<{ id: string; shareId: string }> };

// DELETE /api/trips/[id]/shares/[shareId] — deactivate a share link
export async function DELETE(_req: Request, { params }: Params) {
  const { shareId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const share = await prisma.tripShare.findFirst({
    where: { id: shareId, createdBy: user.id },
  });
  if (!share) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.tripShare.update({
    where: { id: shareId },
    data: { isActive: false },
  });

  return NextResponse.json({ ok: true });
}
