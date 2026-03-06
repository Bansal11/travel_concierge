"""
RetrievalService — two-stage retrieval with cross-encoder re-ranking.

Pipeline:
    query → embed → pgvector HNSW KNN (Top-K) → CrossEncoder re-rank → Top-N

Stage 1 — Bi-encoder retrieval (fast, approximate):
    Uses the same SentenceTransformer model as ingestion to embed the query,
    then fetches Top-K candidates from pgvector using the HNSW cosine index.
    Time complexity: O(log N) for HNSW search.

Stage 2 — Cross-encoder re-ranking (precise, expensive):
    Scores each (query, passage) pair with a cross-encoder model that jointly
    attends to both texts, producing a more accurate relevance score than
    bi-encoder dot-product similarity.
    Time complexity: O(K) per query where K = top_k (small constant, e.g. 10).

Net effect: high recall from Stage 1 + high precision from Stage 2,
minimising hallucinations in the LLM context window.
"""
import asyncio
import time
from dataclasses import dataclass

from sentence_transformers import CrossEncoder, SentenceTransformer

from app.models.schemas import DocumentChunk, QueryResponse
from app.store.base import VectorStore


@dataclass
class RetrievalResult:
    """Internal transfer object from VectorStore to CrossEncoder."""

    id: str
    content: str
    source: str
    score: float
    metadata: dict


class RetrievalService:
    """Orchestrates bi-encoder retrieval + cross-encoder re-ranking.

    Args:
        vector_store:    Repository for KNN search.
        embed_model:     Bi-encoder (same model used during ingestion).
        rerank_model:    CrossEncoder for precise relevance scoring.
        top_k:           Candidates to fetch from vector DB (e.g. 10).
        top_n:           Final results to return after re-ranking (e.g. 3).
    """

    def __init__(
        self,
        vector_store: VectorStore,
        embed_model: SentenceTransformer,
        rerank_model: CrossEncoder,
        top_k: int = 10,
        top_n: int = 3,
    ) -> None:
        self._store = vector_store
        self._embed_model = embed_model
        self._rerank_model = rerank_model
        self._top_k = top_k
        self._top_n = top_n

    async def query(self, query_text: str, top_n: int | None = None) -> QueryResponse:
        """Execute the two-stage retrieval pipeline.

        Args:
            query_text: Natural-language query string.
            top_n:      Override for the number of final results (optional).

        Returns:
            QueryResponse with re-ranked chunks and latency telemetry.
        """
        n = top_n if top_n is not None else self._top_n

        # Stage 1: embed query and fetch top-K candidates from pgvector
        t0 = time.perf_counter()
        query_embedding: list[float] = await asyncio.to_thread(
            lambda: self._embed_model.encode([query_text], show_progress_bar=False)[0].tolist()
        )
        candidates = await self._store.search(query_embedding, self._top_k)
        retrieval_ms = (time.perf_counter() - t0) * 1000

        if not candidates:
            return QueryResponse(chunks=[], retrieval_latency_ms=retrieval_ms, rerank_latency_ms=0.0)

        # Stage 2: cross-encoder re-ranking — O(K) where K = top_k
        t1 = time.perf_counter()
        pairs = [[query_text, c.content] for c in candidates]
        rerank_scores: list[float] = await asyncio.to_thread(
            lambda: self._rerank_model.predict(pairs).tolist()
        )
        rerank_ms = (time.perf_counter() - t1) * 1000

        # Sort by cross-encoder score descending, take top-N
        ranked = sorted(
            zip(candidates, rerank_scores),
            key=lambda x: x[1],
            reverse=True,
        )[:n]

        chunks = [
            DocumentChunk(
                id=doc.id or "",
                content=doc.content,
                source=doc.source,
                score=float(score),
                metadata=doc.metadata,
            )
            for doc, score in ranked
        ]

        return QueryResponse(
            chunks=chunks,
            retrieval_latency_ms=round(retrieval_ms, 2),
            rerank_latency_ms=round(rerank_ms, 2),
        )
