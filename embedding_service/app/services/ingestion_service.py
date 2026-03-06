"""
IngestionService — orchestrates the document ingestion pipeline.

Pipeline:
    raw text → DocumentLoader → Document → TextSplitter → [Chunk] →
    SentenceTransformer → embeddings → VectorStore.insert()

Architectural decisions:
    - Stateless: all dependencies are injected, enabling horizontal scaling.
    - Async: embedding is CPU-bound but wrapped in asyncio.to_thread() so it
      never blocks the FastAPI event loop (HLD §2 Asynchronous Ingestion).
    - SOLID: depends only on abstractions (DocumentLoader, TextSplitter,
      VectorStore), not on concrete implementations.
"""
import asyncio
from typing import Any

from sentence_transformers import SentenceTransformer

from app.loaders.base import DocumentLoader
from app.splitters.base import TextSplitter
from app.store.base import VectorDocument, VectorStore


class IngestionService:
    """Coordinates loading, chunking, embedding, and storage of documents.

    Args:
        loader:       Strategy for parsing the document format.
        splitter:     Strategy for chunking the normalised text.
        vector_store: Repository for persisting embeddings.
        model:        Loaded SentenceTransformer instance (shared, thread-safe).
    """

    def __init__(
        self,
        loader: DocumentLoader,
        splitter: TextSplitter,
        vector_store: VectorStore,
        model: SentenceTransformer,
    ) -> None:
        self._loader = loader
        self._splitter = splitter
        self._store = vector_store
        self._model = model

    async def ingest(
        self,
        raw: str,
        source: str,
        metadata: dict[str, Any] | None = None,
    ) -> int:
        """Run the full ingestion pipeline for a single document.

        Embedding is offloaded to a thread pool to avoid blocking the event
        loop during CPU-intensive model inference.

        Args:
            raw:      Raw document string.
            source:   Logical document identifier.
            metadata: Optional annotations attached to all produced chunks.

        Returns:
            Number of chunks stored.

        Time complexity: O(N) for load + split; O(K * D) for embedding where
            K = number of chunks, D = embedding dimension.
        """
        # 1. Load: parse and normalise — O(N)
        document = self._loader.load(raw, source, metadata)

        # 2. Split: produce overlapping chunks — O(N)
        chunks = self._splitter.split(document.content)
        if not chunks:
            return 0

        chunk_texts = [c.content for c in chunks]

        # 3. Embed: offload CPU-bound inference to thread pool
        embeddings: list[list[float]] = await asyncio.to_thread(
            lambda: self._model.encode(chunk_texts, show_progress_bar=False).tolist()
        )

        # 4. Persist: batch insert via VectorStore — O(K)
        vector_docs = [
            VectorDocument(
                content=chunk_texts[i],
                source=source,
                embedding=embeddings[i],
                metadata={**document.metadata, "chunk_index": chunks[i].chunk_index},
            )
            for i in range(len(chunks))
        ]
        await self._store.insert(vector_docs)
        return len(vector_docs)
