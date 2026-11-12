import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { CustomerDetailClient } from "@/components/customers/customer-detail";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const org = await requireOrg();

  const [customer, allCompetitors] = await Promise.all([
    prisma.customer.findFirst({
      where: { id, orgId: org.id },
      include: {
        competitors: {
          include: {
            competitor: {
              select: { id: true, name: true, website: true, positioning: true },
            },
          },
        },
      },
    }),
    prisma.competitor.findMany({
      where: { orgId: org.id },
      select: { id: true, name: true, website: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!customer) notFound();

  return (
    <CustomerDetailClient
      customer={JSON.parse(JSON.stringify(customer))}
      allCompetitors={JSON.parse(JSON.stringify(allCompetitors))}
    />
  );
}
