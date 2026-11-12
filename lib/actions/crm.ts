"use server";

import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/org";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DealStage } from "@prisma/client";

// ── Contacts ──────────────────────────────────────────────────────────────────

const ContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  title: z.string().optional(),
  linkedin: z.string().optional(),
  companyId: z.string().optional(),
  icpScore: z.coerce.number().optional(),
  icpNotes: z.string().optional(),
  source: z.string().optional(),
});

function parseContactForm(formData: FormData) {
  return ContactSchema.parse({
    name: formData.get("name"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    title: formData.get("title") || undefined,
    linkedin: formData.get("linkedin") || undefined,
    companyId: formData.get("companyId") || undefined,
    icpScore: formData.get("icpScore") || undefined,
    icpNotes: formData.get("icpNotes") || undefined,
    source: formData.get("source") || undefined,
  });
}

export async function createContact(formData: FormData) {
  const org = await requireOrg();
  const data = parseContactForm(formData);
  const contact = await prisma.contact.create({ data: { ...data, orgId: org.id } });
  revalidatePath("/crm/contacts");
  return contact;
}

export async function updateContact(id: string, formData: FormData) {
  const org = await requireOrg();
  const data = parseContactForm(formData);
  await prisma.contact.updateMany({ where: { id, orgId: org.id }, data });
  revalidatePath("/crm/contacts");
  revalidatePath(`/crm/contacts/${id}`);
}

export async function deleteContact(id: string) {
  const org = await requireOrg();
  await prisma.contact.deleteMany({ where: { id, orgId: org.id } });
  revalidatePath("/crm/contacts");
}

// ── Companies ─────────────────────────────────────────────────────────────────

const CompanySchema = z.object({
  name: z.string().min(1),
  website: z.string().url().optional().or(z.literal("")),
  industry: z.string().optional(),
  employeeCount: z.coerce.number().optional(),
  revenue: z.coerce.number().optional(),
  country: z.string().optional(),
  description: z.string().optional(),
  sourcingSolution: z.string().optional(),
  sourcingNotes: z.string().optional(),
  erpSolution: z.string().optional(),
  erpNotes: z.string().optional(),
});

function parseCompanyForm(formData: FormData) {
  return CompanySchema.parse({
    name: formData.get("name"),
    website: formData.get("website") || undefined,
    industry: formData.get("industry") || undefined,
    employeeCount: formData.get("employeeCount") || undefined,
    revenue: formData.get("revenue") || undefined,
    country: formData.get("country") || undefined,
    description: formData.get("description") || undefined,
    sourcingSolution: formData.get("sourcingSolution") || undefined,
    sourcingNotes: formData.get("sourcingNotes") || undefined,
    erpSolution: formData.get("erpSolution") || undefined,
    erpNotes: formData.get("erpNotes") || undefined,
  });
}

export async function createCompany(formData: FormData) {
  const org = await requireOrg();
  const data = parseCompanyForm(formData);
  const company = await prisma.company.create({ data: { ...data, orgId: org.id } });
  revalidatePath("/crm/companies");
  return company;
}

export async function updateCompany(id: string, formData: FormData) {
  const org = await requireOrg();
  const data = parseCompanyForm(formData);
  await prisma.company.updateMany({ where: { id, orgId: org.id }, data });
  revalidatePath("/crm/companies");
  revalidatePath(`/crm/companies/${id}`);
}

export async function deleteCompany(id: string) {
  const org = await requireOrg();
  await prisma.company.deleteMany({ where: { id, orgId: org.id } });
  revalidatePath("/crm/companies");
}

// ── Deals ─────────────────────────────────────────────────────────────────────

const DealSchema = z.object({
  name: z.string().min(1),
  value: z.coerce.number().default(0),
  stage: z.nativeEnum(DealStage).default("PROSPECT"),
  closeDate: z.string().optional(),
  notes: z.string().optional(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
});

export async function createDeal(formData: FormData) {
  const org = await requireOrg();
  const data = DealSchema.parse({
    name: formData.get("name"),
    value: formData.get("value") || 0,
    stage: formData.get("stage") || "PROSPECT",
    closeDate: formData.get("closeDate") || undefined,
    notes: formData.get("notes") || undefined,
    contactId: formData.get("contactId") || undefined,
    companyId: formData.get("companyId") || undefined,
  });
  const deal = await prisma.deal.create({
    data: {
      ...data,
      orgId: org.id,
      closeDate: data.closeDate ? new Date(data.closeDate) : undefined,
    },
  });
  revalidatePath("/dashboard/crm/deals");
  return deal;
}

export async function updateDealStage(id: string, stage: DealStage) {
  const org = await requireOrg();
  await prisma.deal.updateMany({ where: { id, orgId: org.id }, data: { stage } });
  revalidatePath("/dashboard/crm/deals");
}

export async function deleteDeal(id: string) {
  const org = await requireOrg();
  await prisma.deal.deleteMany({ where: { id, orgId: org.id } });
  revalidatePath("/dashboard/crm/deals");
}
