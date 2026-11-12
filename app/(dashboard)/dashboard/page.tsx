import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/db";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const org = await requireOrg();

  const [dealStats, contactCount, companyCount, competitorCount, objectives, campaigns] =
    await Promise.all([
      prisma.deal.groupBy({
        by: ["stage"],
        where: { orgId: org.id },
        _sum: { value: true },
        _count: true,
      }),
      prisma.contact.count({ where: { orgId: org.id } }),
      prisma.company.count({ where: { orgId: org.id } }),
      prisma.competitor.count({ where: { orgId: org.id } }),
      prisma.objective.findMany({
        where: { orgId: org.id },
        include: { keyResults: { include: { checkIns: { orderBy: { createdAt: "desc" }, take: 1 } } } },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      prisma.campaign.findMany({
        where: { orgId: org.id, status: "ACTIVE" },
        take: 5,
        orderBy: { updatedAt: "desc" },
      }),
    ]);

  type DealStat = (typeof dealStats)[number];
  const wonRevenue = dealStats.find((d: DealStat) => d.stage === "CLOSED_WON")?._sum.value ?? 0;
  const pipelineValue = dealStats
    .filter((d: DealStat) => !["CLOSED_WON", "CLOSED_LOST"].includes(d.stage))
    .reduce((sum: number, d: DealStat) => sum + (d._sum.value ?? 0), 0);

  return (
    <DashboardClient
      wonRevenue={wonRevenue}
      pipelineValue={pipelineValue}
      contactCount={contactCount}
      companyCount={companyCount}
      competitorCount={competitorCount}
      objectives={JSON.parse(JSON.stringify(objectives))}
      campaigns={JSON.parse(JSON.stringify(campaigns))}
    />
  );
}
