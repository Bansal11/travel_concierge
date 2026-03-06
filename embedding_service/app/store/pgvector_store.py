"""
Concrete Repository — PgVectorStore.

Implements VectorStore using asyncpg + pgvector.
All SQL is contained here — no SQL leaks into service or router layers.

Index strategy: HNSW (vector_cosine_ops)
    - Reduces KNN search from O(N) to O(log N)
    - ef_search=40 at query time balances recall vs. latency

Cosine similarity is computed as: 1 - cosine_distance
    pgvector operator <=> returns cosine distance (0 = identical, 2 = opposite).
"""
import json
from typing import Any

import asyncpg
from pgvector.asyncpg import register_vector

from .base import VectorDocument, VectorStore


class PgVectorStore(VectorStore):
    """asyncpg-backed implementation of VectorStore using pgvector.

    Args:
        dsn:         PostgreSQL connection string.
        pool_size:   Maximum number of connections in the asyncpg pool.
    """

    def __init__(self, dsn: str, pool_size: int = 10) -> None:
        self._dsn = dsn
        self._pool_size = pool_size
        self._pool: asyncpg.Pool | None = None

    async def connect(self) -> None:
        """Initialise the connection pool and register the vector codec."""
        self._pool = await asyncpg.create_pool(
            self._dsn,
            min_size=2,
            max_size=self._pool_size,
            init=register_vector,  # registers pgvector <-> numpy codec
        )

    async def close(self) -> None:
        """Gracefully drain and close the connection pool."""
        if self._pool:
            await self._pool.close()
            self._pool = None

    async def insert(self, documents: list[VectorDocument]) -> list[str]:
        """Batch-insert documents; returns list of generated UUIDs.

        Uses a single executemany call to minimise round-trips.
        Time complexity: O(K) where K = len(documents).
        """
        if not self._pool:
            raise RuntimeError("PgVectorStore not connected. Call connect() first.")

        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                """
                INSERT INTO document_chunks (content, source, embedding, metadata)
                SELECT
                    d.content,
                    d.source,
                    d.embedding::vector,
                    d.metadata::jsonb
                FROM unnest($1::text[], $2::text[], $3::text[], $4::text[])
                    AS d(content, source, embedding, metadata)
                RETURNING id::text
                """,
                [doc.content for doc in documents],
                [doc.source for doc in documents],
                [str(doc.embedding) for doc in documents],
                [json.dumps(doc.metadata) for doc in documents],
            )
        return [row["id"] for row in rows]

    async def search(self, query_embedding: list[float], top_k: int) -> list[VectorDocument]:
        """Approximate KNN via HNSW cosine distance index.

        Sets ef_search session parameter to control the recall/latency
        trade-off for this query only (does not affect other connections).

        Time complexity: O(log N) with HNSW vs O(N) brute-force.

        Args:
            query_embedding: 1-D float list of dimension matching the index.
            top_k:           Number of candidates to return for re-ranking.

        Returns:
            List of VectorDocument sorted by cosine similarity (descending).
        """
        if not self._pool:
            raise RuntimeError("PgVectorStore not connected. Call connect() first.")

        embedding_str = str(query_embedding)

        async with self._pool.acquire() as conn:
            # Widen the HNSW beam search for better recall at query time
            await conn.execute("SET hnsw.ef_search = 40")
            rows = await conn.fetch(
                """
                SELECT
                    id::text,
                    content,
                    source,
                    metadata,
                    1 - (embedding <=> $1::vector) AS score
                FROM document_chunks
                ORDER BY embedding <=> $1::vector
                LIMIT $2
                """,
                embedding_str,
                top_k,
            )

        return [
            VectorDocument(
                id=row["id"],
                content=row["content"],
                source=row["source"],
                embedding=[],  # not returned to save bandwidth
                metadata=dict(row["metadata"]) if row["metadata"] else {},
                score=float(row["score"]),
            )
            for row in rows
        ]

    async def list_sources(self) -> list[dict[str, Any]]:
        """List distinct sources with chunk counts, ordered by most recently ingested.

        Time complexity: O(S) where S = number of distinct sources.
        """
        if not self._pool:
            raise RuntimeError("PgVectorStore not connected. Call connect() first.")

        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT
                    source,
                    COUNT(*)::int        AS chunk_count,
                    MAX(created_at)      AS last_updated
                FROM document_chunks
                GROUP BY source
                ORDER BY last_updated DESC
                """
            )

        return [
            {
                "source": row["source"],
                "chunk_count": row["chunk_count"],
                "last_updated": row["last_updated"].isoformat() if row["last_updated"] else None,
            }
            for row in rows
        ]

    async def delete_by_source(self, source: str) -> int:
        """Delete all chunks for a given source; returns deleted row count.

        Time complexity: O(K) where K = chunks for that source.
        """
        if not self._pool:
            raise RuntimeError("PgVectorStore not connected. Call connect() first.")

        async with self._pool.acquire() as conn:
            result: str = await conn.execute(
                "DELETE FROM document_chunks WHERE source = $1",
                source,
            )
        # asyncpg returns "DELETE N" as a string
        deleted = int(result.split()[-1])
        return deleted

    def _pool_required(self) -> asyncpg.Pool:
        if not self._pool:
            raise RuntimeError("PgVectorStore not connected.")
        return self._pool
