"use server";

import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/org";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const CompetitorSchema = z.object({
  name: z.string().min(1),
  website: z.string().url().optional().or(z.literal("")),
  positioning: z.string().optional(),
  pricing: z.string().optional(),
  strengths: z.string().optional(),
  weaknesses: z.string().optional(),
});

export async function createCompetitor(formData: FormData) {
  const org = await requireOrg();
  const data = CompetitorSchema.parse({
    name: formData.get("name"),
    website: formData.get("website") || undefined,
    positioning: formData.get("positioning") || undefined,
    pricing: formData.get("pricing") || undefined,
    strengths: formData.get("strengths") || undefined,
    weaknesses: formData.get("weaknesses") || undefined,
  });

  const competitor = await prisma.competitor.create({
    data: { ...data, orgId: org.id },
  });
  revalidatePath("/dashboard/market-research/competitors");
  return competitor;
}

export async function updateCompetitor(id: string, formData: FormData) {
  const org = await requireOrg();
  const data = CompetitorSchema.partial().parse({
    name: formData.get("name"),
    website: formData.get("website") || undefined,
    positioning: formData.get("positioning") || undefined,
    pricing: formData.get("pricing") || undefined,
    strengths: formData.get("strengths") || undefined,
    weaknesses: formData.get("weaknesses") || undefined,
  });

  await prisma.competitor.updateMany({
    where: { id, orgId: org.id },
    data,
  });
  revalidatePath("/dashboard/market-research/competitors");
}

export async function deleteCompetitor(id: string) {
  const org = await requireOrg();
  await prisma.competitor.deleteMany({ where: { id, orgId: org.id } });
  revalidatePath("/dashboard/market-research/competitors");
}
