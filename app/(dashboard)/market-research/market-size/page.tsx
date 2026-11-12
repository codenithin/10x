import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/db";
import { MarketSizeClient } from "@/components/market-research/market-size-client";

export default async function MarketSizePage() {
  const org = await requireOrg();
  const sizes = await prisma.marketSize.findMany({
    where: { orgId: org.id },
    orderBy: { createdAt: "desc" },
  });
  return <MarketSizeClient sizes={JSON.parse(JSON.stringify(sizes))} />;
}
