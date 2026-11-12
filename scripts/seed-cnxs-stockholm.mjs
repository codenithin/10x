import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const CAMPAIGN_NAME = "Stockholm 2026 CNXS";
const CSV_PATH = "docs/Nvelop.AI - Intel Report - Intel Report.csv";

function clean(v) {
  if (v == null) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
}

async function main() {
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error("No org found. Sign in first.");
    process.exit(1);
  }
  console.log(`Seeding into org: ${org.name}`);

  const raw = readFileSync(CSV_PATH, "utf8");
  // Skip the 2-line preamble (title + blank); header is on line 3.
  const lines = raw.split(/\r?\n/);
  const csvBody = lines.slice(2).join("\n");
  const rows = parse(csvBody, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
  });

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
        description: "CNXS Enterprise Procurement Stockholm — sourced from Intel Report.",
      },
    });
  }
  console.log(`Campaign: ${campaign.name} (${campaign.id})`);

  const companyByName = new Map();
  let companiesCreated = 0;
  let companiesReused = 0;
  let contactsCreated = 0;

  for (const row of rows) {
    const companyName = clean(row["Company"]);
    const position = clean(row["Position"]);
    if (!companyName || !position) continue;

    const c1 = clean(row["Challenge 1"]);
    const c2 = clean(row["Challenge 2"]);
    const c3 = clean(row["Challenge 3"]);

    let company = companyByName.get(companyName);
    if (!company) {
      const existing = await prisma.company.findFirst({
        where: { orgId: org.id, name: companyName },
      });
      if (existing) {
        company = existing;
        companiesReused++;
      } else {
        company = await prisma.company.create({
          data: { orgId: org.id, name: companyName },
        });
        companiesCreated++;
      }
      companyByName.set(companyName, company);

      await prisma.campaignCompany.upsert({
        where: { campaignId_companyId: { campaignId: campaign.id, companyId: company.id } },
        update: {},
        create: { campaignId: campaign.id, companyId: company.id },
      });
    }

    const icpNotes = [
      c1 && `Challenge 1: ${c1}`,
      c2 && `Challenge 2: ${c2}`,
      c3 && `Challenge 3: ${c3}`,
    ].filter(Boolean).join("\n") || null;

    const contact = await prisma.contact.create({
      data: {
        orgId: org.id,
        name: `Unknown – ${position}`,
        title: position,
        companyId: company.id,
        source: CAMPAIGN_NAME,
        icpNotes,
      },
    });
    contactsCreated++;

    await prisma.campaignContact.create({
      data: { campaignId: campaign.id, contactId: contact.id },
    });
  }

  console.log(`Companies: ${companiesCreated} created, ${companiesReused} reused.`);
  console.log(`Contacts: ${contactsCreated} created.`);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
