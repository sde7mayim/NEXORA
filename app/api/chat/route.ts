import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ModelRouter } from "@/lib/ai/router";
import { ModelOrchestrator } from "@/lib/ai/orchestrator";
import { EntitlementEngine } from "@/lib/entitlements/engine";
import { WebResearchService } from "@/lib/research/search-adapter";
import { MemoryService, UserMemoryItem } from "@/lib/memory/memory-service";
import { DocumentParser } from "@/lib/files/document-parser";
import { ConversationDocumentStore } from "@/lib/files/document-store";
import { DocumentRetrievalService } from "@/lib/files/document-retrieval";
import { EntityDetector } from "@/lib/ai/entities/entity-detector";
import { EntityRetrieverService } from "@/lib/ai/entities/entity-retriever";
import { EntityCardData } from "@/lib/ai/entities/entity-types";
import { CreativeDetector } from "@/lib/ai/creative/creative-detector";
import { ImageCreativeService } from "@/lib/ai/creative/image-service";
import { LyricsCreativeService } from "@/lib/ai/creative/lyrics-service";
import { MusicCreativeService } from "@/lib/ai/creative/music-service";
import { AudioCreativeService } from "@/lib/ai/creative/audio-service";
import { CreativeArtifact } from "@/lib/ai/creative/creative-types";

const ChatRequestSchema = z.object({
  modelSelectionId: z.string().min(1),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
      attachments: z
        .array(
          z.object({
            name: z.string(),
            size: z.number().optional(),
            content: z.string().optional(),
            fileId: z.string().optional(),
            mimeType: z.string().optional(),
          })
        )
        .optional(),
      creativeArtifacts: z.array(z.any()).optional(),
    })
  ),
  conversationId: z.string().default("conv-default"),
  files: z
    .array(
      z.object({
        name: z.string(),
        content: z.string().optional(),
        fileId: z.string().optional(),
        size: z.number().optional(),
        mimeType: z.string().optional(),
      })
    )
    .optional(),
  fileContexts: z.array(z.string()).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(16384).optional(),
  includeWebSearch: z.boolean().optional(),
  planTier: z.enum(["free", "pro", "enterprise"]).default("free"),
  userId: z.string().default("usr_anonymous"),
  creativeStudioRequest: z
    .object({
      type: z.enum(["image", "edited-image", "lyrics", "music", "voice", "transcription"]),
      prompt: z.string().optional(),
      options: z.record(z.any()).optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = ChatRequestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      modelSelectionId,
      messages,
      conversationId,
      files,
      temperature,
      maxTokens,
      includeWebSearch,
      planTier,
      userId,
    } = parsed.data;

    // 0. Model Capability Validation
    const capabilityCheck = ModelRouter.validateRequestCapabilities(modelSelectionId, {
      requiresWebSearch: includeWebSearch,
      requiresDocuments: !!(
        (files && files.length > 0) ||
        ConversationDocumentStore.getActiveDocuments(conversationId, userId).length > 0
      ),
    });
    if (!capabilityCheck.valid) {
      return NextResponse.json({ error: capabilityCheck.reason }, { status: 400 });
    }

    // 1. Quota Pre-Check
    const quotaCheck = EntitlementEngine.checkMessageQuota(planTier, {
      dailyMessages: 0,
      monthlyMessages: 0,
    });
    if (!quotaCheck.allowed) {
      return NextResponse.json({ error: quotaCheck.reason }, { status: 429 });
    }

    // 2. Atomic Quota Reservation
    const reservationId = await EntitlementEngine.reserveQuota(userId, "message");

    // 3. Ingest any files passed in the request or in recent message attachments
    const incomingFiles: Array<{ name: string; content?: string; size?: number; mimeType?: string }> = [
      ...(files || []),
    ];

    for (const msg of messages) {
      if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          if (att.content && !incomingFiles.some((f) => f.name.toLowerCase() === att.name.toLowerCase())) {
            incomingFiles.push({
              name: att.name,
              content: att.content,
              size: att.size,
              mimeType: att.mimeType,
            });
          }
        }
      }
    }

    for (const f of incomingFiles) {
      if (f.content && f.content.trim().length > 0) {
        const uint8 = new TextEncoder().encode(f.content);
        const parsedDoc = DocumentParser.parse(uint8, f.name);
        ConversationDocumentStore.addDocument({
          conversationId,
          userId,
          fileName: f.name,
          fileSizeBytes: f.size || f.content.length,
          mimeType: f.mimeType || parsedDoc.mimeType,
          fileType: parsedDoc.fileType,
          fullText: parsedDoc.fullText,
          summary: parsedDoc.summary,
          structure: parsedDoc.structure,
        });
      }
    }

    // 4. Resolve active user prompt and task-intent separation
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    const userPrompt = lastUserMessage?.content || "";

    // 4.0 Early Task-Intent Detection for strict workflow separation
    // (Music generation requests -> Music workflow; Image -> Image; Doc -> Doc; etc.)
    const attachmentsList = (lastUserMessage?.attachments || []).map((a) => ({
      name: a.name,
      mimeType: a.mimeType,
      content: a.content,
    }));
    const historyContext = messages.slice(0, -1).map((m) => ({
      role: m.role,
      content: m.content,
    }));
    const creativeReq = parsed.data.creativeStudioRequest;
    let cType = creativeReq?.type;
    let cPrompt = creativeReq?.prompt || userPrompt;
    let cOptions: Record<string, any> = creativeReq?.options || {};

    if (!cType && lastUserMessage) {
      const cDetect = CreativeDetector.detect(userPrompt, attachmentsList, historyContext);
      if (cDetect.isCreativeIntent && cDetect.creativeType) {
        cType = cDetect.creativeType;
        cPrompt = cDetect.prompt || userPrompt;
        cOptions = cDetect.parameters || {};
      }
    }

    const isCreativeRequest = Boolean(cType);

    // 4.1 Document context processing (Skipped during creative requests to prevent citation leakage)
    const docResult = isCreativeRequest
      ? { mode: "none" as const, targetDocument: null, retrievedSections: [], groundedSystemPrompt: "" }
      : DocumentRetrievalService.processDocumentContext({
          query: userPrompt,
          conversationId,
          userId,
        });

    // 4a. If clarification is needed among multiple ambiguous documents
    if (docResult.mode === "clarification_needed" && docResult.clarificationPrompt) {
      await EntitlementEngine.releaseReservation(reservationId);
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                text: docResult.clarificationPrompt,
                isComplete: true,
                modelUsed: modelSelectionId,
              })}\n\n`
            )
          );
          controller.close();
        },
      });
      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    let contextualMessages = [...messages];
    let researchCitations: Array<{ title: string; url: string; snippet: string }> = [];

    // If a document is active and relevant sections / full document were retrieved, attach grounded context
    if (docResult.targetDocument && docResult.groundedSystemPrompt) {
      contextualMessages.push({
        role: "system",
        content: docResult.groundedSystemPrompt,
      });

      if (docResult.retrievedSections.length > 0) {
        const docCitations = docResult.retrievedSections.slice(0, 3).map((s) => ({
          title: `${docResult.targetDocument!.fileName} - ${s.heading}`,
          url: `#${s.heading.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
          snippet: s.content.slice(0, 250),
        }));
        researchCitations = [...docCitations];
      }
    }

    // 5. Persistent Personal Memory: candidate extraction & safe merge
    let extractedMemoriesSummary: string | null = null;
    if (userPrompt && userId) {
      try {
        const candidates = await MemoryService.extractCandidateMemories(userId, userPrompt, {
          type: "conversation",
          reference: "Active Chat",
        });
        if (candidates.length > 0) {
          const mergedResults = [];
          for (const cand of candidates) {
            const res = await MemoryService.mergeMemoryUpdate(userId, cand);
            mergedResults.push(res);
          }
          const novelOrUpdated = mergedResults.filter(
            (r) => r.action === "created" || r.action === "merged" || r.action === "updated"
          );
          if (novelOrUpdated.length > 0) {
            extractedMemoriesSummary = novelOrUpdated.map((r) => r.memory.summary).join("; ");
          }
        }
      } catch (memExtractErr) {
        console.warn("[MemoryService] Candidate extraction skipped:", memExtractErr);
      }
    }

    // 6. Retrieve relevant memories for the current prompt
    let retrievedMemoriesList: UserMemoryItem[] = [];
    if (userPrompt && userId) {
      try {
        const { contextText, retrievedMemories } = await MemoryService.buildMemoryContext(
          userId,
          userPrompt
        );
        retrievedMemoriesList = retrievedMemories;
        if (contextText) {
          contextualMessages.push({
            role: "system",
            content: contextText,
          });
        }
      } catch (memRetrieveErr) {
        console.warn("[MemoryService] Context retrieval skipped:", memRetrieveErr);
      }
    }

    // 7. Base System Instruction
    const baseSystemPrompt = `You are Nexora, an advanced, highly knowledgeable, and articulate AI assistant created to provide ChatGPT Plus and Gemini Advanced level intelligence.

CORE RESPONSE GUIDELINES:
1. DEPTH & FIDELITY:
   - Provide comprehensive, thorough, and in-depth answers. Do NOT give brief or superficial 1-2 sentence answers unless the user explicitly requests brevity.
   - Structure answers clearly using markdown: use clear section headers (###), bullet points, bold key terms, and numbered steps where appropriate.
   - When an uploaded document is present in context, adhere strictly to the document directives: preserve technical criteria, module priorities, and facts faithfully.
   - When asked for a specific detail, comparison, extraction, or explanation, answer that EXACT question. Do NOT force every document question into a summary format.
   - If the requested detail is not specified in the document, clearly state: "This information is not specified in the uploaded document."

2. RELEVANCE & ACCURACY:
   - Deeply analyze and answer the exact question the user asks.
   - Never output meta-commentary, excuses, or disclaimers about cut-off dates.
   - When persistent memory context about the user is present, answer directly without requiring them to repeat details.`;

    const existingSystemIdx = contextualMessages.findIndex((m) => m.role === "system");
    if (existingSystemIdx >= 0) {
      contextualMessages[existingSystemIdx] = {
        role: "system",
        content: baseSystemPrompt + "\n\n" + contextualMessages[existingSystemIdx].content,
      };
    } else {
      contextualMessages.unshift({
        role: "system",
        content: baseSystemPrompt,
      });
    }

    // 8. Live Web Research (strictly isolated: never runs for creative generation or document Q&A unless requested)
    const isLiveQuery =
      Boolean(includeWebSearch) ||
      (!isCreativeRequest &&
        !docResult.targetDocument &&
        /\b(current weather|live score|breaking news|live price|today's weather|what is the weather)\b/i.test(
          userPrompt
        ));

    if (isLiveQuery && lastUserMessage) {
      try {
        const searchResults = await WebResearchService.searchWeb(lastUserMessage.content);
        if (searchResults.length > 0) {
          researchCitations = [...researchCitations, ...searchResults];
          const citationsText = searchResults
            .map((r, i) => `[Verified Live Data ${i + 1}] ${r.title}\n${r.snippet}`)
            .join("\n\n");

          contextualMessages.push({
            role: "system",
            content: `VERIFIED REAL-TIME LIVE DATA FOR USER QUERY:\n\n${citationsText}\n\nPresent this verified live information directly, clearly, and naturally in response to the user's question without any disclaimers.`,
          });
        }
      } catch (searchError) {
        console.warn("[WebResearch] Search skipped:", searchError);
      }
    }

    // 8.5. Intelligent Entity Detection & Multimodal Retrieval (Normal Chat only)
    // Strictly bypassed during creative generation (music, lyrics, image) or document Q&A to prevent unrelated cards (e.g. "The Omen")
    let retrievedEntityCards: EntityCardData[] = [];
    if (!isCreativeRequest && !docResult.targetDocument && lastUserMessage && (!files || files.length === 0)) {
      try {
        const detection = EntityDetector.detect(lastUserMessage.content, historyContext);
        if (detection.isEntityQuery) {
          if (detection.comparisonEntities && detection.comparisonEntities.length > 1) {
            for (const ent of detection.comparisonEntities) {
              const subCard = await EntityRetrieverService.retrieveEntity({
                isEntityQuery: true,
                entityName: ent,
                category: detection.category,
              });
              if (subCard) retrievedEntityCards.push(subCard);
            }
          } else {
            const card = await EntityRetrieverService.retrieveEntity(detection);
            if (card) retrievedEntityCards.push(card);
          }
        }
      } catch (entityErr) {
        console.warn("[App] Entity detection error:", entityErr);
      }
    }

    if (retrievedEntityCards.length > 0) {
      const entitySummaries = retrievedEntityCards
        .map((c) => {
          let specText = "";
          if (c.specGroups) {
            specText = c.specGroups
              .map(
                (g) =>
                  `${g.groupName}:\n${g.specs.map((s) => `  - ${s.label}: ${s.value}`).join("\n")}`
              )
              .join("\n");
          } else if (c.quickFacts) {
            specText = c.quickFacts.map((f) => `  - ${f.label}: ${f.value}`).join("\n");
          }
          return `=== VERIFIED ENTITY CARD: ${c.name} (${c.category.toUpperCase()}) ===\nSubtitle: ${c.subtitle || ""}\nOverview: ${c.description || ""}\n${specText}\n${c.pros ? `Pros:\n${c.pros.map((p) => `  + ${p}`).join("\n")}\n` : ""}${c.cons ? `Cons:\n${c.cons.map((cn) => `  - ${cn}`).join("\n")}\n` : ""}${c.attractions ? `Attractions:\n${c.attractions.map((a) => `  * ${a}`).join("\n")}\n` : ""}`;
        })
        .join("\n\n");

      contextualMessages.push({
        role: "system",
        content: `VERIFIED ENTITY SPECIFICATIONS & DETAILS:\n\n${entitySummaries}\n\nIMPORTANT CONVERSATIONAL DIRECTIVES:\n- Answer the user's conversational question naturally and accurately based on these verified facts and specifications.\n- A rich interactive visual card with verified photographs, full spec tables, and pros/cons is automatically rendered alongside your answer.\n- Keep your conversational reply engaging, insightful, and directly responsive to their question without unnecessarily re-dumping raw markdown tables that duplicate the card.`,
      });
    }

    // 8.6. Intelligent Creative Studio Engine (Image, Edit, Lyrics, Music, Voice, Audio)
    let retrievedCreativeArtifacts: CreativeArtifact[] = [];
    if (lastUserMessage && isCreativeRequest && cType) {
      try {
        if (cType === "image") {
          const art = cOptions.isVariation
            ? await ImageCreativeService.generateVariation({
                prompt: cPrompt || "High resolution visual",
                aspectRatio: cOptions.aspectRatio || "1:1",
                style: cOptions.style,
                seed: cOptions.seed,
                variationInstruction: cOptions.variationInstruction as string,
                provider: cOptions.provider,
              })
            : await ImageCreativeService.generateImage({
                prompt: cPrompt || "High resolution visual",
                aspectRatio: cOptions.aspectRatio || "1:1",
                style: cOptions.style,
                seed: cOptions.seed,
                provider: cOptions.provider,
                quality: cOptions.quality || "standard",
              });
          retrievedCreativeArtifacts.push(art);
        } else if (cType === "edited-image") {
          const firstImg = (lastUserMessage.attachments || []).find((a) =>
            a.mimeType?.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(a.name)
          );

          let origUrl = cOptions.originalImageUrl || firstImg?.content;

          // If no image in current turn, check if the previous message had a generated image
          if (!origUrl && messages.length >= 2) {
            for (let i = messages.length - 2; i >= 0; i--) {
              const prevMsg = messages[i];
              const prevArt = (prevMsg as any).creativeArtifacts?.find(
                (a: any) => a.type === "image" || a.type === "edited-image"
              );
              if (prevArt?.mediaUrl) {
                origUrl = prevArt.mediaUrl;
                break;
              }
            }
          }

          if (!origUrl) {
            // No image exists to edit — return clear request to upload an image
            const noImageArt: CreativeArtifact = {
              id: `art_edit_missing_${Date.now()}`,
              type: "edited-image",
              title: "Image Upload Required for Editing",
              subtitle: "Attach or generate an image first",
              status: "failed",
              errorMessage: "Please upload or attach an image to perform this edit (such as background removal, background replacement, or color grading).",
              createdAt: new Date().toISOString(),
              imageMetadata: {
                prompt: cPrompt || "Edit image",
                aspectRatio: "1:1",
                provider: "Nexora Image Processor",
                editInstruction: cPrompt || "Edit image",
                editOperation: cOptions.operation || cOptions.editOperation || "remove-bg",
              },
            };
            retrievedCreativeArtifacts.push(noImageArt);
          } else {
            const art = await ImageCreativeService.editImage({
              originalImageUrl: origUrl,
              instruction: cPrompt || cOptions.instruction || "Enhance image",
              operation: cOptions.operation || cOptions.editOperation || "remove-bg",
              targetBackground: cOptions.targetBackground,
              aspectRatio: cOptions.aspectRatio || "1:1",
            });
            retrievedCreativeArtifacts.push(art);
          }
        } else if (cType === "lyrics") {
          const art = await LyricsCreativeService.generateLyrics({
            theme: cPrompt || cOptions.theme || "Love and hope",
            language: cOptions.language || "English",
            genre: cOptions.genre || "Romantic Melody",
            mood: cOptions.mood || "Love",
            vocalStyle: cOptions.vocalStyle || "Duet",
            songLength: cOptions.songLength || "standard",
          });
          retrievedCreativeArtifacts.push(art);
        } else if (cType === "music") {
          const art = await MusicCreativeService.generateMusic({
            prompt: cPrompt || "Romantic melody soundtrack",
            genre: cOptions.genre || "Tamil Melody",
            mood: cOptions.mood || "Romantic",
            lyricsSnippet: cOptions.lyricsSnippet,
            fullExactLyrics: cOptions.fullExactLyrics,
            keySignature: cOptions.keySignature,
            vocalStyle: cOptions.vocalStyle,
            instruments: cOptions.instruments,
            isInstrumental: cOptions.isInstrumental ?? (cOptions.vocalStyle === "Instrumental"),
            tempoBpm: cOptions.tempoBpm || 88,
            durationSeconds: cOptions.durationSeconds || 28,
            provider: cOptions.provider,
          });
          retrievedCreativeArtifacts.push(art);
        } else if (cType === "voice") {
          const art = await AudioCreativeService.generateVoice({
            text: cPrompt || "Welcome to Nexora Creative Studio.",
            voiceName: cOptions.voiceName || "nova",
            speed: cOptions.speed || 1.0,
          });
          retrievedCreativeArtifacts.push(art);
        } else if (cType === "transcription") {
          const firstAudio = (lastUserMessage.attachments || []).find((a) =>
            a.mimeType?.startsWith("audio/") || /\.(mp3|wav|ogg|m4a)$/i.test(a.name)
          );
          const art = await AudioCreativeService.transcribeAudio({
            audioBase64: cOptions.audioBase64 || firstAudio?.content,
            fileName: firstAudio?.name || "audio-recording.wav",
          });
          retrievedCreativeArtifacts.push(art);
        }

        if (retrievedCreativeArtifacts.length > 0) {
            const art = retrievedCreativeArtifacts[0];
            if (art.status === "failed") {
              contextualMessages.push({
                role: "system",
                content: `NEXORA CREATIVE STUDIO STATUS:\n- Attempted Artifact Type: ${art.type}\n- Status: FAILED (${art.errorMessage || "Provider not configured"})\n\nIMPORTANT CONVERSATIONAL DIRECTIVES:\n- An honest error notice is displayed to the user above your chat response.\n- Inform the user clearly and courteously about the configuration status: "${art.errorMessage || "Creative provider is not configured"}".\n- For image requests: guide them that OPENAI_API_KEY (DALL-E 3) or REPLICATE_API_TOKEN (FLUX) can be configured in .env.local, or to retry with Pollinations AI.\n- For music requests: guide them that SUNO_API_KEY or REPLICATE_API_TOKEN can be configured in .env.local, or the built-in synthesizer can be used.\n- For editing requests: guide them to attach or provide the image they wish to edit.\n- Never pretend media was generated, never fabricate fake URLs, and never describe non-existent playback or images.`,
              });
            } else if (art.type === "image" || art.type === "edited-image") {
              contextualMessages.push({
                role: "system",
                content: `NEXORA CREATIVE STUDIO OUTPUT:\n- Generated Artifact Type: ${art.type}\n- Title: "${art.title}"\n- Description/Subtitle: ${art.subtitle || ""}\n\nCRITICAL CONVERSATIONAL DIRECTIVES FOR GENERATED IMAGE:\n- The actual generated image is displayed directly in the visual artifact card above your chat response.\n- Provide ONLY a brief, polite single-sentence caption (for example: "Here is your ${art.title || "image"}."). \n- DO NOT output design concepts, design tips, typography advice, sample prompts for Midjourney/DALL-E, or lengthy explanations. The generated image is the primary response.`,
              });
            } else {
              contextualMessages.push({
                role: "system",
                content: `NEXORA CREATIVE STUDIO OUTPUT:\n- Generated Artifact Type: ${art.type}\n- Title: "${art.title}"\n- Description/Subtitle: ${art.subtitle || ""}\n\nIMPORTANT CONVERSATIONAL DIRECTIVES:\n- An interactive visual player/card for this ${art.type} is rendered directly above your chat response.\n- Provide an engaging, insightful, and supportive conversational summary celebrating the creation, detailing its artistic nuances, mood, musical key/genre or visual highlights, and invite the user to iterate, change parameters, or download their result.`,
              });
            }
          }
      } catch (creativeErr) {
        console.warn("[App] Creative generation error:", creativeErr);
      }
    }

    // 9. Stream AI response with intelligent model orchestrator
    const orchestration = await ModelOrchestrator.orchestrateStream({
      modelSelectionId,
      messages: contextualMessages,
      temperature,
      maxTokens,
      userId,
      userPlanId: planTier,
      fileContexts: docResult.targetDocument ? [docResult.targetDocument.fileName] : undefined,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Send initial metadata: correlation ID, active document disclosure, and fallback status
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "metadata",
                correlationId: orchestration.correlationId,
                actualModel: orchestration.actualModelId,
                fallbackTriggered: orchestration.fallbackTriggered,
                memoryCount: retrievedMemoriesList.length,
                newlyLearned: extractedMemoriesSummary,
                activeDocument: docResult.targetDocument
                  ? {
                      id: docResult.targetDocument.id,
                      fileName: docResult.targetDocument.fileName,
                      version: docResult.targetDocument.version,
                      intent: docResult.intent,
                      mode: docResult.mode,
                    }
                  : null,
              })}\n\n`
            )
          );

          // If entity cards exist, send them as entityCards event
          if (retrievedEntityCards.length > 0) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "entityCards", entityCards: retrievedEntityCards })}\n\n`
              )
            );
          }

          // If creative artifacts exist, send them as creativeArtifacts event
          if (retrievedCreativeArtifacts.length > 0) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "creativeArtifacts", creativeArtifacts: retrievedCreativeArtifacts })}\n\n`
              )
            );
          }

          // If citations exist, send them as citations event
          if (researchCitations.length > 0) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "citations", citations: researchCitations })}\n\n`
              )
            );
          }

          for await (const chunk of orchestration.stream) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  text: chunk.textDelta,
                  isComplete: chunk.isComplete,
                  modelUsed: orchestration.actualModelId,
                  provider: orchestration.providerKey,
                  usage: chunk.usage,
                })}\n\n`
              )
            );
          }

          // Reconcile reservation on success
          await EntitlementEngine.reconcileReservation(reservationId);
          controller.close();
        } catch (err) {
          await EntitlementEngine.releaseReservation(reservationId);
          const errorMsg = (err as Error).message || "Streaming failed";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}
