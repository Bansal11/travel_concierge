/**
 * Packages routes — proxy to the embedding service for admin operations.
 *
 * GET  /api/v1/packages          → list all ingested packages
 * DELETE /api/v1/packages/:source → delete all chunks for a package
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import { EmbeddingClient } from "../services/embeddingClient.js";

export function packageRoutes(embeddingClient: EmbeddingClient) {
  return async (fastify: FastifyInstance): Promise<void> => {
    fastify.get(
      "/api/v1/packages",
      {
        schema: {
          tags: ["packages"],
          summary: "List all ingested packages",
          response: {
            200: {
              type: "object",
              properties: {
                packages: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      source: { type: "string" },
                      chunk_count: { type: "integer" },
                      last_updated: { type: "string", nullable: true },
                    },
                  },
                },
                total: { type: "integer" },
              },
            },
          },
        },
      },
      async (_req: FastifyRequest, reply: FastifyReply) => {
        const result = await embeddingClient.listPackages();
        reply.send(result);
      },
    );

    fastify.delete<{ Params: { "*": string } }>(
      "/api/v1/packages/*",
      {
        schema: {
          tags: ["packages"],
          summary: "Delete a package and all its chunks",
          response: {
            200: {
              type: "object",
              properties: {
                source: { type: "string" },
                chunks_deleted: { type: "integer" },
              },
            },
          },
        },
      },
      async (request: FastifyRequest<{ Params: { "*": string } }>, reply: FastifyReply) => {
        const source = request.params["*"];
        if (!source) {
          reply.status(400).send({ error: "Missing source parameter" });
          return;
        }
        const result = await embeddingClient.deletePackage(source);
        reply.send(result);
      },
    );
  };
}
