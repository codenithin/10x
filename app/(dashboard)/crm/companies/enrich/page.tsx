import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/db";
import { CompaniesEnrichClient } from "@/components/crm/companies-enrich-client";

export default async function CompaniesEnrichPage() {
  const org = await requireOrg();
  const companies = await prisma.company.findMany({
    where: { orgId: org.id },
    select: {
      id: true,
      name: true,
      website: true,
      industry: true,
      country: true,
      employeeCount: true,
      revenue: true,
      description: true,
      sourcingSolution: true,
      sourcingNotes: true,
      erpSolution: true,
      erpNotes: true,
    },
    orderBy: { name: "asc" },
  });
  return <CompaniesEnrichClient companies={JSON.parse(JSON.stringify(companies))} />;
}
