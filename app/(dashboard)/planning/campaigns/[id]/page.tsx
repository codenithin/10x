import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/db";
import { CampaignDetailClient } from "@/components/planning/campaign-detail-client";

export default async function CampaignDetailPage(props: PageProps<"/planning/campaigns/[id]">) {
  const { id } = await props.params;
  const org = await requireOrg();

  const campaign = await prisma.campaign.findFirst({
    where: { id, orgId: org.id },
    include: {
      companies: {
        include: { company: true },
        orderBy: { createdAt: "asc" },
      },
      contacts: {
        include: { contact: { include: { company: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!campaign) notFound();

  const memberCompanyIds = new Set(campaign.companies.map((c) => c.companyId));
  const memberContactIds = new Set(campaign.contacts.map((c) => c.contactId));

  const [allCompanies, allContacts] = await Promise.all([
    prisma.company.findMany({
      where: { orgId: org.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.contact.findMany({
      where: { orgId: org.id },
      select: {
        id: true,
        name: true,
        title: true,
        company: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const availableCompanies = allCompanies.filter((c) => !memberCompanyIds.has(c.id));
  const availableContacts = allContacts.filter((c) => !memberContactIds.has(c.id));

  return (
    <CampaignDetailClient
      campaign={JSON.parse(JSON.stringify(campaign))}
      availableCompanies={availableCompanies}
      availableContacts={JSON.parse(JSON.stringify(availableContacts))}
    />
  );
}
