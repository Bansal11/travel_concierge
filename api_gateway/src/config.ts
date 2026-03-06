/**
 * Typed configuration loaded from environment variables.
 * No secrets are hardcoded — all values come from .env or container env.
 */
import "dotenv/config";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  port: parseInt(optionalEnv("PORT", "8000"), 10),
  embeddingServiceUrl: optionalEnv("EMBEDDING_SERVICE_URL", "http://localhost:8001"),
  anthropicApiKey: requireEnv("ANTHROPIC_API_KEY"),
  llmModel: optionalEnv("LLM_MODEL", "claude-sonnet-4-6"),
  otelServiceName: optionalEnv("OTEL_SERVICE_NAME", "travel-gateway"),
  otelEndpoint: optionalEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317"),
  /** Max tokens for LLM response */
  maxTokens: 1024,
  /** Max conversation history turns to include */
  maxHistoryTurns: 6,
} as const;
