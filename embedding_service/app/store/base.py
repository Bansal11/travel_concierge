"""
Repository Pattern — VectorStore interface.

Architectural purpose:
    All pgvector SQL is isolated behind this interface. Core business logic
    (IngestionService, RetrievalService) depends only on this abstraction,
    never on raw SQL or asyncpg internals.

    This makes it trivial to:
    - Swap pgvector for another vector DB (e.g. Weaviate, Qdrant) without
      touching service code.
    - Inject a mock in unit tests (Dependency Inversion Principle).
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class VectorDocument:
    """Data transfer object for storing and retrieving vector documents."""

    content: str
    source: str
    embedding: list[float]
    metadata: dict[str, Any] = field(default_factory=dict)
    id: str | None = None   # set after persistence
    score: float = 0.0      # set on retrieval


class VectorStore(ABC):
    """Abstract repository for vector document persistence and retrieval."""

    @abstractmethod
    async def insert(self, documents: list[VectorDocument]) -> list[str]:
        """Persist a batch of documents and return their assigned IDs.

        Args:
            documents: List of VectorDocument objects with embeddings populated.

        Returns:
            List of UUID strings in the same order as input.

        Time complexity: O(K) where K = len(documents).
        """

    @abstractmethod
    async def search(self, query_embedding: list[float], top_k: int) -> list[VectorDocument]:
        """Retrieve the top-K most similar documents using cosine similarity.

        Uses HNSW index: O(log N) per query vs O(N) brute-force.

        Args:
            query_embedding: Dense vector from the embedding model.
            top_k:           Number of candidates to retrieve before re-ranking.

        Returns:
            List of VectorDocument objects with .score set (cosine similarity).
        """

    @abstractmethod
    async def list_sources(self) -> list[dict[str, Any]]:
        """Return all distinct sources with their chunk counts.

        Returns:
            List of dicts: [{source, chunk_count, created_at}]

        Time complexity: O(S) where S = number of distinct sources.
        """

    @abstractmethod
    async def delete_by_source(self, source: str) -> int:
        """Delete all chunks belonging to a given source.

        Args:
            source: The logical document identifier used at ingestion time.

        Returns:
            Number of rows deleted.

        Time complexity: O(K) where K = chunks for that source.
        """

    @abstractmethod
    async def close(self) -> None:
        """Release the database connection pool."""
