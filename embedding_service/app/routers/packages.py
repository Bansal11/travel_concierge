"""Packages router — list and delete ingested document packages."""
import logging
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/packages", tags=["packages"])


class PackageInfo(BaseModel):
    source: str
    chunk_count: int
    last_updated: str | None


class PackageListResponse(BaseModel):
    packages: list[PackageInfo]
    total: int


class DeleteResponse(BaseModel):
    source: str
    chunks_deleted: int


@router.get("", response_model=PackageListResponse, summary="List all ingested packages")
async def list_packages(request: Request) -> PackageListResponse:
    """Return all distinct sources currently stored in the vector DB."""
    try:
        rows = await request.app.state.vector_store.list_sources()
    except Exception as exc:
        logger.error("Failed to list packages: %s", exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    packages = [PackageInfo(**row) for row in rows]
    return PackageListResponse(packages=packages, total=len(packages))


@router.delete(
    "/{source:path}",
    response_model=DeleteResponse,
    summary="Delete all chunks for a package",
)
async def delete_package(source: str, request: Request) -> DeleteResponse:
    """Remove every chunk stored under the given source identifier."""
    try:
        deleted = await request.app.state.vector_store.delete_by_source(source)
    except Exception as exc:
        logger.error("Failed to delete package '%s': %s", source, exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    if deleted == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No chunks found for source '{source}'",
        )

    return DeleteResponse(source=source, chunks_deleted=deleted)
