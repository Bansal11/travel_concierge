"""Pydantic request/response schemas for the embedding service API."""
from typing import Any
from pydantic import BaseModel, Field


class IngestRequest(BaseModel):
    """Payload for ingesting a document into the vector store."""

    content: str = Field(..., description="Raw document text to chunk and embed.")
    source: str = Field(..., description="Identifier for the document origin (e.g. file path or URL).")
    doc_type: str = Field(default="markdown", description="Format hint: 'markdown' or 'json'.")
    metadata: dict[str, Any] = Field(default_factory=dict)


class IngestResponse(BaseModel):
    """Result of a successful ingestion."""

    chunks_stored: int
    source: str


class QueryRequest(BaseModel):
    """Semantic search request."""

    query: str = Field(..., description="Natural-language query to embed and search.")
    top_n: int = Field(default=3, ge=1, le=20, description="Number of results to return after re-ranking.")


class DocumentChunk(BaseModel):
    """A single retrieved and re-ranked document chunk."""

    id: str
    content: str
    source: str
    score: float = Field(..., description="Cross-encoder relevance score (higher = more relevant).")
    metadata: dict[str, Any] = Field(default_factory=dict)


class QueryResponse(BaseModel):
    """Semantic search response with latency telemetry."""

    chunks: list[DocumentChunk]
    retrieval_latency_ms: float = Field(..., description="Time spent on pgvector KNN search.")
    rerank_latency_ms: float = Field(..., description="Time spent on cross-encoder re-ranking.")


class ErrorResponse(BaseModel):
    """Structured error envelope — never return raw stack traces."""

    error: str
    detail: str | None = None
