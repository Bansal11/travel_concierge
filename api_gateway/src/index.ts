/**
 * API Gateway entry point.
 *
 * Wires together:
 *  - Fastify (high-concurrency I/O-optimised HTTP server)
 *  - CORS middleware
 *  - EmbeddingClient (HTTP → Python embedding service)
 *  - LlmClient (Anthropic SDK)
 *  - Chat and health routes
 *  - Centralised error handler
 *  - OpenTelemetry (Node auto-instrumentation)
 */
import Fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

import { config } from "./config.js";
import { EmbeddingClient } from "./services/embeddingClient.js";
import { LlmClient } from "./services/llmClient.js";
import { chatRoutes } from "./routes/chat.js";
import { healthRoutes } from "./routes/health.js";
import { packageRoutes } from "./routes/packages.js";
import { errorHandler } from "./middleware/errorHandler.js";

async function bootstrap(): Promise<void> {
  const fastify = Fastify({
    logger: {
      level: "info",
      transport: {
        target: "pino-pretty",
        options: { colorize: true },
      },
    },
  });

  // CORS — allow all origins for development; restrict in production
  await fastify.register(cors, { origin: true });

  // OpenAPI spec generation — must be registered before routes
  await fastify.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "Travel Concierge — API Gateway",
        description:
          "RAG-powered conversational AI gateway. Retrieves grounded context from a vector store " +
          "and generates answers via Anthropic Claude. See the full spec at /openapi/gateway.yaml.",
        version: "1.0.0",
      },
      servers: [{ url: "http://localhost:8000", description: "Local development" }],
      tags: [
        { name: "chat", description: "Conversational AI endpoints" },
        { name: "packages", description: "Package knowledge base management" },
        { name: "ops", description: "Operational endpoints" },
      ],
      components: {
        schemas: {
          ErrorResponse: {
            type: "object",
            properties: {
              error: { type: "string" },
              detail: { type: "string", nullable: true },
              statusCode: { type: "integer" },
            },
          },
        },
      },
    },
  });

  // Swagger UI at /docs
  await fastify.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
      tryItOutEnabled: true,
    },
    staticCSP: true,
  });

  // Dependency injection — construct clients once, share across requests
  const embeddingClient = new EmbeddingClient(config.embeddingServiceUrl);
  const llmClient = new LlmClient(config.anthropicApiKey, config.llmModel, config.maxTokens);

  // Register routes
  await fastify.register(healthRoutes);
  await fastify.register(chatRoutes(embeddingClient, llmClient));
  await fastify.register(packageRoutes(embeddingClient));

  // Centralised error handler — maps errors to structured responses
  fastify.setErrorHandler(errorHandler);

  try {
    await fastify.listen({ port: config.port, host: "0.0.0.0" });
    fastify.log.info(`API Gateway listening on port ${config.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

bootstrap();
