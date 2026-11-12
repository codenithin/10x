import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const MODEL = "claude-sonnet-4-6";

export async function streamText(params: {
  system: string;
  messages: Anthropic.MessageParam[];
  maxTokens?: number;
}): Promise<ReadableStream> {
  const stream = await anthropic.messages.stream({
    model: MODEL,
    max_tokens: params.maxTokens ?? 2048,
    system: [
      {
        type: "text",
        text: params.system,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: params.messages,
  });

  return new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(new TextEncoder().encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });
}

export async function generateText(params: {
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<string> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: params.maxTokens ?? 2048,
    system: [
      {
        type: "text",
        text: params.system,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: params.prompt }],
  });

  const content = response.content[0];
  return content.type === "text" ? content.text : "";
}
