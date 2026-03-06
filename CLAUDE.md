# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: travel_concierge
**Description:** A highly specialized, production-ready Retrieval-Augmented Generation (RAG) concierge for a B2C holiday package platform. 
**Goal:** Build a robust, scalable system demonstrating mastery of distributed systems, Design Patterns (LLD), Database Internals, and applied Data Structures & Algorithms (DSA).

## 1. Tech Stack & Infrastructure
- **Core ML/Retrieval Service:** Python (FastAPI).
- **API Gateway/Orchestrator:** Node.js or Go (optimized for high concurrency and I/O).
- **Vector Database:** PostgreSQL with the `pgvector` extension.
- **Containerization:** Docker (strict requirement for all services).
- **Future Scaling:** Kubernetes manifests and CI/CD pipelines (GitHub Actions).
- **Observability:** OpenTelemetry (logging retrieval vs. LLM generation latency).

## 2. High-Level Design (HLD) Principles
- **Strict Decoupling:** The API Gateway must be completely isolated from the Python Embedding Service. The embedding service should be stateless and horizontally scalable.
- **Unified Datastore:** User metadata (relational) and document embeddings (vector) must reside in the same PostgreSQL instance to eliminate data synchronization latency.
- **Asynchronous Ingestion:** Document chunking and embedding must never block the main event loop. Assume an event-driven architecture for data ingestion.

## 3. Low-Level Design (LLD) Standards
Code must strictly adhere to SOLID principles and utilize the following Design Patterns to ensure maintainability:
- **Strategy Pattern (Ingestion):** Define a `DocumentLoader` interface. Implement concrete classes (e.g., `MarkdownLoader`, `JSONLoader`). 
- **Strategy Pattern (Chunking):** Define a `TextSplitter` interface. Separate naive character splitting from semantic NLP-based splitting.
- **Repository Pattern (Data Access):** Isolate all `pgvector` SQL queries behind a `VectorStore` interface. The core business logic must never contain raw SQL.

## 4. Applied DSA & Mathematical Foundations
When writing algorithms for retrieval and chunking, optimize for time and space complexity:
- **Search Algorithm:** Utilize Cosine Similarity for vector comparison. 
- **Indexing:** Implement HNSW (Hierarchical Navigable Small World) indexing in `pgvector` to reduce K-Nearest Neighbor search time from O(N) to O(log N).
- **Chunking Logic:** Implement a Sliding Window Algorithm for text chunking to preserve semantic context across chunk boundaries, ensuring O(N) time complexity for document processing.
- **Re-ranking:** Fetch Top-K results (e.g., K=10) from the DB, then apply a cross-encoder model to re-rank to Top-N (e.g., N=3) before context injection to minimize hallucinations.

## 5. Coding Rules & Best Practices
- **Type Hinting:** Strict type hinting is mandatory across all Python and Node.js/Go code.
- **Error Handling:** Graceful degradation is required. If the DB connection fails or the LLM API times out, the system must return a structured error response, not a stack trace.
- **Environment Variables:** No hardcoded secrets. Use `.env` files and configuration managers.
- **Documentation:** Every class and interface must have docstrings explaining its time complexity and architectural purpose.
- **Testing:** Code must be easily unit-testable. Mock external API calls (LLM providers) and database connections.

## 6. Commands

### Local development (Docker)
```bash
cp .env.example .env          # fill in POSTGRES_PASSWORD and ANTHROPIC_API_KEY
docker compose up --build     # starts all 6 services
# User chat UI:         http://localhost:3000/chat
# Admin panel:          http://localhost:3000/admin
# API Gateway:          http://localhost:8000
# Gateway Swagger UI:   http://localhost:8000/docs
# Embedding Swagger UI: http://localhost:8001/docs
# Embedding ReDoc:      http://localhost:8001/redoc
# Documentation site:   http://localhost:4000
```

### Python embedding service
```bash
cd embedding_service
pip install -r requirements.txt
pytest tests/                          # all tests
pytest tests/test_splitters.py -v      # single test file
pytest tests/ -k "test_basic_split"    # single test by name
```

### Node.js API gateway
```bash
cd api_gateway
npm ci
npm run typecheck   # tsc --noEmit
npm test            # jest
npm run dev         # ts-node-dev hot reload
npm run build       # compile to dist/
```

### Next.js frontend
```bash
cd frontend
npm ci
npm run dev         # http://localhost:3000
npm run build && npm start   # production build
npm run typecheck
```

### Documentation site (Docusaurus)
```bash
cd docs
npm ci
npm start           # dev server http://localhost:3000 (Docusaurus default)
npm run build       # static build → docs/build/
npm run serve       # serve static build locally
```

### API usage (once running)
```bash
# Ingest a document
curl -X POST http://localhost:8000/api/v1/ingest \
  -H "Content-Type: application/json" \
  -d '{"content": "# Bali Package\nIncludes flights and hotel.", "source": "bali.md"}'

# Chat query
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "What does the Bali package include?"}'

# List packages
curl http://localhost:8000/api/v1/packages

# Delete a package
curl -X DELETE http://localhost:8000/api/v1/packages/bali.md
```

## 7. Architecture Overview

```
Browser
  ├── /chat  (user)  ─┐
  └── /admin (admin) ─┤
                      ▼
              Frontend (Next.js :3000)
                      │  fetch
                      ▼
          API Gateway (Node/Fastify :8000)
                      │
          ┌───────────┴───────────┐
          │                       │
    EmbeddingClient          LlmClient
    (HTTP proxy)           (Anthropic SDK)
          │                       │
          ▼                       ▼
  Embedding Service         Claude API
  (Python/FastAPI :8001)
          │
   IngestionService / RetrievalService
          │
     PgVectorStore
          │
   PostgreSQL + pgvector
```

**Services:**
- `frontend/` — Next.js; two pages: `/chat` (user) and `/admin` (package management)
- `api_gateway/` — Fastify; LLM orchestration + packages proxy; Swagger UI at `/docs`
- `embedding_service/` — FastAPI; all ML and all pgvector SQL; Swagger at `/docs`, ReDoc at `/redoc`
- `docs/` — Docusaurus 3 product documentation site; served by nginx on port 4000

**Documentation tools:**
- **Docusaurus 3** (`docs/`) — product docs, architecture, user guides, deployment guides
- **`@fastify/swagger` + `@fastify/swagger-ui`** — interactive API explorer on the gateway (`/docs`)
- **FastAPI auto-OpenAPI** — Swagger UI and ReDoc auto-generated from Pydantic schemas
- **`openapi/gateway.yaml`** — standalone OpenAPI 3.0 spec (importable into Postman/Insomnia); also served at `http://localhost:4000/openapi/gateway.yaml`

**Frontend pages:**
- `/chat` — `ChatWindow` component; sends queries, renders bubbles with source citations and latency
- `/admin` — `UploadForm` (file picker + textarea, markdown/JSON) + `PackageList` (list + delete)
- Shared: `Navbar` with tab highlighting, `apiClient` typed HTTP wrapper (`frontend/lib/apiClient.ts`)

**Key design pattern locations:**
- Strategy (loaders): `embedding_service/app/loaders/` — `DocumentLoader` base, `MarkdownLoader`, `JSONLoader`
- Strategy (splitters): `embedding_service/app/splitters/` — `TextSplitter` base, `CharacterSplitter`, `SlidingWindowSplitter`
- Repository: `embedding_service/app/store/` — `VectorStore` interface (`insert`, `search`, `list_sources`, `delete_by_source`), `PgVectorStore` implementation

**Gateway API surface:**
- `POST /api/v1/chat` — RAG query → LLM answer with sources
- `POST /api/v1/ingest` — chunk + embed + store a document
- `GET  /api/v1/packages` — list all sources with chunk counts
- `DELETE /api/v1/packages/:source` — remove all chunks for a source

**Retrieval pipeline:** query → bi-encoder embed → HNSW KNN top-K=10 → CrossEncoder re-rank → top-N=3 → LLM context

**DB schema:** `db/init.sql` — single PostgreSQL instance holds both `users` (relational) and `document_chunks` (vector, 384-dim, HNSW index).