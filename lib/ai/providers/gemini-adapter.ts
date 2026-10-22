import { AIProviderAdapter, ChatChunk, ChatCompletionResponse } from "../types";

export class GeminiAdapter implements AIProviderAdapter {
  providerKey = "gemini" as const;
  private apiKey: string | null = null;

  constructor() {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (key && !key.includes("...your-gemini-api-key")) {
      this.apiKey = key.trim();
    }
  }

  private getApiKey(): string {
    const key = this.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!key || key.includes("...your-gemini-api-key")) {
      throw new Error(
        "Gemini API key is not configured. Set GEMINI_API_KEY or GOOGLE_API_KEY in your environment."
      );
    }
    return key.trim();
  }

  async generateCompletion(
    modelId: string,
    messages: Array<{ role: string; content: string }>,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<ChatCompletionResponse> {
    const apiKey = this.getApiKey();

    const systemMessage = messages.find((m) => m.role === "system");
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const cleanModel = modelId.replace(/^(google:|gemini:)/, "") || "gemini-1.5-flash";

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;

    const body: Record<string, any> = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 2048,
      },
    };

    if (systemMessage) {
      body.systemInstruction = {
        parts: [{ text: systemMessage.content }],
      };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.map((p: any) => p.text).join("") || "";
    const promptTokens = data.usageMetadata?.promptTokenCount || 0;
    const completionTokens = data.usageMetadata?.candidatesTokenCount || 0;

    return {
      id: `gemini_${Date.now()}`,
      content: text,
      modelUsed: cleanModel,
      providerKey: "gemini",
      promptTokens,
      completionTokens,
      finishReason: candidate?.finishReason || "stop",
    };
  }

  async *streamCompletion(
    modelId: string,
    messages: Array<{ role: string; content: string }>,
    options?: { temperature?: number; maxTokens?: number }
  ): AsyncIterable<ChatChunk> {
    const response = await this.generateCompletion(modelId, messages, options);
    const words = response.content.split(" ");

    for (let i = 0; i < words.length; i++) {
      const text = (i === 0 ? "" : " ") + words[i];
      const isComplete = i === words.length - 1;
      yield {
        id: response.id,
        textDelta: text,
        isComplete,
        finishReason: isComplete ? response.finishReason : undefined,
        usage: isComplete
          ? {
              promptTokens: response.promptTokens,
              completionTokens: response.completionTokens,
              totalTokens: response.promptTokens + response.completionTokens,
            }
          : undefined,
      };
    }
  }
}
