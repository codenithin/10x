import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { CompetitorDetail } from "@/components/market-research/competitor-detail";

export default async function CompetitorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const org = await requireOrg();

  const [competitor, allCustomers] = await Promise.all([
    prisma.competitor.findFirst({
      where: { id, orgId: org.id },
      include: {
        customers: { include: { customer: true } },
      },
    }),
    prisma.customer.findMany({
      where: { orgId: org.id },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!competitor) notFound();

  return (
    <CompetitorDetail
      competitor={JSON.parse(JSON.stringify(competitor))}
      allCustomers={JSON.parse(JSON.stringify(allCustomers))}
    />
  );
}
