import { NextRequest } from "next/server";
import { anthropic, MODEL } from "@/lib/ai";
import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { competitorId, competitorName, website } = await req.json();

  let org;
  try { org = await requireOrg(); } catch { return new Response("Unauthorized", { status: 401 }); }

  const systemPrompt = `You are a B2B market intelligence analyst specializing in competitive analysis for SaaS companies.
Analyze competitors thoroughly and provide structured, actionable intelligence.
Format your response with clear sections using markdown headers.`;

  const userPrompt = `Analyze this competitor for a B2B SaaS company called Nvelop:

Competitor: ${competitorName}
${website ? `Website: ${website}` : ""}

Provide a comprehensive competitive analysis with these exact sections:

## Positioning
What they claim to be and who they target (2-3 sentences).

## Pricing
Their pricing model and tiers (what's known or estimated).

## Strengths
3-5 bullet points of their key competitive advantages.

## Weaknesses
3-5 bullet points of their limitations or vulnerabilities.

## Opportunities for Nvelop
2-3 specific ways Nvelop can win against this competitor.

## Threats to Nvelop
2-3 specific risks this competitor poses to Nvelop's growth.

## Summary
One paragraph executive summary of the competitive threat level and recommended response.`;

  const stream = await anthropic.messages.stream({
    model: MODEL,
    max_tokens: 1500,
    system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userPrompt }],
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      let fullText = "";

      for await (const chunk of stream) {
        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          fullText += chunk.delta.text;
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }

      controller.close();

      // Save to DB after stream completes
      if (competitorId) {
        await prisma.competitor.update({
          where: { id: competitorId },
          data: { aiSummary: fullText, lastAnalyzedAt: new Date() },
        });
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
