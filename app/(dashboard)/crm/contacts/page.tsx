import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/db";
import { ContactsClient } from "@/components/crm/contacts-client";

export default async function ContactsPage() {
  const org = await requireOrg();
  const [contacts, companies] = await Promise.all([
    prisma.contact.findMany({
      where: { orgId: org.id },
      include: { company: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.company.findMany({
      where: { orgId: org.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <ContactsClient
      contacts={JSON.parse(JSON.stringify(contacts))}
      companies={companies}
    />
  );
}
