import OpenAI from "openai";
import { AIProviderAdapter, ChatChunk, ChatCompletionResponse } from "../types";
import { ProviderStatusService } from "../provider-status";

export class OpenAIAdapter implements AIProviderAdapter {
  providerKey = "openai" as const;
  private client: OpenAI | null = null;
  private lastClientKey: string | null = null;

  private getClient(): OpenAI {
    const apiKey = ProviderStatusService.getApiKey("openai");
    if (!apiKey) {
      throw new Error(
        "OpenAI API key is not configured. Set OPENAI_API_KEY in your .env.local file to use OpenAI foundation models."
      );
    }

    if (!this.client || this.lastClientKey !== apiKey) {
      this.client = new OpenAI({ apiKey });
      this.lastClientKey = apiKey;
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

      const formattedMessages = messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      }));

      const response = await client.chat.completions.create({
        model: modelId,
        messages: formattedMessages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
      });

      ProviderStatusService.recordSuccess("openai");

      const choice = response.choices[0];
      return {
        id: response.id,
        content: choice.message.content || "",
        modelUsed: response.model,
        providerKey: "openai",
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        finishReason: choice.finish_reason || "stop",
      };
    } catch (err) {
      ProviderStatusService.recordFailure("openai", err);
      throw err;
    }
  }

  async *streamCompletion(
    modelId: string,
    messages: Array<{ role: string; content: string }>,
    options?: { temperature?: number; maxTokens?: number }
  ): AsyncIterable<ChatChunk> {
    let client: OpenAI;
    try {
      client = this.getClient();
    } catch (err) {
      ProviderStatusService.recordFailure("openai", err);
      throw err;
    }

    const formattedMessages = messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

    try {
      const stream = await client.chat.completions.create({
        model: modelId,
        messages: formattedMessages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
        stream: true,
        stream_options: { include_usage: true },
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || "";
        const isComplete =
          chunk.choices[0]?.finish_reason !== null && chunk.choices[0]?.finish_reason !== undefined;

        yield {
          id: chunk.id,
          textDelta: delta,
          isComplete,
          finishReason: chunk.choices[0]?.finish_reason || undefined,
          usage: chunk.usage
            ? {
                promptTokens: chunk.usage.prompt_tokens,
                completionTokens: chunk.usage.completion_tokens,
                totalTokens: chunk.usage.total_tokens,
              }
            : undefined,
        };
      }

      ProviderStatusService.recordSuccess("openai");
    } catch (err) {
      ProviderStatusService.recordFailure("openai", err);
      throw err;
    }
  }
}
