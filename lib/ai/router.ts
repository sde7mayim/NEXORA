import { OpenAIAdapter } from "./providers/openai-adapter";
import { AnthropicAdapter } from "./providers/anthropic-adapter";
import { ModelRegistry } from "./model-registry";
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

  /**
   * Resolves a client-supplied model ID (branded or direct external) into prioritized route targets.
   */
  static resolveRoutes(
    selectionId: string,
    userPlan: "free" | "pro" | "enterprise",
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

    // 1. Check if selection is an external model ID directly
    const directExternal = ModelRegistry.getExternalModel(selectionId);
    if (directExternal) {
      if (userPlan === "free" && directExternal.id !== "openai:gpt-4o-mini") {
        throw new Error(
          `Model '${directExternal.displayName}' requires a Pro or Enterprise subscription.`
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

    return targets;
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
   */
  static async *streamWithFallback(
    request: ChatCompletionRequest
  ): AsyncIterable<ChatChunk & { modelAttribution: string; providerKey: string }> {
    const targets = this.resolveRoutes(request.modelSelectionId, request.userPlanId, request.orgId);

    let lastError: Error | null = null;

    for (const target of targets) {
      try {
        const adapter =
          target.externalModel.providerKey === "openai"
            ? this.openaiAdapter
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

        // Successfully finished stream with this target
        return;
      } catch (err) {
        lastError = err as Error;
        console.warn(
          `[ModelRouter] Route failed for ${target.externalModel.id} (${target.routeRole}): ${lastError.message}. Attempting fallback if available.`
        );
      }
    }

    throw new Error(
      `All available routes for '${request.modelSelectionId}' failed. Details: ${lastError?.message || "Unknown error"}`
    );
  }

  /**
   * Non-streaming execution with automatic fallback support.
   */
  static async generateWithFallback(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse & { modelAttribution: string }> {
    const targets = this.resolveRoutes(request.modelSelectionId, request.userPlanId, request.orgId);

    let lastError: Error | null = null;

    for (const target of targets) {
      try {
        const adapter =
          target.externalModel.providerKey === "openai"
            ? this.openaiAdapter
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
        console.warn(
          `[ModelRouter] Non-streaming route failed for ${target.externalModel.id}: ${lastError.message}.`
        );
      }
    }

    throw new Error(
      `All available routes for '${request.modelSelectionId}' failed: ${lastError?.message}`
    );
  }
}
