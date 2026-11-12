import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/db";
import { CustomersClient } from "@/components/customers/customers-client";

export default async function CustomersPage() {
  const org = await requireOrg();
  const customers = await prisma.customer.findMany({
    where: { orgId: org.id },
    include: {
      competitors: { include: { competitor: { select: { id: true, name: true, website: true } } } },
    },
    orderBy: { name: "asc" },
  });

  return <CustomersClient customers={JSON.parse(JSON.stringify(customers))} />;
}
