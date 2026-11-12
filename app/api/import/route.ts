import { NextRequest } from "next/server";
import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/db";
import { generateText } from "@/lib/ai";
import Papa from "papaparse";

interface CSVRow {
  [key: string]: string;
}

function normalize(row: CSVRow, keys: string[]): string | undefined {
  for (const k of keys) {
    const found = Object.keys(row).find((rk) => rk.toLowerCase().includes(k.toLowerCase()));
    if (found && row[found]) return row[found];
  }
  return undefined;
}

async function scoreContact(
  contact: { name: string; title?: string; company?: string; industry?: string; employeeCount?: number },
  icp: { name: string; industries: string[]; companySize: string | null; titles: string[]; painPoints: string[] }
): Promise<{ score: number; notes: string }> {
  const prompt = `Score this contact against ICP on 0-100. Respond JSON only: {"score": N, "notes": "..."}

ICP: ${icp.name}
Industries: ${icp.industries.join(", ")}
Size: ${icp.companySize ?? "Any"}
Titles: ${icp.titles.join(", ")}

Contact: ${contact.name}, ${contact.title ?? "?"}, ${contact.company ?? "?"}, ${contact.industry ?? "?"}, ${contact.employeeCount ?? "?"} employees`;

  try {
    const text = await generateText({
      system: "B2B sales expert. Respond with valid JSON only.",
      prompt,
      maxTokens: 150,
    });
    return JSON.parse(text.trim().replace(/```json|```/g, ""));
  } catch {
    return { score: 50, notes: "Could not score automatically" };
  }
}

export async function POST(req: NextRequest) {
  let org;
  try { org = await requireOrg(); } catch { return new Response("Unauthorized", { status: 401 }); }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return Response.json({ error: "No file uploaded" }, { status: 400 });

  const text = await file.text();
  const { data } = Papa.parse<CSVRow>(text, { header: true, skipEmptyLines: true });

  const primaryICP = await prisma.iCP.findFirst({
    where: { orgId: org.id, isPrimary: true },
  }) ?? await prisma.iCP.findFirst({ where: { orgId: org.id } });

  let created = 0;
  const errors: string[] = [];

  for (const row of data.slice(0, 500)) {
    try {
      const name = normalize(row, ["first name", "firstname", "name", "full name"]);
      const lastName = normalize(row, ["last name", "lastname"]);
      const fullName = name && lastName ? `${name} ${lastName}` : name ?? lastName ?? normalize(row, ["contact"]);
      if (!fullName) continue;

      const companyName = normalize(row, ["company", "account", "organization"]);
      const industry = normalize(row, ["industry", "sector"]);
      const employeeCountStr = normalize(row, ["employees", "employee count", "headcount", "company size"]);
      const employeeCount = employeeCountStr ? parseInt(employeeCountStr.replace(/[^0-9]/g, "")) || undefined : undefined;
      const revenueStr = normalize(row, ["revenue", "annual revenue", "arr"]);
      const revenue = revenueStr ? parseFloat(revenueStr.replace(/[^0-9.]/g, "")) || undefined : undefined;

      let companyId: string | undefined;
      if (companyName) {
        let company = await prisma.company.findFirst({ where: { orgId: org.id, name: companyName } });
        if (!company) {
          company = await prisma.company.create({
            data: { orgId: org.id, name: companyName, industry, employeeCount, revenue },
          });
        }
        companyId = company.id;
      }

      const contactData = {
        orgId: org.id,
        name: fullName,
        email: normalize(row, ["email", "e-mail"]),
        phone: normalize(row, ["phone", "mobile", "tel"]),
        title: normalize(row, ["title", "job title", "role", "position"]),
        linkedin: normalize(row, ["linkedin", "profile"]),
        companyId,
        source: "hubspot_import" as const,
      };

      let icpScore: number | undefined;
      let icpNotes: string | undefined;

      if (primaryICP) {
        const scored = await scoreContact(
          { name: fullName, title: contactData.title, company: companyName, industry, employeeCount },
          primaryICP
        );
        icpScore = scored.score;
        icpNotes = scored.notes;
      }

      await prisma.contact.create({ data: { ...contactData, icpScore, icpNotes } });
      created++;
    } catch (e) {
      errors.push(String(e));
    }
  }

  return Response.json({ created, errors: errors.slice(0, 5) });
}
