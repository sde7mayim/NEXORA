import OpenAI from "openai";
import { AIProviderAdapter, ChatChunk, ChatCompletionResponse } from "../types";
<<<<<<< HEAD
import { ProviderStatusService } from "../provider-status";
=======
import { ProviderConfig } from "../provider-config";
>>>>>>> 89333307460ebf8ad436d416b73f6472149b6207

export class OpenAIAdapter implements AIProviderAdapter {
  providerKey = "openai" as const;
  private client: OpenAI | null = null;
<<<<<<< HEAD
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
=======
  private cachedApiKey: string | null = null;

  private getClient(): OpenAI {
    const apiKey = ProviderConfig.getApiKey("openai");
    if (!ProviderConfig.isRealKey(apiKey)) {
      throw new Error(
        "OpenAI API key is not configured. Set OPENAI_API_KEY in your local environment (.env.local) to use OpenAI foundation models."
      );
    }

    if (!this.client || this.cachedApiKey !== apiKey) {
      this.client = new OpenAI({ apiKey });
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

<<<<<<< HEAD
      ProviderStatusService.recordSuccess("openai");

      const choice = response.choices[0];
=======
      const choice = response.choices[0];
      ProviderConfig.recordSuccess("openai");

>>>>>>> 89333307460ebf8ad436d416b73f6472149b6207
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
<<<<<<< HEAD
      ProviderStatusService.recordFailure("openai", err);
=======
      ProviderConfig.recordError("openai", err);
>>>>>>> 89333307460ebf8ad436d416b73f6472149b6207
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
<<<<<<< HEAD
      ProviderStatusService.recordFailure("openai", err);
=======
      ProviderConfig.recordError("openai", err);
>>>>>>> 89333307460ebf8ad436d416b73f6472149b6207
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

<<<<<<< HEAD
      for await (const chunk of stream) {
=======
      let streamedAny = false;
      for await (const chunk of stream) {
        streamedAny = true;
>>>>>>> 89333307460ebf8ad436d416b73f6472149b6207
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

<<<<<<< HEAD
      ProviderStatusService.recordSuccess("openai");
    } catch (err) {
      ProviderStatusService.recordFailure("openai", err);
=======
      if (streamedAny) {
        ProviderConfig.recordSuccess("openai");
      }
    } catch (err) {
      ProviderConfig.recordError("openai", err);
>>>>>>> 89333307460ebf8ad436d416b73f6472149b6207
      throw err;
    }
  }
}
