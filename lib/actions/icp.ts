"use server";

import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/org";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ICPSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  industries: z.string(),
  companySize: z.string().optional(),
  titles: z.string(),
  geographies: z.string().optional(),
  painPoints: z.string(),
  isPrimary: z.boolean().optional(),
});

export async function createICP(formData: FormData) {
  const org = await requireOrg();
  const raw = ICPSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    industries: formData.get("industries") || "",
    companySize: formData.get("companySize") || undefined,
    titles: formData.get("titles") || "",
    geographies: formData.get("geographies") || "",
    painPoints: formData.get("painPoints") || "",
    isPrimary: formData.get("isPrimary") === "true",
  });

  const icp = await prisma.iCP.create({
    data: {
      orgId: org.id,
      name: raw.name,
      description: raw.description,
      industries: raw.industries.split(",").map((s) => s.trim()).filter(Boolean),
      companySize: raw.companySize,
      titles: raw.titles.split(",").map((s) => s.trim()).filter(Boolean),
      geographies: raw.geographies?.split(",").map((s) => s.trim()).filter(Boolean) ?? [],
      painPoints: raw.painPoints.split("\n").map((s) => s.trim()).filter(Boolean),
      isPrimary: raw.isPrimary ?? false,
    },
  });
  revalidatePath("/dashboard/market-research/icp");
  return icp;
}

export async function deleteICP(id: string) {
  const org = await requireOrg();
  await prisma.iCP.deleteMany({ where: { id, orgId: org.id } });
  revalidatePath("/dashboard/market-research/icp");
}
