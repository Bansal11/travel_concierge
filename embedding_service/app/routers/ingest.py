"""Ingestion router — receives documents and triggers the async pipeline."""
import logging
from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.loaders import JSONLoader, MarkdownLoader
from app.models.schemas import ErrorResponse, IngestRequest, IngestResponse
from app.services.ingestion_service import IngestionService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ingest", tags=["ingestion"])


def _get_ingestion_service(request: Request, doc_type: str) -> IngestionService:
    """Select the correct DocumentLoader strategy based on doc_type."""
    state = request.app.state
    loader = JSONLoader() if doc_type == "json" else MarkdownLoader()
    return IngestionService(
        loader=loader,
        splitter=state.splitter,
        vector_store=state.vector_store,
        model=state.embed_model,
    )


@router.post(
    "",
    response_model=IngestResponse,
    responses={422: {"model": ErrorResponse}, 503: {"model": ErrorResponse}},
    summary="Ingest a document into the vector store",
)
async def ingest_document(payload: IngestRequest, request: Request) -> IngestResponse:
    """Chunk, embed, and store a document asynchronously.

    The heavy lifting (embedding inference) is offloaded to a thread pool,
    so this endpoint never blocks the FastAPI event loop.
    """
    try:
        service = _get_ingestion_service(request, payload.doc_type)
        chunks_stored = await service.ingest(
            raw=payload.content,
            source=payload.source,
            metadata=payload.metadata,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Ingestion failed for source=%s: %s", payload.source, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Ingestion pipeline error. Check service logs.",
        ) from exc

    return IngestResponse(chunks_stored=chunks_stored, source=payload.source)
