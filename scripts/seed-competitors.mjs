import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import XLSX from "xlsx";
import { readFileSync } from "fs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Get the first org in the DB (created when user signed in)
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error("No organization found. Sign in to the app first to create one.");
    process.exit(1);
  }
  console.log(`Seeding into org: ${org.name} (${org.id})`);

  // Parse the Excel file
  const wb = XLSX.readFile("docs/Competitor List - Detailed Overview - 2026.xlsx");
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });

  // Skip title row (0) and header row (1)
  const rows = raw.slice(2).filter((r) => r["__EMPTY"]);

  const competitors = rows.map((r) => ({
    name: String(r["__EMPTY"]).trim(),
    website: r["__EMPTY_1"] ? `https://${String(r["__EMPTY_1"]).trim().replace(/^https?:\/\//, "")}` : null,
    positioning: [
      r["__EMPTY_5"] ? String(r["__EMPTY_5"]).trim() : null,
      r["__EMPTY_3"] ? `HQ: ${String(r["__EMPTY_3"]).trim()}` : null,
      r["__EMPTY_4"] && r["__EMPTY_4"] !== "—" ? `Funding: ${String(r["__EMPTY_4"]).trim()}` : null,
      r["__EMPTY_2"] ? `Founded: ${r["__EMPTY_2"]}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    orgId: org.id,
  }));

  // Delete existing competitors for this org before re-seeding
  const existing = await prisma.competitor.count({ where: { orgId: org.id } });
  if (existing > 0) {
    console.log(`Removing ${existing} existing competitors...`);
    await prisma.competitor.deleteMany({ where: { orgId: org.id } });
  }

  // Batch insert
  let created = 0;
  for (const c of competitors) {
    await prisma.competitor.create({ data: c });
    process.stdout.write(`\r  Inserted ${++created}/${competitors.length}: ${c.name}`.padEnd(80));
  }

  console.log(`\n\nDone — ${created} competitors seeded.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
