import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/db";
import { OKRsClient } from "@/components/goals/okrs-client";

export default async function OKRsPage() {
  const org = await requireOrg();
  const objectives = await prisma.objective.findMany({
    where: { orgId: org.id },
    include: {
      keyResults: {
        include: {
          checkIns: { orderBy: { createdAt: "desc" }, take: 5 },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ year: "desc" }, { quarter: "desc" }, { createdAt: "desc" }],
  });

  return <OKRsClient objectives={JSON.parse(JSON.stringify(objectives))} />;
}
