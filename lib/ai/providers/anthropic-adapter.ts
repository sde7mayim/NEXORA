import Anthropic from "@anthropic-ai/sdk";
import { AIProviderAdapter, ChatChunk, ChatCompletionResponse } from "../types";
<<<<<<< HEAD
import { ProviderStatusService } from "../provider-status";
=======
import { ProviderConfig } from "../provider-config";
>>>>>>> 89333307460ebf8ad436d416b73f6472149b6207

export class AnthropicAdapter implements AIProviderAdapter {
  providerKey = "anthropic" as const;
  private client: Anthropic | null = null;
<<<<<<< HEAD
  private lastClientKey: string | null = null;

  private getClient(): Anthropic {
    const apiKey = ProviderStatusService.getApiKey("anthropic");
    if (!apiKey) {
      throw new Error(
        "Anthropic API key is not configured. Set ANTHROPIC_API_KEY in your .env.local file to use Anthropic foundation models."
      );
    }

    if (!this.client || this.lastClientKey !== apiKey) {
      this.client = new Anthropic({ apiKey });
      this.lastClientKey = apiKey;
=======
  private cachedApiKey: string | null = null;

  private getClient(): Anthropic {
    const apiKey = ProviderConfig.getApiKey("anthropic");
    if (!ProviderConfig.isRealKey(apiKey)) {
      throw new Error(
        "Anthropic API key is not configured. Set ANTHROPIC_API_KEY in your local environment (.env.local) to use Anthropic foundation models."
      );
    }

    if (!this.client || this.cachedApiKey !== apiKey) {
      this.client = new Anthropic({ apiKey });
      this.cachedApiKey = apiKey;
>>>>>>> 89333307460ebf8ad436d416b73f6472149b6207
    }

    return this.client;
  }

  async generateCompletion(
    modelId: string,
    messages: Array<{ role: string; content: string }>,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<ChatCompletionResponse> {
    try {
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

<<<<<<< HEAD
      ProviderStatusService.recordSuccess("anthropic");

      const textContent = response.content
        .filter((c) => c.type === "text")
        .map((c) => (c as { text: string }).text)
        .join("");
=======
      const textContent = response.content
        .filter((c) => c.type === "text")
        .map((c) => (c as { text: string }).text)
        .join("");

      ProviderConfig.recordSuccess("anthropic");
>>>>>>> 89333307460ebf8ad436d416b73f6472149b6207

      return {
        id: response.id,
        content: textContent,
        modelUsed: response.model,
        providerKey: "anthropic",
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        finishReason: response.stop_reason || "end_turn",
      };
    } catch (err) {
<<<<<<< HEAD
      ProviderStatusService.recordFailure("anthropic", err);
=======
      ProviderConfig.recordError("anthropic", err);
>>>>>>> 89333307460ebf8ad436d416b73f6472149b6207
      throw err;
    }
  }

  async *streamCompletion(
    modelId: string,
    messages: Array<{ role: string; content: string }>,
    options?: { temperature?: number; maxTokens?: number }
  ): AsyncIterable<ChatChunk> {
    let client: Anthropic;
    try {
      client = this.getClient();
    } catch (err) {
<<<<<<< HEAD
      ProviderStatusService.recordFailure("anthropic", err);
=======
      ProviderConfig.recordError("anthropic", err);
>>>>>>> 89333307460ebf8ad436d416b73f6472149b6207
      throw err;
    }

    const systemMessage = messages.find((m) => m.role === "system")?.content;
    const conversationMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    try {
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
<<<<<<< HEAD
      ProviderStatusService.recordSuccess("anthropic");
=======
      ProviderConfig.recordSuccess("anthropic");
>>>>>>> 89333307460ebf8ad436d416b73f6472149b6207

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
    } catch (err) {
<<<<<<< HEAD
      ProviderStatusService.recordFailure("anthropic", err);
=======
      ProviderConfig.recordError("anthropic", err);
>>>>>>> 89333307460ebf8ad436d416b73f6472149b6207
      throw err;
    }
  }
}
