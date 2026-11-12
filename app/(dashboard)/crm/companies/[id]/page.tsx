import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/db";
import { CompanyDetailClient } from "@/components/crm/company-detail-client";

export default async function CompanyDetailPage(props: PageProps<"/crm/companies/[id]">) {
  const { id } = await props.params;
  const org = await requireOrg();

  const company = await prisma.company.findFirst({
    where: { id, orgId: org.id },
    include: {
      contacts: { orderBy: { name: "asc" } },
      deals: { orderBy: { createdAt: "desc" } },
      campaigns: {
        include: { campaign: { select: { id: true, name: true, channel: true, status: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!company) notFound();

  return <CompanyDetailClient company={JSON.parse(JSON.stringify(company))} />;
}
