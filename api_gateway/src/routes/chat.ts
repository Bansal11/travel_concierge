/**
 * Chat routes — the primary user-facing API.
 *
 * POST /api/v1/chat
 *   1. Calls EmbeddingClient to retrieve relevant context chunks.
 *   2. Injects context into the LLM prompt via LlmClient.
 *   3. Returns the grounded answer with source citations.
 *
 * POST /api/v1/ingest
 *   Proxy to the embedding service ingest endpoint.
 *   Useful for admin tooling without exposing the internal service directly.
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import { EmbeddingClient } from "../services/embeddingClient.js";
import { LlmClient, Message } from "../services/llmClient.js";

interface ChatBody {
  query: string;
  history?: Message[];
  top_n?: number;
}

interface IngestBody {
  content: string;
  source: string;
  doc_type?: "markdown" | "json";
  metadata?: Record<string, unknown>;
}

export function chatRoutes(
  embeddingClient: EmbeddingClient,
  llmClient: LlmClient,
) {
  return async (fastify: FastifyInstance): Promise<void> => {
    fastify.post<{ Body: ChatBody }>(
      "/api/v1/chat",
      {
        schema: {
          tags: ["chat"],
          summary: "Chat with the travel concierge",
          description:
            "Two-stage RAG: embed query → HNSW KNN top-K → CrossEncoder re-rank top-N → Claude generation.",
          body: {
            type: "object",
            required: ["query"],
            properties: {
              query: { type: "string", minLength: 1, description: "Natural-language question" },
              history: {
                type: "array",
                items: {
                  type: "object",
                  required: ["role", "content"],
                  properties: {
                    role: { type: "string", enum: ["user", "assistant"] },
                    content: { type: "string" },
                  },
                },
                description: "Prior conversation turns for multi-turn context",
              },
              top_n: { type: "integer", minimum: 1, maximum: 10, default: 3, description: "Context chunks to inject (1–10)" },
            },
          },
          response: {
            200: {
              description: "Grounded answer with source citations",
              type: "object",
              properties: {
                answer: { type: "string" },
                sources: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      source: { type: "string" },
                      score: { type: "number" },
                    },
                  },
                },
                latency: {
                  type: "object",
                  properties: {
                    retrieval_ms: { type: "number" },
                    rerank_ms: { type: "number" },
                  },
                },
                usage: {
                  type: "object",
                  properties: {
                    model: { type: "string" },
                    input_tokens: { type: "integer" },
                    output_tokens: { type: "integer" },
                  },
                },
              },
            },
            503: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      async (request: FastifyRequest<{ Body: ChatBody }>, reply: FastifyReply) => {
        const { query, history = [], top_n = 3 } = request.body;

        // Stage 1: retrieve relevant context
        const retrieval = await embeddingClient.query(query, top_n);

        // Stage 2: generate grounded answer
        const llmResponse = await llmClient.chat(query, retrieval.chunks, history);

        reply.send({
          answer: llmResponse.answer,
          sources: retrieval.chunks.map((c) => ({ id: c.id, source: c.source, score: c.score })),
          latency: {
            retrieval_ms: retrieval.retrieval_latency_ms,
            rerank_ms: retrieval.rerank_latency_ms,
          },
          usage: {
            model: llmResponse.model,
            input_tokens: llmResponse.input_tokens,
            output_tokens: llmResponse.output_tokens,
          },
        });
      },
    );

    fastify.post<{ Body: IngestBody }>(
      "/api/v1/ingest",
      {
        schema: {
          tags: ["packages"],
          summary: "Ingest a document into the vector store",
          description: "Parses, chunks (sliding window O(N)), embeds, and batch-inserts a document.",
          body: {
            type: "object",
            required: ["content", "source"],
            properties: {
              content: { type: "string", minLength: 1, description: "Raw document text" },
              source: { type: "string", minLength: 1, description: "Unique document identifier" },
              doc_type: { type: "string", enum: ["markdown", "json"], default: "markdown" },
              metadata: { type: "object", additionalProperties: true },
            },
          },
          response: {
            200: {
              description: "Chunks stored successfully",
              type: "object",
              properties: {
                chunks_stored: { type: "integer" },
                source: { type: "string" },
              },
            },
            503: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      async (request: FastifyRequest<{ Body: IngestBody }>, reply: FastifyReply) => {
        const { content, source, doc_type = "markdown", metadata = {} } = request.body;
        const result = await embeddingClient.ingest(content, source, doc_type, metadata);
        reply.send(result);
      },
    );
  };
}
