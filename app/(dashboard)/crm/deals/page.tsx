import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/db";
import { DealsClient } from "@/components/crm/deals-client";

export default async function DealsPage() {
  const org = await requireOrg();
  const [deals, contacts, companies] = await Promise.all([
    prisma.deal.findMany({
      where: { orgId: org.id },
      include: {
        contact: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contact.findMany({
      where: { orgId: org.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.company.findMany({
      where: { orgId: org.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <DealsClient
      deals={JSON.parse(JSON.stringify(deals))}
      contacts={contacts}
      companies={companies}
    />
  );
}
