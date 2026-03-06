import { FastifyInstance } from "fastify";

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    "/health",
    {
      schema: {
        tags: ["ops"],
        summary: "Liveness check",
        response: {
          200: {
            type: "object",
            properties: { status: { type: "string" } },
          },
        },
      },
    },
    async (_req, reply) => {
      reply.send({ status: "ok" });
    },
  );
}
