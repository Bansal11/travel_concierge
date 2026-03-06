/**
 * HTTP client for the Python Embedding Service.
 *
 * Strictly decoupled from the Python service — communicates only over HTTP.
 * The gateway never imports Python code or shares a DB connection (HLD §2).
 *
 * Implements graceful degradation: if the embedding service is unavailable
 * or times out, throws a structured EmbeddingServiceError instead of
 * propagating raw axios errors.
 */
import axios, { AxiosInstance, AxiosError } from "axios";

export interface DocumentChunk {
  id: string;
  content: string;
  source: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface QueryResult {
  chunks: DocumentChunk[];
  retrieval_latency_ms: number;
  rerank_latency_ms: number;
}

export interface IngestResult {
  chunks_stored: number;
  source: string;
}

export interface PackageInfo {
  source: string;
  chunk_count: number;
  last_updated: string | null;
}

export interface PackageListResult {
  packages: PackageInfo[];
  total: number;
}

export interface DeleteResult {
  source: string;
  chunks_deleted: number;
}

export class EmbeddingServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "EmbeddingServiceError";
  }
}

export class EmbeddingClient {
  private readonly http: AxiosInstance;

  constructor(baseUrl: string, timeoutMs = 10_000) {
    this.http = axios.create({
      baseURL: `${baseUrl}/api/v1`,
      timeout: timeoutMs,
      headers: { "Content-Type": "application/json" },
    });
  }

  /**
   * Semantic search against the vector store.
   * Calls POST /api/v1/query on the embedding service.
   *
   * @param query  Natural-language query string.
   * @param topN   Number of re-ranked results to return (default: 3).
   */
  async query(query: string, topN = 3): Promise<QueryResult> {
    try {
      const { data } = await this.http.post<QueryResult>("/query", {
        query,
        top_n: topN,
      });
      return data;
    } catch (err) {
      throw this._wrapError(err, "Embedding service query failed");
    }
  }

  /**
   * Ingest a document into the vector store.
   * Calls POST /api/v1/ingest on the embedding service.
   */
  async ingest(
    content: string,
    source: string,
    docType: "markdown" | "json" = "markdown",
    metadata: Record<string, unknown> = {},
  ): Promise<IngestResult> {
    try {
      const { data } = await this.http.post<IngestResult>("/ingest", {
        content,
        source,
        doc_type: docType,
        metadata,
      });
      return data;
    } catch (err) {
      throw this._wrapError(err, "Embedding service ingest failed");
    }
  }

  /** List all ingested packages (distinct sources with chunk counts). */
  async listPackages(): Promise<PackageListResult> {
    try {
      const { data } = await this.http.get<PackageListResult>("/packages");
      return data;
    } catch (err) {
      throw this._wrapError(err, "Embedding service list packages failed");
    }
  }

  /** Delete all chunks for a given source. */
  async deletePackage(source: string): Promise<DeleteResult> {
    try {
      const { data } = await this.http.delete<DeleteResult>(`/packages/${encodeURIComponent(source)}`);
      return data;
    } catch (err) {
      throw this._wrapError(err, "Embedding service delete package failed");
    }
  }

  private _wrapError(err: unknown, message: string): EmbeddingServiceError {
    if (axios.isAxiosError(err)) {
      const axiosErr = err as AxiosError<{ detail?: string }>;
      const detail = axiosErr.response?.data?.detail ?? axiosErr.message;
      return new EmbeddingServiceError(`${message}: ${detail}`, axiosErr.response?.status);
    }
    return new EmbeddingServiceError(`${message}: ${String(err)}`);
  }
}
