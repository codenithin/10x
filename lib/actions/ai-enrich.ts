"use server";

import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "@/lib/ai";
import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/org";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const EnrichmentSchema = z.object({
  website: z.string(),
  industry: z.string(),
  country: z.string(),
  employeeCount: z.string(), // string for transport; coerced to number on apply
  revenue: z.string(),
  description: z.string(),
  sourcingSolution: z.string(),
  sourcingNotes: z.string(),
  erpSolution: z.string(),
  erpNotes: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  sources: z.array(z.string()),
  reasoning: z.string(),
});

export type CompanyEnrichment = z.infer<typeof EnrichmentSchema>;

const SYSTEM_PROMPT = `You are a B2B sales research assistant. You enrich company records with public information.

For each company, research and capture:
- Basic facts: website (canonical homepage URL), industry, HQ country, approximate employee count (latest published), and approximate annual revenue in USD (latest reported, converted if needed).
- A 1-2 sentence neutral description of what the company does.
- Their current procurement / sourcing software (Coupa, Jaggaer, Ivalua, SAP Ariba, etc.)
- Their current ERP system (SAP, Oracle, NetSuite, Workday, Microsoft Dynamics, etc.)

Workflow:
1. Do at most 2-3 web searches. Look for: official "about" / "company" pages, Wikipedia, recent press releases, case studies on vendor websites, job postings mentioning specific systems, LinkedIn company pages. Prefer evidence from the last 2 years for stack info.
2. Once you have enough, IMMEDIATELY call the submit_enrichment tool with your findings. Do not write narrative text — go straight to the tool call.
3. Be honest about uncertainty (the confidence field reflects stack info specifically — basic facts are usually verifiable):
   - confidence = "high": multiple specific sources naming the procurement/ERP vendors.
   - confidence = "medium": one specific source, or strong indicator + adjacent evidence.
   - confidence = "low": pure industry inference, no specific evidence for the stack.
4. If you don't have evidence for a field, pass an EMPTY STRING. Do NOT fabricate.
5. Numeric fields: pass the raw number as a string with no separators (e.g. "60000" not "60,000"; "5000000000" not "$5B"). Use empty string if unknown.
6. In *Notes fields, briefly cite the evidence (e.g. "Aug 2024 SAP case study"). Keep notes to 1-3 sentences.

Always end the turn with a single submit_enrichment tool call.`;

const SUBMIT_TOOL = {
  name: "submit_enrichment",
  description: "Submit the company enrichment findings. Always call this exactly once after you've finished searching.",
  input_schema: {
    type: "object" as const,
    properties: {
      website: { type: "string", description: "Canonical homepage URL (https://...), or empty string" },
      industry: { type: "string", description: "Industry / sector (e.g. 'Aerospace & Defense', 'Retail Apparel'), or empty string" },
      country: { type: "string", description: "Headquarters country, or empty string" },
      employeeCount: { type: "string", description: "Approximate employee count as a plain integer string (e.g. '60000'), or empty string. No separators." },
      revenue: { type: "string", description: "Approximate annual revenue in USD as a plain integer string (e.g. '5000000000'), or empty string. No separators or units." },
      description: { type: "string", description: "1-2 sentence description of what the company does, or empty string" },
      sourcingSolution: { type: "string", description: "Name of their current sourcing/procurement tool, or empty string" },
      sourcingNotes: { type: "string", description: "1-3 sentences with brief citations, or empty string" },
      erpSolution: { type: "string", description: "Name of their current ERP, or empty string" },
      erpNotes: { type: "string", description: "1-3 sentences with brief citations, or empty string" },
      confidence: { type: "string", enum: ["high", "medium", "low"], description: "Confidence in the stack info specifically" },
      sources: { type: "array", items: { type: "string" }, description: "URLs used as evidence" },
      reasoning: { type: "string", description: "Brief 1-2 sentence explanation" },
    },
    required: ["website", "industry", "country", "employeeCount", "revenue", "description", "sourcingSolution", "sourcingNotes", "erpSolution", "erpNotes", "confidence", "sources", "reasoning"],
    additionalProperties: false,
  },
};

export async function enrichCompany(id: string): Promise<CompanyEnrichment> {
  const org = await requireOrg();
  const company = await prisma.company.findFirst({
    where: { id, orgId: org.id },
    select: { name: true, website: true, country: true, industry: true, description: true },
  });
  if (!company) throw new Error("Company not found");

  const userPrompt = `Research this company and return JSON only.

Company: ${company.name}
Website: ${company.website ?? "unknown"}
Country: ${company.country ?? "unknown"}
Industry: ${company.industry ?? "unknown"}${company.description ? `\nExisting notes: ${company.description}` : ""}

Find what they use for procurement / sourcing and for ERP. Web search is available — use it.`;

  // Stream + finalMessage avoids HTTP timeouts on long-running requests.
  // max_uses caps web_search iterations so the model doesn't spiral.
  // submit_enrichment custom tool guarantees structured output instead of relying on prompt JSON.
  const stream = anthropic.messages.stream(
    {
      model: "claude-opus-4-7",
      max_tokens: 2048,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [
        { type: "web_search_20260209", name: "web_search", max_uses: 3 },
        SUBMIT_TOOL,
      ],
      messages: [{ role: "user", content: userPrompt }],
    },
    { timeout: 180_000 },
  );
  const response = await stream.finalMessage();

  const submitCall = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "submit_enrichment",
  );
  if (!submitCall) {
    const textBlocks = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    console.error(
      "[enrich] No submit_enrichment tool call. stop_reason=%s, text=%s",
      response.stop_reason,
      textBlocks.slice(0, 500),
    );
    throw new Error(`AI did not call submit_enrichment. Stop reason: ${response.stop_reason}`);
  }

  try {
    return EnrichmentSchema.parse(submitCall.input);
  } catch (e) {
    console.error("[enrich] submit_enrichment input failed validation:", submitCall.input);
    throw new Error("AI tool output did not match the expected schema.");
  }
}

const ApplyEnrichmentSchema = z.object({
  website: z.string().optional(),
  industry: z.string().optional(),
  country: z.string().optional(),
  employeeCount: z.coerce.number().int().optional(),
  revenue: z.coerce.number().optional(),
  description: z.string().optional(),
  sourcingSolution: z.string().optional(),
  sourcingNotes: z.string().optional(),
  erpSolution: z.string().optional(),
  erpNotes: z.string().optional(),
});

/**
 * Enrich one company and auto-apply only the fields whose current value is empty.
 * Never overwrites existing data. Returns a per-company result for the bulk runner.
 */
export type BulkEnrichResult = {
  companyId: string;
  companyName: string;
  status: "applied" | "no_changes" | "error";
  fieldsApplied?: string[];
  confidence?: "high" | "medium" | "low";
  reasoning?: string;
  error?: string;
};

const ENRICH_FIELD_KEYS = [
  "website",
  "industry",
  "country",
  "employeeCount",
  "revenue",
  "description",
  "sourcingSolution",
  "sourcingNotes",
  "erpSolution",
  "erpNotes",
] as const;

export async function enrichAndApplyCompany(id: string): Promise<BulkEnrichResult> {
  const org = await requireOrg();
  const company = await prisma.company.findFirst({
    where: { id, orgId: org.id },
  });
  if (!company) {
    return { companyId: id, companyName: "?", status: "error", error: "Company not found" };
  }
  try {
    const enrichment = await enrichCompany(id);

    const toApply: Record<string, string> = {};
    for (const key of ENRICH_FIELD_KEYS) {
      const proposed = enrichment[key];
      if (!proposed || typeof proposed !== "string" || proposed.trim() === "") continue;
      const current = company[key as keyof typeof company];
      const isCurrentEmpty =
        current == null ||
        (typeof current === "string" && current.trim() === "") ||
        (typeof current === "number" && current === 0);
      if (isCurrentEmpty) toApply[key] = proposed;
    }

    if (Object.keys(toApply).length === 0) {
      return {
        companyId: id,
        companyName: company.name,
        status: "no_changes",
        confidence: enrichment.confidence,
        reasoning: enrichment.reasoning,
      };
    }

    await applyEnrichment(id, toApply);
    return {
      companyId: id,
      companyName: company.name,
      status: "applied",
      fieldsApplied: Object.keys(toApply),
      confidence: enrichment.confidence,
      reasoning: enrichment.reasoning,
    };
  } catch (e) {
    return {
      companyId: id,
      companyName: company.name,
      status: "error",
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

export async function applyEnrichment(
  id: string,
  fields: Record<string, string>,
) {
  const org = await requireOrg();
  // Drop empty strings so they don't blank out existing values; coerce numerics.
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === "string" && v.trim() !== "") clean[k] = v;
  }
  const data = ApplyEnrichmentSchema.parse(clean);
  if (Object.keys(data).length === 0) return;
  await prisma.company.updateMany({
    where: { id, orgId: org.id },
    data,
  });
  revalidatePath("/crm/companies");
  revalidatePath(`/crm/companies/${id}`);
}
