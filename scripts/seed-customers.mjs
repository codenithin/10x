import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function clean(v) {
  return v && v.trim() !== "" ? v.trim() : null;
}

function parseRevenue(v) {
  if (!v || v.trim() === "" || v.trim() === '""') return null;
  const n = parseFloat(v.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? null : n;
}

function parseEmployees(v) {
  if (!v || v.trim() === "") return null;
  const n = parseInt(v.replace(/[^0-9]/g, ""));
  return isNaN(n) ? null : n;
}

async function main() {
  const org = await prisma.organization.findFirst();
  if (!org) { console.error("No org found. Sign in first."); process.exit(1); }
  console.log(`Seeding into org: ${org.name}`);

  const csv = readFileSync("docs/apollo-accounts-export.csv", "utf8");
  const rows = parse(csv, { columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true });

  // Clear existing
  const existing = await prisma.customer.count({ where: { orgId: org.id } });
  if (existing > 0) {
    console.log(`Removing ${existing} existing customers...`);
    // Keep competitor links — just delete customers (cascade will handle CompetitorCustomer)
    await prisma.customer.deleteMany({ where: { orgId: org.id } });
  }

  let created = 0;
  for (const row of rows) {
    const name = clean(row["Company Name"]);
    if (!name) continue;

    // Generate a clean identifier: first 3 letters of name + last 4 of Apollo ID
    const apolloId = clean(row["Apollo Account Id"]) ?? "";
    const identifier = name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() +
      (apolloId ? "-" + apolloId.slice(-4).toUpperCase() : "");

    // Clean up description — remove newlines for storage
    const desc = clean(row["Short Description"])?.replace(/\r?\n/g, " ").replace(/\s+/g, " ") ?? null;

    const website = clean(row["Website"]);

    await prisma.customer.create({
      data: {
        orgId: org.id,
        name,
        identifier,
        website,
        industry: clean(row["Industry"]),
        employees: parseEmployees(row["# Employees"]),
        country: clean(row["Company Country"]),
        city: clean(row["Company City"]),
        phone: clean(row["Company Phone"]),
        annualRevenue: parseRevenue(row["Annual Revenue"]),
        foundedYear: parseRevenue(row["Founded Year"]),
        logoUrl: clean(row["Logo Url"]),
        linkedinUrl: clean(row["Company Linkedin Url"]),
        accountOwner: clean(row["Account Owner"]),
        accountStage: clean(row["Account Stage"]),
        description: desc,
      },
    });

    process.stdout.write(`\r  [${++created}/${rows.length}] ${name}`.padEnd(80));
  }

  console.log(`\n\nDone — ${created} customers seeded.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
