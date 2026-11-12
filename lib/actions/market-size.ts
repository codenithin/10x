"use server";

import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/org";
import { revalidatePath } from "next/cache";
import { generateText } from "@/lib/ai";
import { z } from "zod";

const MarketSizeSchema = z.object({
  segment: z.string().min(1),
  tam: z.coerce.number().optional(),
  sam: z.coerce.number().optional(),
  som: z.coerce.number().optional(),
  year: z.coerce.number().default(2026),
  notes: z.string().optional(),
});

export async function createMarketSize(formData: FormData) {
  const org = await requireOrg();
  const data = MarketSizeSchema.parse({
    segment: formData.get("segment"),
    tam: formData.get("tam") || undefined,
    sam: formData.get("sam") || undefined,
    som: formData.get("som") || undefined,
    year: formData.get("year") || 2026,
    notes: formData.get("notes") || undefined,
  });

  const ms = await prisma.marketSize.create({ data: { ...data, orgId: org.id } });
  revalidatePath("/dashboard/market-research/market-size");
  return ms;
}

export async function generateMarketSizeAI(id: string, segment: string, notes?: string) {
  const org = await requireOrg();

  const text = await generateText({
    system: "You are a B2B market research analyst. Provide concise, data-driven market sizing analysis.",
    prompt: `Estimate the market size for the following segment and explain your methodology:

Segment: ${segment}
${notes ? `Additional context: ${notes}` : ""}

Provide:
1. TAM (Total Addressable Market) estimate in USD
2. SAM (Serviceable Addressable Market) estimate in USD
3. SOM (Serviceable Obtainable Market) for a startup — realistic 3-year capture
4. Key assumptions and data sources
5. Growth rate (CAGR)

Be specific with numbers and cite reasoning.`,
    maxTokens: 800,
  });

  await prisma.marketSize.updateMany({
    where: { id, orgId: org.id },
    data: { aiSummary: text },
  });

  revalidatePath("/dashboard/market-research/market-size");
  return text;
}

export async function deleteMarketSize(id: string) {
  const org = await requireOrg();
  await prisma.marketSize.deleteMany({ where: { id, orgId: org.id } });
  revalidatePath("/dashboard/market-research/market-size");
}
