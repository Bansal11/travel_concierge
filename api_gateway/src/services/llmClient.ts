/**
 * LLM client wrapping the Anthropic SDK.
 *
 * Responsible for:
 *  - Constructing the RAG prompt from retrieved context chunks.
 *  - Calling Claude with the user query + injected context.
 *  - Enforcing graceful degradation on API timeout or error.
 */
import Anthropic from "@anthropic-ai/sdk";

import { DocumentChunk } from "./embeddingClient.js";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface LlmResponse {
  answer: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
}

export class LlmClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmClientError";
  }
}

const SYSTEM_PROMPT = `You are a knowledgeable and friendly travel concierge specializing in holiday packages.
Answer the user's question using ONLY the provided context. If the context does not contain
enough information to answer, say so clearly — do not hallucinate facts.
Be concise, helpful, and specific about destinations, prices, and inclusions.`;

export class LlmClient {
  private readonly client: Anthropic;

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly maxTokens: number = 1024,
  ) {
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Generate a grounded answer using retrieved context chunks.
   *
   * @param query    Current user query.
   * @param chunks   Re-ranked document chunks from the embedding service.
   * @param history  Prior conversation turns (most recent `maxHistoryTurns`).
   */
  async chat(
    query: string,
    chunks: DocumentChunk[],
    history: Message[] = [],
  ): Promise<LlmResponse> {
    const context = this._buildContext(chunks);

    const userMessage = context
      ? `Context:\n${context}\n\nQuestion: ${query}`
      : query;

    const messages: Anthropic.MessageParam[] = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userMessage },
    ];

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: SYSTEM_PROMPT,
        messages,
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new LlmClientError("LLM returned no text content");
      }

      return {
        answer: textBlock.text,
        model: response.model,
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      };
    } catch (err) {
      if (err instanceof LlmClientError) throw err;
      if (err instanceof Anthropic.APIError) {
        throw new LlmClientError(`Anthropic API error ${err.status}: ${err.message}`);
      }
      throw new LlmClientError(`LLM call failed: ${String(err)}`);
    }
  }

  private _buildContext(chunks: DocumentChunk[]): string {
    if (!chunks.length) return "";
    return chunks
      .map((c, i) => `[${i + 1}] (source: ${c.source})\n${c.content}`)
      .join("\n\n");
  }
}
