import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import xlsx from "xlsx";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const CAMPAIGN_NAME = "Two Hundred CPO Event Helsinki May 27";
const CLERK_ORG_ID = "org_3DfV67cMcM4JkyqAlIhHd0C4GYT"; // My Organization
const XLSX_PATH = "docs/Lunch SCM H1 2026 FI.xlsx";

function clean(v) {
  if (v == null) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
}

// Find a company by name, with a fallback to common suffix variants so we don't
// duplicate e.g. "ABB" vs "ABB AB".
async function findCompanyFuzzy(orgId, name) {
  const exact = await prisma.company.findFirst({
    where: { orgId, name: { equals: name, mode: "insensitive" } },
  });
  if (exact) return exact;
  // Try with/without common suffixes
  const stripped = name.replace(/\s+(AB|Oyj|Oy|Group|Holding)$/i, "").trim();
  const variants = new Set([name, stripped, `${stripped} AB`, `${stripped} Oyj`, `${stripped} Oy`]);
  variants.delete(name);
  for (const v of variants) {
    if (!v) continue;
    const hit = await prisma.company.findFirst({
      where: { orgId, name: { equals: v, mode: "insensitive" } },
    });
    if (hit) return hit;
  }
  return null;
}

async function main() {
  const org = await prisma.organization.findUnique({ where: { clerkOrgId: CLERK_ORG_ID } });
  if (!org) throw new Error(`Org not found: ${CLERK_ORG_ID}`);
  console.log(`Org: ${org.name} (${org.id})`);

  const wb = xlsx.readFile(XLSX_PATH);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

  // Find-or-create campaign
  let campaign = await prisma.campaign.findFirst({
    where: { orgId: org.id, name: CAMPAIGN_NAME },
  });
  if (!campaign) {
    campaign = await prisma.campaign.create({
      data: {
        orgId: org.id,
        name: CAMPAIGN_NAME,
        channel: "EVENTS",
        status: "PLANNED",
        description: "Two Hundred CPO Event Helsinki — 27 May 2026 — sourced from Lunch SCM H1 2026 FI roster.",
        startDate: new Date("2026-05-27T00:00:00Z"),
        endDate: new Date("2026-05-27T23:59:59Z"),
      },
    });
  }
  console.log(`Campaign: ${campaign.name} (${campaign.id})`);

  const created = { companies: [], contacts: [] };
  const reused = { companies: [] };
  let skipped = 0;

  for (const row of rows) {
    const firstName = clean(row["First Name"]);
    const lastName = clean(row["Last Name"]);
    const title = clean(row["Job Title"]);
    const companyName = clean(row["Company name"]);
    if (!companyName || (!firstName && !lastName)) {
      skipped++;
      continue;
    }
    const fullName = [firstName, lastName].filter(Boolean).join(" ");

    // Match-or-create company
    let company = await findCompanyFuzzy(org.id, companyName);
    if (!company) {
      company = await prisma.company.create({
        data: { orgId: org.id, name: companyName, country: "Finland" },
      });
      created.companies.push(companyName);
    } else if (company.name.toLowerCase() !== companyName.toLowerCase()) {
      reused.companies.push(`${companyName} → ${company.name}`);
    } else {
      reused.companies.push(company.name);
    }

    // Ensure CampaignCompany link (idempotent)
    await prisma.campaignCompany.upsert({
      where: { campaignId_companyId: { campaignId: campaign.id, companyId: company.id } },
      update: {},
      create: { campaignId: campaign.id, companyId: company.id },
    });

    // Create contact (always — one per attendee row)
    const contact = await prisma.contact.create({
      data: {
        orgId: org.id,
        name: fullName,
        title: title ?? null,
        companyId: company.id,
        source: CAMPAIGN_NAME,
      },
    });
    await prisma.campaignContact.create({
      data: { campaignId: campaign.id, contactId: contact.id },
    });
    created.contacts.push(`${fullName} @ ${company.name}`);
  }

  console.log(`\nNew companies (${created.companies.length}):`);
  created.companies.forEach((c) => console.log(`  + ${c}`));
  console.log(`\nReused companies (${reused.companies.length}):`);
  reused.companies.forEach((c) => console.log(`  ~ ${c}`));
  console.log(`\nCreated contacts (${created.contacts.length}):`);
  created.contacts.forEach((c) => console.log(`  + ${c}`));
  if (skipped) console.log(`\nSkipped rows: ${skipped}`);

  const after = await prisma.campaign.findFirst({
    where: { id: campaign.id },
    include: { _count: { select: { companies: true, contacts: true } } },
  });
  console.log(`\nFinal campaign state: ${after._count.companies} companies, ${after._count.contacts} contacts`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
