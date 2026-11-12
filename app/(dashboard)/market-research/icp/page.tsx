import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/db";
import { ICPClient } from "@/components/market-research/icp-client";

export default async function ICPPage() {
  const org = await requireOrg();
  const icps = await prisma.iCP.findMany({
    where: { orgId: org.id },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });

  return <ICPClient icps={JSON.parse(JSON.stringify(icps))} />;
}
