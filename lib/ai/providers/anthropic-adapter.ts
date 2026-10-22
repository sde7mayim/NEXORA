import Anthropic from "@anthropic-ai/sdk";
import { AIProviderAdapter, ChatChunk, ChatCompletionResponse } from "../types";

export class AnthropicAdapter implements AIProviderAdapter {
  providerKey = "anthropic" as const;
  private client: Anthropic | null = null;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey && apiKey !== "sk-ant-...your-anthropic-key" && !apiKey.startsWith("sk-placeholder")) {
      this.client = new Anthropic({ apiKey });
    }
  }

  private getClient(): Anthropic {
    if (!this.client) {
      throw new Error(
        "Anthropic API key is not configured. Set ANTHROPIC_API_KEY in your environment to use Anthropic foundation models."
      );
    }
    return this.client;
  }

  async generateCompletion(
    modelId: string,
    messages: Array<{ role: string; content: string }>,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<ChatCompletionResponse> {
    const client = this.getClient();

    const systemMessage = messages.find((m) => m.role === "system")?.content;
    const conversationMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const response = await client.messages.create({
      model: modelId,
      max_tokens: options?.maxTokens ?? 2048,
      temperature: options?.temperature ?? 0.7,
      system: systemMessage,
      messages: conversationMessages,
    });

    const textContent = response.content
      .filter((c) => c.type === "text")
      .map((c) => (c as { text: string }).text)
      .join("");

    return {
      id: response.id,
      content: textContent,
      modelUsed: response.model,
      providerKey: "anthropic",
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      finishReason: response.stop_reason || "end_turn",
    };
  }

  async *streamCompletion(
    modelId: string,
    messages: Array<{ role: string; content: string }>,
    options?: { temperature?: number; maxTokens?: number }
  ): AsyncIterable<ChatChunk> {
    const client = this.getClient();

    const systemMessage = messages.find((m) => m.role === "system")?.content;
    const conversationMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const stream = client.messages.stream({
      model: modelId,
      max_tokens: options?.maxTokens ?? 2048,
      temperature: options?.temperature ?? 0.7,
      system: systemMessage,
      messages: conversationMessages,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield {
          id: "stream-delta",
          textDelta: event.delta.text,
          isComplete: false,
        };
      }
    }

    const finalMessage = await stream.finalMessage();
    yield {
      id: finalMessage.id,
      textDelta: "",
      isComplete: true,
      finishReason: finalMessage.stop_reason || "end_turn",
      usage: {
        promptTokens: finalMessage.usage.input_tokens,
        completionTokens: finalMessage.usage.output_tokens,
        totalTokens: finalMessage.usage.input_tokens + finalMessage.usage.output_tokens,
      },
    };
  }
}
