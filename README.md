# Travel Concierge

An AI-powered Retrieval-Augmented Generation (RAG) platform for B2C holiday package discovery. Users ask natural-language questions about travel packages and receive accurate, source-grounded answers — powered by semantic search and Anthropic Claude.

---

## What it does

| Capability | Detail |
|---|---|
| **Semantic search** | Embeds queries and documents with a bi-encoder; retrieves candidates using HNSW approximate KNN (O(log N)) |
| **Re-ranking** | Cross-encoder scores each (query, passage) pair for precision before injecting context into the LLM |
| **Grounded answers** | Claude generates answers strictly from retrieved context, citing source documents |
| **Package management** | Admins upload Markdown or JSON holiday packages; the system chunks, embeds, and indexes them automatically |
| **Conversational memory** | Multi-turn history is passed to the LLM for coherent, contextual dialogue |

---

## Architecture

```
Browser (React / Next.js)
  ├── /chat   ← user asks questions
  └── /admin  ← admin uploads & manages packages

         ↕ HTTP

API Gateway  (Node.js / Fastify :8000)
  ├── Orchestrates the RAG pipeline
  ├── Calls Embedding Service for retrieval
  └── Calls Anthropic Claude for generation

         ↕ HTTP

Embedding & Retrieval Service  (Python / FastAPI :8001)
  ├── Chunks and embeds documents on ingestion
  ├── HNSW KNN search via pgvector  →  O(log N)
  └── Cross-encoder re-ranking

         ↕ asyncpg

PostgreSQL 16 + pgvector
  ├── document_chunks  (384-dim HNSW cosine index)
  └── users, chat_sessions  (relational)
```

### Services

| Service | Tech | Port | Responsibility |
|---|---|---|---|
| `frontend` | Next.js 14, Tailwind CSS | 3000 | User chat UI + admin panel |
| `api_gateway` | Fastify, TypeScript | 8000 | LLM orchestration, public API |
| `embedding_service` | FastAPI, Python 3.12 | 8001 | ML inference, vector storage |
| `postgres` | PostgreSQL 16 + pgvector | 5432 | Unified relational + vector store |
| `docs` | Docusaurus 3, nginx | 4000 | Product documentation site |

### Design patterns

| Pattern | Where | Purpose |
|---|---|---|
| **Strategy** (loaders) | `embedding_service/app/loaders/` | `MarkdownLoader`, `JSONLoader` behind `DocumentLoader` ABC |
| **Strategy** (splitters) | `embedding_service/app/splitters/` | `SlidingWindowSplitter`, `CharacterSplitter` behind `TextSplitter` ABC |
| **Repository** | `embedding_service/app/store/` | All pgvector SQL isolated behind `VectorStore` ABC |

### Two-stage retrieval pipeline

```
Query
  │
  ▼  Stage 1 — Bi-encoder (fast, O(log N) with HNSW)
SentenceTransformer.encode(query)  →  384-dim vector
pgvector HNSW cosine KNN  →  top-K=10 candidates
  │
  ▼  Stage 2 — Cross-encoder re-ranking (precise, O(K))
CrossEncoder.predict([(query, chunk_i) for i in K])
Sort by score  →  top-N=3 chunks
  │
  ▼
Inject context into Claude prompt  →  grounded answer
```

---

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) v24+
- An [Anthropic API key](https://console.anthropic.com)

### 1. Clone and configure

```bash
git clone https://github.com/Bansal11/travel_concierge.git
cd travel_concierge

cp .env.example .env
```

Edit `.env` — only two values are required:

```bash
POSTGRES_PASSWORD=pick_any_secure_password
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### 2. Start all services

```bash
docker compose up --build
```

> **First run takes 5–10 minutes** while Docker downloads and caches the ML models (`all-MiniLM-L6-v2` and `cross-encoder/ms-marco-MiniLM-L-6-v2`).

### 3. Open the app

Once you see `API Gateway listening on port 8000` in the logs:

| Interface | URL |
|---|---|
| User chat | http://localhost:3000/chat |
| Admin panel | http://localhost:3000/admin |
| API Explorer (Swagger) | http://localhost:8000/docs |
| Product docs | http://localhost:4000 |

### 4. Upload a package and chat

**Admin panel → Upload Package** — paste this and set source to `bali.md`:

```markdown
# Bali Explorer — 7 Nights

## Inclusions
- Return flights from London Heathrow
- 5-star beachfront resort
- Daily breakfast and dinner
- Airport transfers

## Pricing
From £1,850 per person based on two sharing.
```

Then go to the **Chat** page and ask: *"What does the Bali package include?"*

Or use curl directly:

```bash
# Ingest
curl -X POST http://localhost:8000/api/v1/ingest \
  -H "Content-Type: application/json" \
  -d '{"content": "# Bali\nFlights + 5-star resort from £1,850pp", "source": "bali.md"}'

# Chat
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "What does the Bali package include?"}'
```

---

## API Reference

Full interactive docs at **http://localhost:8000/docs** (Swagger UI). The OpenAPI spec is also available as a standalone file at `openapi/gateway.yaml`.

### Gateway endpoints (`localhost:8000`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/chat` | RAG query → grounded Claude answer |
| `POST` | `/api/v1/ingest` | Chunk, embed, and store a document |
| `GET` | `/api/v1/packages` | List all indexed packages |
| `DELETE` | `/api/v1/packages/:source` | Remove a package and all its chunks |
| `GET` | `/health` | Liveness check |

### Example chat response

```json
{
  "answer": "The Bali Explorer includes return flights, a 5-star beachfront resort, daily breakfast and dinner, and airport transfers — from £1,850 per person.",
  "sources": [
    { "id": "3f2a...", "source": "bali.md", "score": 4.21 }
  ],
  "latency": { "retrieval_ms": 18.4, "rerank_ms": 31.2 },
  "usage": { "model": "claude-sonnet-4-6", "input_tokens": 312, "output_tokens": 74 }
}
```

---

## Development

### Run tests

```bash
# Python (embedding service)
cd embedding_service
pip install -r requirements.txt
pytest tests/ -v

# Node.js (API gateway)
cd api_gateway
npm ci && npm test

# Typecheck
cd api_gateway && npm run typecheck
cd frontend && npm run typecheck
```

### Run a single service locally (without Docker)

```bash
# Embedding service (requires a running PostgreSQL with pgvector)
cd embedding_service
export DATABASE_URL=postgresql://travel:password@localhost:5432/travel_concierge
uvicorn app.main:app --reload --port 8001

# API gateway
cd api_gateway
npm run dev

# Frontend
cd frontend
npm run dev

# Docs site
cd docs
npm start
```

### Useful Docker commands

```bash
# Run in background
docker compose up -d --build

# Follow logs for a specific service
docker compose logs -f embedding_service

# Rebuild and restart one service after a code change
docker compose up -d --build api_gateway

# Stop everything (keeps database data)
docker compose down

# Full reset including all data
docker compose down -v
```

---

## Project Structure

```
travel_concierge/
├── docker-compose.yml
├── .env.example
├── openapi/
│   └── gateway.yaml              # Standalone OpenAPI 3.0 spec
│
├── db/
│   └── init.sql                  # pgvector schema + HNSW index
│
├── embedding_service/            # Python / FastAPI
│   ├── app/
│   │   ├── loaders/              # Strategy: DocumentLoader, MarkdownLoader, JSONLoader
│   │   ├── splitters/            # Strategy: TextSplitter, SlidingWindowSplitter, CharacterSplitter
│   │   ├── store/                # Repository: VectorStore, PgVectorStore
│   │   ├── services/             # IngestionService, RetrievalService
│   │   └── routers/              # /ingest, /query, /packages
│   └── tests/
│
├── api_gateway/                  # Node.js / Fastify / TypeScript
│   ├── src/
│   │   ├── services/             # EmbeddingClient, LlmClient (Anthropic SDK)
│   │   └── routes/               # chat, packages, health
│   └── tests/
│
├── frontend/                     # Next.js 14 / Tailwind CSS
│   ├── app/
│   │   ├── chat/                 # User chat interface
│   │   └── admin/                # Package upload + management
│   ├── components/
│   └── lib/
│       └── apiClient.ts          # Typed gateway HTTP client
│
└── docs/                         # Docusaurus 3 documentation site
    └── docs/
        ├── getting-started/
        ├── architecture/
        ├── user-guide/
        ├── api-reference/
        └── deployment/
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `POSTGRES_PASSWORD` | ✅ | — | PostgreSQL password |
| `ANTHROPIC_API_KEY` | ✅ | — | Anthropic API key (`sk-ant-...`) |
| `EMBEDDING_MODEL` | ❌ | `all-MiniLM-L6-v2` | HuggingFace bi-encoder model |
| `RERANKER_MODEL` | ❌ | `cross-encoder/ms-marco-MiniLM-L-6-v2` | HuggingFace cross-encoder |
| `LLM_MODEL` | ❌ | `claude-sonnet-4-6` | Claude model ID |
| `TOP_K` | ❌ | `10` | Candidates fetched from vector DB |
| `TOP_N` | ❌ | `3` | Final results after re-ranking |
| `NEXT_PUBLIC_GATEWAY_URL` | ❌ | `http://localhost:8000` | Gateway URL (must be browser-reachable) |

Full variable reference: [docs/deployment/environment-variables](http://localhost:4000/deployment/environment-variables)

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `embedding_service` crashes on startup | Check `DATABASE_URL` — Docker Compose sets it to use `postgres` hostname automatically |
| Chat returns "EmbeddingServiceUnavailable" | Models still loading — wait ~30s after startup and retry |
| Chat returns "LlmServiceUnavailable" | Verify `ANTHROPIC_API_KEY` in `.env` is valid |
| `docker compose` not found | Use `docker-compose` (v1 CLI) instead |
| Re-uploaded package returns stale answers | Delete the old package in the admin panel first, then re-upload |

---

## Tech Stack

| Layer | Technology |
|---|---|
| LLM | Anthropic Claude (`claude-sonnet-4-6`) |
| Embedding model | `all-MiniLM-L6-v2` (384-dim, sentence-transformers) |
| Re-ranking model | `cross-encoder/ms-marco-MiniLM-L-6-v2` |
| Vector database | PostgreSQL 16 + pgvector (HNSW index) |
| ML service | Python 3.12, FastAPI, asyncpg |
| API gateway | Node.js 22, Fastify, TypeScript |
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Docs | Docusaurus 3 |
| CI/CD | GitHub Actions |
| Observability | OpenTelemetry (traces → OTLP) |
