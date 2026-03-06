"""Query router — semantic search with cross-encoder re-ranking."""
import logging
from fastapi import APIRouter, HTTPException, Request, status

from app.models.schemas import ErrorResponse, QueryRequest, QueryResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/query", tags=["retrieval"])


@router.post(
    "",
    response_model=QueryResponse,
    responses={503: {"model": ErrorResponse}},
    summary="Semantic search with re-ranking",
)
async def semantic_query(payload: QueryRequest, request: Request) -> QueryResponse:
    """Embed the query, retrieve top-K candidates from pgvector, and
    re-rank to top-N using the cross-encoder model.

    Response includes per-stage latency for OpenTelemetry dashboards.
    """
    try:
        result = await request.app.state.retrieval_service.query(
            query_text=payload.query,
            top_n=payload.top_n,
        )
    except Exception as exc:
        logger.error("Query failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Retrieval pipeline error. Check service logs.",
        ) from exc

    return result
