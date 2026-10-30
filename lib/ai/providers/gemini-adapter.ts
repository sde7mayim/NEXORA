import { AIProviderAdapter, ChatChunk, ChatCompletionResponse } from "../types";
import { ProviderStatusService } from "../provider-status";

export class GeminiAdapter implements AIProviderAdapter {
  providerKey = "gemini" as const;

  private getApiKey(): string {
    const key = ProviderStatusService.getApiKey("gemini");
    if (!key) {
      throw new Error(
        "Gemini API key is not configured. Set GEMINI_API_KEY or GOOGLE_API_KEY in your .env.local file to use Gemini models."
      );
    }
    return key;
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

    // Resolve target model ID to official verified Google Generative AI model identifiers
    const rawId = modelId.replace(/^(google:|gemini:)/i, "").toLowerCase().trim();
    let primaryModel = "gemini-3.5-flash";
    if (rawId.includes("pro")) {
      primaryModel = "gemini-3.1-pro-preview";
    } else if (rawId.includes("lite")) {
      primaryModel = "gemini-3.5-flash-lite";
    }

    // Verified active models on Google Generative AI API (with fallback order)
    const candidateModels = Array.from(
      new Set([
        primaryModel,
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-3.1-pro-preview",
      ])
    );

    let lastError: Error | null = null;
    let data: any = null;
    let usedModel = primaryModel;

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

    for (const m of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errText = await res.text();
          let parsedMsg = errText;
          try {
            const parsed = JSON.parse(errText);
            if (parsed.error && parsed.error.message) {
              parsedMsg = parsed.error.message;
            }
          } catch {}

          const error = new Error(`Gemini API error (${res.status}): ${parsedMsg}`);
          (error as any).status = res.status;
          throw error;
        }

        const resData = await res.json();
        if (resData.candidates && resData.candidates.length > 0) {
          data = resData;
          usedModel = m;
          break;
        } else {
          throw new Error(`Gemini returned empty candidates: ${JSON.stringify(resData)}`);
        }
      } catch (err) {
        lastError = err as Error;
        const msg = (err as Error).message || "";
        const status = (err as any)?.status;
        if (
          status === 401 ||
          status === 403 ||
          msg.includes("401") ||
          msg.includes("API_KEY_INVALID") ||
          /api_key/i.test(msg)
        ) {
          break;
        }
      }
    }

    if (!data) {
      const finalErr = lastError || new Error("Gemini failed to generate response across candidate models.");
      ProviderStatusService.recordFailure("gemini", finalErr);
      throw finalErr;
    }

    ProviderStatusService.recordSuccess("gemini");

    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("") || "";
    const promptTokens = data.usageMetadata?.promptTokenCount || 0;
    const completionTokens = data.usageMetadata?.candidatesTokenCount || 0;

    return {
      id: `gemini_${Date.now()}`,
      content: text,
      modelUsed: usedModel,
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
    try {
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
    } catch (err) {
      ProviderStatusService.recordFailure("gemini", err);
      throw err;
    }
  }
}
