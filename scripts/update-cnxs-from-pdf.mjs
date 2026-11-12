import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const CAMPAIGN_NAME = "Stockholm 2026 CNXS";
const CLERK_ORG_ID = "org_3DfV67cMcM4JkyqAlIhHd0C4GYT"; // My Organization

// Each entry: { name, title, company } — company is matched against the
// existing DB Company.name (so we use the CSV spelling, not the PDF spelling
// where it differs, e.g. "ABB AB" vs "ABB").
const ATTENDEES = [
  { name: "Ana Gusanu", title: "Senior Finance Supply Chain Manager", company: "Kenvue" },
  { name: "Angel Magana", title: "Global Category Manager", company: "H&M" },
  { name: "AnnaCarin Lindgren", title: "Head of Supply Chain Planning", company: "Scania CV" },
  { name: "Erik Evers", title: "Head of Sourcing", company: "Mycronc" },
  { name: "Dnyanesh Sarang", title: "Director Strategic Sourcing", company: "Cytiva - Danaher" },
  { name: "Everlyne Lugaliki", title: "Gl8bal Procurement Buyer", company: "Oriflame Cosmetics AB" },
  { name: "Firas Tabbakh", title: "Head of Procurement", company: "Lidl Sverige" },
  { name: "Hanna Skjutare", title: "Head of Indirect Procurement", company: "Länsförsäkringar AB" },
  { name: "Isabelle Elvgren", title: "Head of IT Procurement", company: "SAS" },
  { name: "Janine Ernow", title: "Manager of Procurement Development and Processes", company: "Scandinavian Airlines" },
  { name: "Johan Melkersson", title: "Director Sourcing & Supply Chain", company: "Telia" },
  { name: "Jonas Bränning", title: "Head of IT-Sourcing & Procurement", company: "Martin & Servera AB" },
  { name: "Kavita Paul", title: "Head of Brand Enablement at Procurement excellence", company: "Scania CV AB" },
  { name: "Linus Yu", title: "Head of Site Service Sourcing Expert Unit", company: "Ericsson" },
  { name: "Magnus Henrysson", title: "Associate Purchasing Director EMEAI Indirect", company: "Sherwin-Williams" },
  { name: "Manikandan Prakash", title: "Global Supply Chain Manager", company: "ABB AB" },
  { name: "Mark Gustafson", title: "Sr. Manager, Digital Procurement", company: "Electrolux AB" },
  { name: "Karin Mineur", title: "Buying & Assortment Director", company: "Åhléns AB" }, // NEW
  { name: "Mirela Boldu", title: "Procurement Director PMO", company: "Electrolux" },
  { name: "Nelson Carneiro", title: "Head of Procurement Controlling", company: "Scania Group" },
  { name: "Nicole Dambros", title: "Procurement Analytics Manager", company: "SAS" },
  { name: "Philip Troedsson", title: "Head of Procurement & Facilities", company: "Bonnier News AB" },
  { name: "Rebecka Nylander", title: "Procurement Manager, Mechanics", company: "Saab" },
  { name: "Shazia Hussenbux", title: "Global Head of Product Sustainability and Product Compliance", company: "Dometic" },
  { name: "Valeria Spinazze", title: "Global Supply Chain Manager", company: "Permobil AB" },
  { name: "Vanessa Romell", title: "Category Manager, Tech", company: "Bonnier News AB" },
  { name: "Wisam Tabbakh", title: "Sr IT Procurement Manager", company: "Tobii" },
];

function norm(s) {
  return (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

async function main() {
  const org = await prisma.organization.findUnique({ where: { clerkOrgId: CLERK_ORG_ID } });
  if (!org) throw new Error(`Org not found: ${CLERK_ORG_ID}`);
  console.log(`Org: ${org.name} (${org.id})`);

  const campaign = await prisma.campaign.findFirst({
    where: { orgId: org.id, name: CAMPAIGN_NAME },
    include: {
      companies: { include: { company: { include: { contacts: true } } } },
      contacts: { include: { contact: true } },
    },
  });
  if (!campaign) throw new Error(`Campaign not found: ${CAMPAIGN_NAME}`);
  console.log(`Campaign: ${campaign.name} (${campaign.id})`);
  console.log(`  Currently: ${campaign.companies.length} companies, ${campaign.contacts.length} contacts\n`);

  const matchedContactIds = new Set();
  const matchedCompanyIds = new Set();
  const created = { companies: [], contacts: [] };
  const updated = [];

  for (const att of ATTENDEES) {
    // Find or create company
    let company = await prisma.company.findFirst({
      where: { orgId: org.id, name: att.company },
    });
    if (!company) {
      company = await prisma.company.create({
        data: { orgId: org.id, name: att.company },
      });
      created.companies.push(att.company);
    }
    matchedCompanyIds.add(company.id);

    // Ensure CampaignCompany link
    await prisma.campaignCompany.upsert({
      where: { campaignId_companyId: { campaignId: campaign.id, companyId: company.id } },
      update: {},
      create: { campaignId: campaign.id, companyId: company.id },
    });

    // Find existing contact: scope to this company; if multiple, match by title-substring.
    const candidates = await prisma.contact.findMany({
      where: { orgId: org.id, companyId: company.id },
    });
    let contact = null;
    if (candidates.length === 1) {
      contact = candidates[0];
    } else if (candidates.length > 1) {
      const wantTitle = norm(att.title);
      contact = candidates.find((c) => {
        const t = norm(c.title);
        return t && (t.includes(wantTitle) || wantTitle.includes(t));
      }) ?? null;
    }

    if (contact) {
      // Update if name or title changed
      const nameChanged = contact.name !== att.name;
      const titleChanged = contact.title !== att.title;
      if (nameChanged || titleChanged) {
        await prisma.contact.update({
          where: { id: contact.id },
          data: { name: att.name, title: att.title },
        });
        updated.push(`${contact.name} → ${att.name} (${att.company})`);
      }
      matchedContactIds.add(contact.id);
    } else {
      // No matching contact — create
      const newContact = await prisma.contact.create({
        data: {
          orgId: org.id,
          name: att.name,
          title: att.title,
          companyId: company.id,
          source: CAMPAIGN_NAME,
        },
      });
      await prisma.campaignContact.create({
        data: { campaignId: campaign.id, contactId: newContact.id },
      });
      matchedContactIds.add(newContact.id);
      created.contacts.push(`${att.name} @ ${att.company}`);
    }
  }

  // Dropouts: campaign contacts that are no longer attendees
  const droppedContacts = campaign.contacts
    .filter((cc) => !matchedContactIds.has(cc.contactId))
    .map((cc) => cc.contact);

  const droppedContactIds = droppedContacts.map((c) => c.id);
  if (droppedContactIds.length > 0) {
    await prisma.campaignContact.deleteMany({
      where: { campaignId: campaign.id, contactId: { in: droppedContactIds } },
    });
  }

  // Drop CampaignCompany rows for companies that no longer have any campaign contacts
  const droppedCompanyIds = campaign.companies
    .filter((cc) => !matchedCompanyIds.has(cc.companyId))
    .map((cc) => cc.companyId);
  if (droppedCompanyIds.length > 0) {
    await prisma.campaignCompany.deleteMany({
      where: { campaignId: campaign.id, companyId: { in: droppedCompanyIds } },
    });
  }

  // Final report
  console.log(`Created companies (${created.companies.length}):`);
  created.companies.forEach((c) => console.log(`  + ${c}`));
  console.log(`\nCreated contacts (${created.contacts.length}):`);
  created.contacts.forEach((c) => console.log(`  + ${c}`));
  console.log(`\nUpdated contacts (${updated.length}):`);
  updated.forEach((u) => console.log(`  ~ ${u}`));
  console.log(`\nDropped from campaign — contacts (${droppedContacts.length}):`);
  droppedContacts.forEach((c) => console.log(`  - ${c.name} (${c.title})`));
  console.log(`\nDropped from campaign — companies (${droppedCompanyIds.length}):`);
  for (const id of droppedCompanyIds) {
    const c = await prisma.company.findUnique({ where: { id } });
    console.log(`  - ${c?.name ?? id}`);
  }

  const after = await prisma.campaign.findFirst({
    where: { id: campaign.id },
    include: { _count: { select: { companies: true, contacts: true } } },
  });
  console.log(`\nFinal campaign state: ${after._count.companies} companies, ${after._count.contacts} contacts`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
