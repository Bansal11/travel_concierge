/**
 * Typed HTTP client for the API Gateway.
 * All fetch calls go through here — components never call fetch directly.
 */
import type {
  ChatMessage,
  ChatResponse,
  DeleteResponse,
  IngestResponse,
  PackageListResponse,
} from "./types";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.detail ?? body.error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const apiClient = {
  /** Send a chat query; history is the last N turns for context. */
  chat(query: string, history: ChatMessage[], topN = 3): Promise<ChatResponse> {
    return request<ChatResponse>("/api/v1/chat", {
      method: "POST",
      body: JSON.stringify({
        query,
        history: history.map((m) => ({ role: m.role, content: m.content })),
        top_n: topN,
      }),
    });
  },

  /** Ingest a document into the vector store. */
  ingest(
    content: string,
    source: string,
    docType: "markdown" | "json" = "markdown",
    metadata: Record<string, unknown> = {},
  ): Promise<IngestResponse> {
    return request<IngestResponse>("/api/v1/ingest", {
      method: "POST",
      body: JSON.stringify({ content, source, doc_type: docType, metadata }),
    });
  },

  /** List all ingested packages. */
  listPackages(): Promise<PackageListResponse> {
    return request<PackageListResponse>("/api/v1/packages");
  },

  /** Delete all chunks for a given source. */
  deletePackage(source: string): Promise<DeleteResponse> {
    return request<DeleteResponse>(`/api/v1/packages/${encodeURIComponent(source)}`, {
      method: "DELETE",
    });
  },
};
