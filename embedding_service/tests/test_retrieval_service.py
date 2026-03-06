"""
Unit tests for RetrievalService.

All external dependencies (VectorStore, SentenceTransformer, CrossEncoder)
are mocked to keep tests fast and hermetic.
"""
from unittest.mock import AsyncMock, MagicMock, patch

import numpy as np
import pytest
import pytest_asyncio

from app.models.schemas import QueryResponse
from app.services.retrieval_service import RetrievalService
from app.store.base import VectorDocument


def _make_mock_vector_docs(n: int) -> list[VectorDocument]:
    return [
        VectorDocument(id=f"id-{i}", content=f"content {i}", source=f"src{i}", embedding=[])
        for i in range(n)
    ]


@pytest.fixture
def mock_store() -> AsyncMock:
    store = AsyncMock()
    store.search.return_value = _make_mock_vector_docs(5)
    return store


@pytest.fixture
def mock_embed_model() -> MagicMock:
    model = MagicMock()
    model.encode.return_value = np.array([[0.1] * 384])
    return model


@pytest.fixture
def mock_rerank_model() -> MagicMock:
    model = MagicMock()
    # Return descending scores so first doc wins after re-ranking
    model.predict.return_value = np.array([5.0, 4.0, 3.0, 2.0, 1.0])
    return model


@pytest.fixture
def service(mock_store: AsyncMock, mock_embed_model: MagicMock, mock_rerank_model: MagicMock) -> RetrievalService:
    return RetrievalService(
        vector_store=mock_store,
        embed_model=mock_embed_model,
        rerank_model=mock_rerank_model,
        top_k=5,
        top_n=3,
    )


@pytest.mark.asyncio
async def test_query_returns_top_n(service: RetrievalService) -> None:
    result = await service.query("best beach holiday")
    assert isinstance(result, QueryResponse)
    assert len(result.chunks) == 3


@pytest.mark.asyncio
async def test_query_respects_top_n_override(service: RetrievalService) -> None:
    result = await service.query("beach", top_n=2)
    assert len(result.chunks) == 2


@pytest.mark.asyncio
async def test_query_chunks_sorted_by_rerank_score(service: RetrievalService) -> None:
    result = await service.query("beach")
    scores = [c.score for c in result.chunks]
    assert scores == sorted(scores, reverse=True)


@pytest.mark.asyncio
async def test_query_includes_latency(service: RetrievalService) -> None:
    result = await service.query("beach")
    assert result.retrieval_latency_ms >= 0
    assert result.rerank_latency_ms >= 0


@pytest.mark.asyncio
async def test_query_empty_store(
    mock_embed_model: MagicMock, mock_rerank_model: MagicMock
) -> None:
    store = AsyncMock()
    store.search.return_value = []
    service = RetrievalService(
        vector_store=store,
        embed_model=mock_embed_model,
        rerank_model=mock_rerank_model,
    )
    result = await service.query("anything")
    assert result.chunks == []
    assert result.rerank_latency_ms == 0.0


@pytest.mark.asyncio
async def test_ingestion_service_calls_store(mock_embed_model: MagicMock) -> None:
    """Ensure IngestionService calls VectorStore.insert with correct chunk count."""
    from app.loaders.markdown_loader import MarkdownLoader
    from app.services.ingestion_service import IngestionService
    from app.splitters.sliding_window_splitter import SlidingWindowSplitter

    store = AsyncMock()
    store.insert.return_value = ["id-1", "id-2"]

    mock_embed_model.encode.return_value = np.array([[0.1] * 384, [0.2] * 384])

    svc = IngestionService(
        loader=MarkdownLoader(),
        splitter=SlidingWindowSplitter(window_words=10, step_words=7),
        vector_store=store,
        model=mock_embed_model,
    )
    content = " ".join(["word"] * 50)
    count = await svc.ingest(raw=content, source="test.md")
    assert count > 0
    store.insert.assert_called_once()
