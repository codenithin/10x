import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/db";
import { ContactDetailClient } from "@/components/crm/contact-detail-client";

export default async function ContactDetailPage(props: PageProps<"/crm/contacts/[id]">) {
  const { id } = await props.params;
  const org = await requireOrg();

  const [contact, companies] = await Promise.all([
    prisma.contact.findFirst({
      where: { id, orgId: org.id },
      include: {
        company: { select: { id: true, name: true } },
        deals: { orderBy: { createdAt: "desc" } },
        campaigns: {
          include: { campaign: { select: { id: true, name: true, channel: true, status: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.company.findMany({
      where: { orgId: org.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!contact) notFound();

  return (
    <ContactDetailClient
      contact={JSON.parse(JSON.stringify(contact))}
      companies={companies}
    />
  );
}
