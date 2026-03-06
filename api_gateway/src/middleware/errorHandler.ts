/**
 * Centralised Fastify error handler.
 * Maps known error types to structured HTTP responses — no raw stack traces
 * are ever returned to clients (graceful degradation requirement, CLAUDE.md §5).
 */
import { FastifyError, FastifyReply, FastifyRequest } from "fastify";

import { EmbeddingServiceError } from "../services/embeddingClient.js";
import { LlmClientError } from "../services/llmClient.js";

interface ErrorBody {
  error: string;
  detail?: string;
  statusCode: number;
}

export function errorHandler(
  error: FastifyError | Error,
  _request: FastifyRequest,
  reply: FastifyReply,
): void {
  let statusCode = 500;
  let body: ErrorBody;

  if (error instanceof EmbeddingServiceError) {
    statusCode = error.statusCode ?? 503;
    body = {
      error: "EmbeddingServiceUnavailable",
      detail: error.message,
      statusCode,
    };
  } else if (error instanceof LlmClientError) {
    statusCode = 503;
    body = {
      error: "LlmServiceUnavailable",
      detail: error.message,
      statusCode,
    };
  } else if ("statusCode" in error && typeof error.statusCode === "number") {
    // Native Fastify validation errors
    statusCode = error.statusCode;
    body = {
      error: "ValidationError",
      detail: error.message,
      statusCode,
    };
  } else {
    body = {
      error: "InternalServerError",
      detail: "An unexpected error occurred.",
      statusCode: 500,
    };
  }

  reply.status(statusCode).send(body);
}
