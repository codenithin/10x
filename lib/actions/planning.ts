"use server";

import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/org";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CampaignChannel, CampaignStatus } from "@prisma/client";

const CampaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  channel: z.nativeEnum(CampaignChannel),
  status: z.nativeEnum(CampaignStatus).default("PLANNED"),
  budget: z.coerce.number().optional(),
  revenue: z.coerce.number().optional(),
  leads: z.coerce.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function createCampaign(formData: FormData) {
  const org = await requireOrg();
  const data = CampaignSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    channel: formData.get("channel"),
    status: formData.get("status") || "PLANNED",
    budget: formData.get("budget") || undefined,
    revenue: formData.get("revenue") || undefined,
    leads: formData.get("leads") || undefined,
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
  });

  const campaign = await prisma.campaign.create({
    data: {
      ...data,
      orgId: org.id,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
  });
  revalidatePath("/dashboard/planning/campaigns");
  return campaign;
}

export async function updateCampaignStatus(id: string, status: CampaignStatus) {
  const org = await requireOrg();
  await prisma.campaign.updateMany({ where: { id, orgId: org.id }, data: { status } });
  revalidatePath("/dashboard/planning/campaigns");
}

export async function deleteCampaign(id: string) {
  const org = await requireOrg();
  await prisma.campaign.deleteMany({ where: { id, orgId: org.id } });
  revalidatePath("/dashboard/planning/campaigns");
}

async function assertCampaignInOrg(campaignId: string, orgId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, orgId },
    select: { id: true },
  });
  if (!campaign) throw new Error("Campaign not found");
}

export async function addCompaniesToCampaign(campaignId: string, companyIds: string[]) {
  const org = await requireOrg();
  await assertCampaignInOrg(campaignId, org.id);
  if (companyIds.length === 0) return;
  const owned = await prisma.company.findMany({
    where: { id: { in: companyIds }, orgId: org.id },
    select: { id: true },
  });
  await prisma.campaignCompany.createMany({
    data: owned.map((c) => ({ campaignId, companyId: c.id })),
    skipDuplicates: true,
  });
  revalidatePath(`/planning/campaigns/${campaignId}`);
  revalidatePath("/planning/campaigns");
}

export async function removeCompanyFromCampaign(campaignId: string, companyId: string) {
  const org = await requireOrg();
  await assertCampaignInOrg(campaignId, org.id);
  await prisma.campaignCompany.deleteMany({ where: { campaignId, companyId } });
  revalidatePath(`/planning/campaigns/${campaignId}`);
  revalidatePath("/planning/campaigns");
}

export async function addContactsToCampaign(campaignId: string, contactIds: string[]) {
  const org = await requireOrg();
  await assertCampaignInOrg(campaignId, org.id);
  if (contactIds.length === 0) return;
  const owned = await prisma.contact.findMany({
    where: { id: { in: contactIds }, orgId: org.id },
    select: { id: true },
  });
  await prisma.campaignContact.createMany({
    data: owned.map((c) => ({ campaignId, contactId: c.id })),
    skipDuplicates: true,
  });
  revalidatePath(`/planning/campaigns/${campaignId}`);
  revalidatePath("/planning/campaigns");
}

export async function removeContactFromCampaign(campaignId: string, contactId: string) {
  const org = await requireOrg();
  await assertCampaignInOrg(campaignId, org.id);
  await prisma.campaignContact.deleteMany({ where: { campaignId, contactId } });
  revalidatePath(`/planning/campaigns/${campaignId}`);
  revalidatePath("/planning/campaigns");
}
