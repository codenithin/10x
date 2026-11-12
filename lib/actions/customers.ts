"use server";

import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/org";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const CustomerSchema = z.object({
  name: z.string().min(1),
  identifier: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  industry: z.string().optional(),
  notes: z.string().optional(),
});

export async function createCustomer(formData: FormData) {
  const org = await requireOrg();
  const data = CustomerSchema.parse({
    name: formData.get("name"),
    identifier: formData.get("identifier") || undefined,
    website: formData.get("website") || undefined,
    industry: formData.get("industry") || undefined,
    notes: formData.get("notes") || undefined,
  });
  const customer = await prisma.customer.create({ data: { ...data, orgId: org.id } });
  revalidatePath("/market-research/competitors");
  return customer;
}

export async function deleteCustomer(id: string) {
  const org = await requireOrg();
  await prisma.customer.deleteMany({ where: { id, orgId: org.id } });
  revalidatePath("/market-research/competitors");
}

export async function linkCustomerToCompetitor(competitorId: string, customerId: string) {
  const org = await requireOrg();
  // Verify both belong to this org
  const [comp, cust] = await Promise.all([
    prisma.competitor.findFirst({ where: { id: competitorId, orgId: org.id } }),
    prisma.customer.findFirst({ where: { id: customerId, orgId: org.id } }),
  ]);
  if (!comp || !cust) throw new Error("Not found");

  await prisma.competitorCustomer.upsert({
    where: { competitorId_customerId: { competitorId, customerId } },
    create: { competitorId, customerId },
    update: {},
  });
  revalidatePath(`/market-research/competitors/${competitorId}`);
}

export async function unlinkCustomerFromCompetitor(competitorId: string, customerId: string) {
  const org = await requireOrg();
  const comp = await prisma.competitor.findFirst({ where: { id: competitorId, orgId: org.id } });
  if (!comp) throw new Error("Not found");

  await prisma.competitorCustomer.delete({
    where: { competitorId_customerId: { competitorId, customerId } },
  });
  revalidatePath(`/market-research/competitors/${competitorId}`);
}

export async function updateCompetitorNotes(id: string, notes: string) {
  const org = await requireOrg();
  await prisma.competitor.updateMany({
    where: { id, orgId: org.id },
    data: { notes },
  });
  revalidatePath(`/market-research/competitors/${id}`);
}
