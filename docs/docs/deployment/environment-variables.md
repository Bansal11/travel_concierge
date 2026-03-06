---
sidebar_position: 2
---

# Environment Variables

All configuration is driven by environment variables. Copy `.env.example` to `.env` and fill in required values.

## PostgreSQL

| Variable | Required | Default | Description |
|---|---|---|---|
| `POSTGRES_DB` | ❌ | `travel_concierge` | Database name |
| `POSTGRES_USER` | ❌ | `travel` | Database user |
| `POSTGRES_PASSWORD` | ✅ | — | Database password (never use default in production) |

## Embedding Service

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | Full asyncpg connection string |
| `EMBEDDING_MODEL` | ❌ | `all-MiniLM-L6-v2` | HuggingFace sentence-transformer model |
| `EMBEDDING_DIM` | ❌ | `384` | Vector dimension — must match `EMBEDDING_MODEL` |
| `RERANKER_MODEL` | ❌ | `cross-encoder/ms-marco-MiniLM-L-6-v2` | HuggingFace cross-encoder model |
| `TOP_K` | ❌ | `10` | Candidates to fetch from pgvector before re-ranking |
| `TOP_N` | ❌ | `3` | Final results returned after re-ranking |
| `CHUNK_SIZE` | ❌ | `512` | Target characters per chunk (maps to word count internally) |
| `CHUNK_OVERLAP` | ❌ | `64` | Overlap characters between consecutive chunks |
| `OTEL_SERVICE_NAME` | ❌ | `embedding-service` | OpenTelemetry service name |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | ❌ | `http://localhost:4317` | OTLP gRPC collector endpoint |

## API Gateway

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | — | Anthropic API key (`sk-ant-...`) |
| `EMBEDDING_SERVICE_URL` | ❌ | `http://localhost:8001` | Internal URL of the embedding service |
| `LLM_MODEL` | ❌ | `claude-sonnet-4-6` | Claude model ID |
| `PORT` | ❌ | `8000` | Gateway HTTP port |
| `OTEL_SERVICE_NAME` | ❌ | `travel-gateway` | OpenTelemetry service name |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | ❌ | `http://localhost:4317` | OTLP gRPC collector endpoint |

## Frontend

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_GATEWAY_URL` | ❌ | `http://localhost:8000` | Public-facing API Gateway URL. **Must be reachable from the browser**, not just within Docker. |

:::warning `NEXT_PUBLIC_*` variables are baked in at build time
Next.js inlines all `NEXT_PUBLIC_*` variables during `next build`. If you change `NEXT_PUBLIC_GATEWAY_URL` after the image is built, you must rebuild the frontend image.
:::

## Choosing an embedding model

| Model | Dim | Size | Notes |
|---|---|---|---|
| `all-MiniLM-L6-v2` | 384 | ~22 MB | Default. Fast, good quality for English |
| `all-mpnet-base-v2` | 768 | ~420 MB | Higher quality, slower |
| `intfloat/e5-large-v2` | 1024 | ~1.3 GB | State-of-the-art, GPU recommended |

When changing models:
1. Set `EMBEDDING_MODEL` and `EMBEDDING_DIM` in `.env`
2. Re-run `db/init.sql` to recreate the HNSW index with the new dimension
3. Re-ingest all documents (old embeddings are incompatible)
