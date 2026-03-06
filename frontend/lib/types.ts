export interface SourceCitation {
  id: string;
  source: string;
  score: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: SourceCitation[];
  latency?: { retrieval_ms: number; rerank_ms: number };
}

export interface ChatResponse {
  answer: string;
  sources: SourceCitation[];
  latency: { retrieval_ms: number; rerank_ms: number };
  usage: { model: string; input_tokens: number; output_tokens: number };
}

export interface PackageInfo {
  source: string;
  chunk_count: number;
  last_updated: string | null;
}

export interface PackageListResponse {
  packages: PackageInfo[];
  total: number;
}

export interface IngestResponse {
  chunks_stored: number;
  source: string;
}

export interface DeleteResponse {
  source: string;
  chunks_deleted: number;
}

export interface ApiError {
  error: string;
  detail?: string;
  statusCode: number;
}
