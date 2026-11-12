import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/db";
import { ChannelsClient } from "@/components/planning/channels-client";

export default async function ChannelsPage() {
  const org = await requireOrg();
  const campaigns = await prisma.campaign.findMany({
    where: { orgId: org.id },
    orderBy: { createdAt: "desc" },
  });
  return <ChannelsClient campaigns={JSON.parse(JSON.stringify(campaigns))} />;
}
