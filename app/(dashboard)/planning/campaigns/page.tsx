import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/db";
import { CampaignsClient } from "@/components/planning/campaigns-client";

export default async function CampaignsPage() {
  const org = await requireOrg();
  const campaigns = await prisma.campaign.findMany({
    where: { orgId: org.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { companies: true, contacts: true } },
    },
  });
  return <CampaignsClient campaigns={JSON.parse(JSON.stringify(campaigns))} />;
}
