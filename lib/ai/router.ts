import { OpenAIAdapter } from "./providers/openai-adapter";
import { AnthropicAdapter } from "./providers/anthropic-adapter";
import { GeminiAdapter } from "./providers/gemini-adapter";
import { ModelRegistry } from "./model-registry";
import { ProviderStatusService, ProviderKey } from "./provider-status";
import { WorkspaceService } from "../workspaces/workspace-service";
import {
  ChatChunk,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ExternalModel,
} from "./types";

export interface ResolvedRouteTarget {
  externalModel: ExternalModel;
  routeRole: "primary" | "fallback";
  brandedVersionId?: string;
  brandedDisplayName?: string;
}

export class ModelRouter {
  private static openaiAdapter = new OpenAIAdapter();
  private static anthropicAdapter = new AnthropicAdapter();
  private static geminiAdapter = new GeminiAdapter();

  /**
   * Resolves a client-supplied model ID (branded or direct external) into prioritized route targets.
   */
  static resolveRoutes(
    selectionId: string,
    userPlan: "free" | "pro" | "family" | "enterprise",
    orgId?: string
  ): ResolvedRouteTarget[] {
    // 0. Enforce workspace governance policies and spending caps if in workspace context
    if (orgId) {
      const policy = WorkspaceService.getPolicy(orgId);
      if (policy) {
        if (policy.currentMonthlySpendCents >= policy.maxMonthlySpendCents) {
          throw new Error(
            `[SPEND_LIMIT_EXCEEDED] Workspace monthly spending limit of ₹${(policy.maxMonthlySpendCents / 100).toLocaleString()} reached.`
          );
        }
        if (policy.enforceModelAllowlist && policy.allowedModels && policy.allowedModels.length > 0) {
          const isAllowed = policy.allowedModels.some(
            (allowed) => allowed === selectionId || selectionId.startsWith(allowed)
          );
          if (!isAllowed) {
            throw new Error(
              `[WORKSPACE_POLICY_RESTRICTION] Model '${selectionId}' is prohibited by your workspace governance policy.`
            );
          }
        }
      }
    }

    // 1. Check if selection is an external model ID directly (e.g., "anthropic:claude-3-5-sonnet")
    const directExternal = ModelRegistry.getExternalModel(selectionId);
    if (directExternal) {
      if (userPlan === "free" && directExternal.id !== "openai:gpt-4o-mini") {
        throw new Error(
          `Model '${directExternal.displayName}' requires a Pro or Enterprise subscription.`
        );
      }

      // Check if provider key is configured on this device
      const isConfigured = ProviderStatusService.isConfigured(directExternal.providerKey);
      if (!isConfigured) {
        const configuredProviders = ProviderStatusService.getConfiguredProviders();
        const configuredNames = configuredProviders.map((p) => p === "gemini" ? "Gemini" : p === "openai" ? "OpenAI" : "Anthropic");
        const keyName =
          directExternal.providerKey === "anthropic"
            ? "ANTHROPIC_API_KEY"
            : directExternal.providerKey === "openai"
            ? "OPENAI_API_KEY"
            : "GEMINI_API_KEY";

        const alternativeSuggestion =
          configuredNames.length > 0
            ? ` Configured alternatives available on this device: ${configuredNames.join(", ")}.`
            : ` No AI provider is configured on this device.`;

        throw new Error(
          `[PROVIDER_NOT_CONFIGURED] Provider '${directExternal.providerKey}' is not configured on this device. Set ${keyName} in your .env.local file, restart Nexora, and try again.${alternativeSuggestion}`
        );
      }

      return [
        {
          externalModel: directExternal,
          routeRole: "primary",
        },
      ];
    }

    // 2. Check if selection is a branded family slug (e.g. 'nexora-core' or 'nexora-core@1.0.0')
    let versionId = selectionId;
    if (!selectionId.includes("@")) {
      // Default to version 1.0.0 for family slug
      versionId = `${selectionId}@1.0.0`;
    }

    const brandedVersion = ModelRegistry.getModelVersion(versionId);
    if (!brandedVersion) {
      throw new Error(`Unrecognized model selection: '${selectionId}'.`);
    }

    // Check plan eligibility for branded profile
    if (
      userPlan === "free" &&
      brandedVersion.familySlug !== "nexora-swift" &&
      brandedVersion.familySlug !== "nexora-core"
    ) {
      throw new Error(
        `Nexora profile '${brandedVersion.familySlug}' requires a Pro or Enterprise subscription.`
      );
    }

    const routes = ModelRegistry.getRoutesForVersion(brandedVersion.id);
    if (routes.length === 0) {
      throw new Error(`No active routes configured for '${brandedVersion.id}'.`);
    }

    const targets: ResolvedRouteTarget[] = [];
    for (const route of routes) {
      const extModel = ModelRegistry.getExternalModel(route.externalModelId);
      if (extModel) {
        targets.push({
          externalModel: extModel,
          routeRole: route.routeRole,
          brandedVersionId: brandedVersion.id,
          brandedDisplayName: brandedVersion.familySlug,
        });
      }
    }

    if (targets.length === 0) {
      throw new Error(`No available provider models configured for '${brandedVersion.id}'.`);
    }

    // Filter routes to ONLY providers that are actually configured on this machine
    const configuredKeys = new Set(ProviderStatusService.getConfiguredProviders());
    const configuredTargets = targets.filter((t) => configuredKeys.has(t.externalModel.providerKey));
    const finalTargets = configuredTargets.length > 0 ? configuredTargets : targets;

    // Ensure top prioritized route is primary and subsequent are fallback
    return finalTargets.map((t, idx) => ({
      ...t,
      routeRole: idx === 0 ? "primary" : "fallback",
    }));
  }

  /**
   * Validates whether a direct external model's provider has credentials configured.
   */
  static validateDirectModelConfig(selectionId: string): { valid: boolean; error?: string } {
    const directExternal = ModelRegistry.getExternalModel(selectionId);
    if (!directExternal) {
      return { valid: true };
    }
    const isConfigured = ProviderStatusService.isConfigured(directExternal.providerKey);
    if (!isConfigured) {
      const keyName =
        directExternal.providerKey === "anthropic"
          ? "ANTHROPIC_API_KEY"
          : directExternal.providerKey === "openai"
          ? "OPENAI_API_KEY"
          : "GEMINI_API_KEY";
      return {
        valid: false,
        error: `Provider '${directExternal.providerKey}' is not configured on this device. Set ${keyName} in your .env.local file to use ${directExternal.displayName}.`,
      };
    }
    return { valid: true };
  }

  /**
   * Returns the best default model ID considering plan eligibility and configured providers on this machine.
   */
  static getDefaultModelSelection(userPlan: "free" | "pro" | "family" | "enterprise" = "free"): string {
    const configured = ProviderStatusService.getConfiguredProviders();

    // If Gemini is configured, nexora-core (which routes primarily to Gemini 1.5 Flash) is optimal
    if (configured.includes("gemini")) {
      return "nexora-core";
    }

    // If OpenAI is configured, nexora-core is optimal
    if (configured.includes("openai")) {
      return "nexora-core";
    }

    // If Anthropic is configured
    if (configured.includes("anthropic")) {
      return "nexora-core";
    }

    // Default baseline
    return "nexora-core";
  }

  /**
   * Validates if a requested model supports capability-specific inputs (e.g. Vision, Documents, Web Search).
   */
  static validateRequestCapabilities(
    selectionId: string,
    requirements: { requiresVision?: boolean; requiresDocuments?: boolean; requiresWebSearch?: boolean }
  ): { valid: boolean; reason?: string } {
    let capabilities = ModelRegistry.getExternalModel(selectionId)?.capabilities;

    if (!capabilities) {
      let versionId = selectionId;
      if (!selectionId.includes("@")) {
        versionId = `${selectionId}@1.0.0`;
      }
      capabilities = ModelRegistry.getModelVersion(versionId)?.capabilities;
    }

    if (!capabilities) {
      return { valid: false, reason: `Unrecognized model identity '${selectionId}'.` };
    }

    if (requirements.requiresVision && !capabilities.supportsVision) {
      return {
        valid: false,
        reason: `Model '${selectionId}' does not support image or visual analysis. Switch to 'Nexora Vision' or 'GPT-4o'.`,
      };
    }

    if (requirements.requiresDocuments && !capabilities.supportsDocumentInput) {
      return {
        valid: false,
        reason: `Model '${selectionId}' does not support document attachment analysis.`,
      };
    }

    if (requirements.requiresWebSearch && !capabilities.supportsWebSearch) {
      return {
        valid: false,
        reason: `Model '${selectionId}' does not support live web search grounding.`,
      };
    }

    return { valid: true };
  }

  /**
   * Dispatches streaming completion with automatic fallback support.
   * Never returns fabricated responses; reports transparent diagnostic when all fail.
   */
  static async *streamWithFallback(
    request: ChatCompletionRequest
  ): AsyncIterable<ChatChunk & { modelAttribution: string; providerKey: string }> {
    const targets = this.resolveRoutes(
      request.modelSelectionId,
      request.userPlanId || "free",
      request.orgId
    );
    const configuredProviders = new Set(ProviderStatusService.getConfiguredProviders());

    // Only attempt targets whose provider is genuinely configured
    const candidateTargets = targets.filter(
      (t) => configuredProviders.has(t.externalModel.providerKey) || targets.length === 1
    );

    if (candidateTargets.length === 0) {
      yield {
        id: `err_${Date.now()}`,
        textDelta:
          "[AI Provider Notice: No AI provider is configured on this device. Add a supported provider API key (OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY) to your .env.local file, restart Nexora, and try again.]",
        isComplete: true,
        finishReason: "stop",
        modelAttribution: "Nexora System Notice",
        providerKey: "gemini",
      };
      return;
    }

    let lastError: Error | null = null;
    const attemptedFailures: string[] = [];

    for (const target of candidateTargets) {
      try {
        const adapter =
          target.externalModel.providerKey === "openai"
            ? this.openaiAdapter
            : target.externalModel.providerKey === "gemini"
            ? this.geminiAdapter
            : this.anthropicAdapter;

        const stream = adapter.streamCompletion(
          target.externalModel.providerModelId,
          request.messages,
          {
            temperature: request.temperature,
            maxTokens: request.maxTokens,
          }
        );

        for await (const chunk of stream) {
          yield {
            ...chunk,
            modelAttribution: target.brandedDisplayName || target.externalModel.displayName,
            providerKey: target.externalModel.providerKey,
          };
        }

        // Successfully finished stream
        return;
      } catch (err) {
        lastError = err as Error;
        const { safeMessage } = ProviderStatusService.recordFailure(
          target.externalModel.providerKey,
          err
        );
        attemptedFailures.push(`${target.externalModel.displayName}: ${safeMessage}`);
        console.warn(
          `[ModelRouter] Route failed for ${target.externalModel.id} (${target.routeRole}): ${lastError.message}`
        );
      }
    }

    // Clean, truthful failure notice (never fabricated answers)
    yield {
      id: `fallback_${Date.now()}`,
      textDelta: `[AI Provider Notice: All configured AI model providers encountered an error.\n${attemptedFailures.map((f) => `- ${f}`).join("\n")}\n\nTroubleshooting:\n- If using OpenAI, check billing credits at https://platform.openai.com/settings/organization/billing/.\n- If using Gemini, verify GEMINI_API_KEY in .env.local.\n- If using Anthropic, verify ANTHROPIC_API_KEY in .env.local.]`,
      isComplete: true,
      finishReason: "stop",
      modelAttribution: "Nexora Intelligent Router",
      providerKey: candidateTargets[0]?.externalModel.providerKey || "gemini",
    };
  }

  /**
   * Non-streaming execution with automatic fallback support.
   */
  static async generateWithFallback(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse & { modelAttribution: string }> {
    const targets = this.resolveRoutes(
      request.modelSelectionId,
      request.userPlanId || "free",
      request.orgId
    );
    const configuredProviders = new Set(ProviderStatusService.getConfiguredProviders());

    const candidateTargets = targets.filter(
      (t) => configuredProviders.has(t.externalModel.providerKey) || targets.length === 1
    );

    if (candidateTargets.length === 0) {
      throw new Error(
        "No AI provider is configured on this device. Add a supported provider API key (OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY) to your .env.local file, restart Nexora, and try again."
      );
    }

    let lastError: Error | null = null;
    const attemptedFailures: string[] = [];

    for (const target of candidateTargets) {
      try {
        const adapter =
          target.externalModel.providerKey === "openai"
            ? this.openaiAdapter
            : target.externalModel.providerKey === "gemini"
            ? this.geminiAdapter
            : this.anthropicAdapter;

        const response = await adapter.generateCompletion(
          target.externalModel.providerModelId,
          request.messages,
          {
            temperature: request.temperature,
            maxTokens: request.maxTokens,
          }
        );

        return {
          ...response,
          modelAttribution: target.brandedDisplayName || target.externalModel.displayName,
        };
      } catch (err) {
        lastError = err as Error;
        const { safeMessage } = ProviderStatusService.recordFailure(
          target.externalModel.providerKey,
          err
        );
        attemptedFailures.push(`${target.externalModel.displayName}: ${safeMessage}`);
      }
    }

    throw new Error(
      `All configured AI model providers encountered an error: ${attemptedFailures.join("; ")}`
    );
  }
}
