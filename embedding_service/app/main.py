"""
FastAPI application entry point for the Embedding & Retrieval Service.

Responsibilities:
    - Initialise shared resources (DB pool, ML models) on startup via lifespan.
    - Attach resources to app.state for injection into request handlers.
    - Instrument with OpenTelemetry for latency observability.
    - Register routers under /api/v1.
    - Expose /health for Docker healthcheck and Gateway liveness probe.

Shared ML models are loaded once at startup and reused across all requests
(SentenceTransformer and CrossEncoder are thread-safe for inference).
"""
import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from sentence_transformers import CrossEncoder, SentenceTransformer

from app.config import settings
from app.routers import ingest_router, packages_router, query_router
from app.services.retrieval_service import RetrievalService
from app.splitters.sliding_window_splitter import SlidingWindowSplitter
from app.store.pgvector_store import PgVectorStore

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
logger = logging.getLogger(__name__)


def _configure_otel(app_name: str) -> None:
    """Wire up OpenTelemetry tracing with OTLP gRPC export."""
    resource = Resource.create({"service.name": app_name})
    provider = TracerProvider(resource=resource)
    exporter = OTLPSpanExporter(endpoint=settings.otel_exporter_otlp_endpoint, insecure=True)
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Manage application lifecycle: connect DB and load models on startup,
    release resources on shutdown.

    Models are loaded here (not at module level) so they can be mocked in
    unit tests by replacing app.state before the test handler is called.
    """
    logger.info("Starting embedding service — loading models...")

    # Load ML models once (CPU/GPU, thread-safe for inference)
    embed_model = SentenceTransformer(settings.embedding_model)
    rerank_model = CrossEncoder(settings.reranker_model)

    # Chunking strategy — sliding window for semantic context preservation
    splitter = SlidingWindowSplitter.from_char_params(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
    )

    # Connect to pgvector
    vector_store = PgVectorStore(dsn=settings.database_url)
    await vector_store.connect()

    retrieval_service = RetrievalService(
        vector_store=vector_store,
        embed_model=embed_model,
        rerank_model=rerank_model,
        top_k=settings.top_k,
        top_n=settings.top_n,
    )

    # Attach to app.state for access in route handlers
    app.state.embed_model = embed_model
    app.state.rerank_model = rerank_model
    app.state.splitter = splitter
    app.state.vector_store = vector_store
    app.state.retrieval_service = retrieval_service

    logger.info("Embedding service ready.")
    yield

    logger.info("Shutting down embedding service...")
    await vector_store.close()


_OPENAPI_TAGS = [
    {
        "name": "ingestion",
        "description": "Document ingestion pipeline: load → chunk (sliding window O(N)) → embed → pgvector insert.",
    },
    {
        "name": "retrieval",
        "description": "Two-stage retrieval: bi-encoder HNSW KNN (O(log N)) → CrossEncoder re-rank (O(K)).",
    },
    {
        "name": "packages",
        "description": "Vector store management — list and delete indexed document sources.",
    },
    {
        "name": "ops",
        "description": "Liveness and readiness checks.",
    },
]


def create_app() -> FastAPI:
    """Application factory — keeps global state out of module scope."""
    _configure_otel(settings.otel_service_name)

    app = FastAPI(
        title="Travel Concierge — Embedding & Retrieval Service",
        version="1.0.0",
        description=(
            "Internal ML service responsible for document ingestion and semantic retrieval. "
            "**Not intended to be exposed publicly** — call it through the API Gateway.\n\n"
            "### Pipeline\n"
            "**Ingestion:** `DocumentLoader` → `TextSplitter` (sliding window) → "
            "`SentenceTransformer` → `PgVectorStore.insert()`\n\n"
            "**Retrieval:** embed query → HNSW KNN top-K → `CrossEncoder` re-rank → top-N chunks"
        ),
        openapi_tags=_OPENAPI_TAGS,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["*"],
    )

    app.include_router(ingest_router, prefix="/api/v1")
    app.include_router(query_router, prefix="/api/v1")
    app.include_router(packages_router, prefix="/api/v1")

    @app.get("/health", tags=["ops"])
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    FastAPIInstrumentor.instrument_app(app)
    return app


app = create_app()
