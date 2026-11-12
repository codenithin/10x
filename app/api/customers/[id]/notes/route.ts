import { NextRequest } from "next/server";
import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const org = await requireOrg();
    const { notes } = await req.json();
    await prisma.customer.updateMany({
      where: { id, orgId: org.id },
      data: { notes },
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
