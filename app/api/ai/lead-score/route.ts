import { NextRequest } from "next/server";
import { generateText } from "@/lib/ai";
import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { contactId } = await req.json();

  let org;
  try { org = await requireOrg(); } catch { return new Response("Unauthorized", { status: 401 }); }

  const [contact, icps] = await Promise.all([
    prisma.contact.findFirst({
      where: { id: contactId, orgId: org.id },
      include: { company: true },
    }),
    prisma.iCP.findMany({ where: { orgId: org.id } }),
  ]);

  if (!contact) return Response.json({ error: "Contact not found" }, { status: 404 });
  if (icps.length === 0) return Response.json({ error: "No ICPs defined" }, { status: 400 });

  const primaryICP = icps.find((i) => i.isPrimary) ?? icps[0];

  const prompt = `Score this contact against our Ideal Customer Profile (ICP) on a scale of 0-100.

ICP: ${primaryICP.name}
- Industries: ${primaryICP.industries.join(", ") || "Any"}
- Company Size: ${primaryICP.companySize ?? "Any"}
- Target Titles: ${primaryICP.titles.join(", ") || "Any"}
- Geographies: ${primaryICP.geographies.join(", ") || "Any"}
- Pain Points: ${primaryICP.painPoints.join("; ") || "None specified"}

Contact:
- Name: ${contact.name}
- Title: ${contact.title ?? "Unknown"}
- Email: ${contact.email ?? "Unknown"}
- Company: ${contact.company?.name ?? "Unknown"}
- Industry: ${contact.company?.industry ?? "Unknown"}
- Employees: ${contact.company?.employeeCount ?? "Unknown"}
- Revenue: ${contact.company?.revenue ? `$${contact.company.revenue}` : "Unknown"}
- Country: ${contact.company?.country ?? "Unknown"}

Respond in JSON format only:
{
  "score": <0-100>,
  "notes": "<2-3 sentence explanation of the score>"
}`;

  const text = await generateText({
    system: "You are a B2B sales qualification expert. Always respond with valid JSON only.",
    prompt,
    maxTokens: 300,
  });

  let score = null;
  let notes = null;

  try {
    const parsed = JSON.parse(text.trim().replace(/```json|```/g, ""));
    score = parsed.score;
    notes = parsed.notes;
  } catch {
    return Response.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  await prisma.contact.update({
    where: { id: contactId },
    data: { icpScore: score, icpNotes: notes },
  });

  return Response.json({ score, notes });
}
