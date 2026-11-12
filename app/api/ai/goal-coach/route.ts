import { NextRequest } from "next/server";
import { anthropic, MODEL } from "@/lib/ai";
import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/db";

export async function POST(_req: NextRequest) {
  let org;
  try { org = await requireOrg(); } catch { return new Response("Unauthorized", { status: 401 }); }

  const objectives = await prisma.objective.findMany({
    where: { orgId: org.id },
    include: {
      keyResults: {
        include: { checkIns: { orderBy: { createdAt: "desc" }, take: 3 } },
      },
    },
  });

  const summary = objectives.map((o) => {
    const krSummaries = o.keyResults.map((kr) => {
      const pct = kr.target > 0 ? Math.round((kr.current / kr.target) * 100) : 0;
      const recent = kr.checkIns.map((ci) => `  - ${ci.value} ${kr.unit} (${ci.note ?? "no note"})`).join("\n");
      return `  KR: ${kr.title}\n  Progress: ${kr.current}/${kr.target} ${kr.unit} (${pct}%)\n  Recent check-ins:\n${recent || "  - None"}`;
    }).join("\n");
    return `Objective: ${o.title} [${o.quarter} ${o.year}]\n${krSummaries}`;
  }).join("\n\n");

  const systemPrompt = `You are an executive coach for a B2B SaaS founder trying to achieve 10x growth.
Be direct, specific, and action-oriented. Focus on what will move the needle most.`;

  const userPrompt = `Review my OKR progress and give me a weekly coaching report:

${summary || "No OKRs defined yet."}

Provide:
1. **Overall assessment** — Are we on track for 10x?
2. **Green flags** — What's working well
3. **Red flags** — What needs urgent attention
4. **Top 3 actions** — The highest-leverage things I should do this week
5. **One bold move** — A single ambitious action that could dramatically accelerate progress

Be concise and direct. This is for a fast-moving founder, not a consultant's report.`;

  const stream = await anthropic.messages.stream({
    model: MODEL,
    max_tokens: 1000,
    system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userPrompt }],
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Transfer-Encoding": "chunked" },
  });
}
