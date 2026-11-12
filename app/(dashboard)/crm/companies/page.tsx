import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/db";
import { CompaniesClient } from "@/components/crm/companies-client";

export default async function CompaniesPage() {
  const org = await requireOrg();
  const companies = await prisma.company.findMany({
    where: { orgId: org.id },
    include: {
      _count: { select: { contacts: true, deals: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return <CompaniesClient companies={JSON.parse(JSON.stringify(companies))} />;
}
