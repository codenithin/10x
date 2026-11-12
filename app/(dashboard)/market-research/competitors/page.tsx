import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/db";
import { CompetitorsClient } from "@/components/market-research/competitors-client";

export default async function CompetitorsPage() {
  const org = await requireOrg();

  const [competitors, customers] = await Promise.all([
    prisma.competitor.findMany({
      where: { orgId: org.id },
      include: { customers: { include: { customer: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({
      where: { orgId: org.id },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <CompetitorsClient
      competitors={JSON.parse(JSON.stringify(competitors))}
      customers={JSON.parse(JSON.stringify(customers))}
    />
  );
}
