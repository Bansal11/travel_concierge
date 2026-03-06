---
sidebar_position: 1
---

# Architecture Overview

## System diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Browser (React/Next.js)                      │
│                                                                  │
│   ┌──────────────────┐          ┌──────────────────────────┐    │
│   │   /chat (User)   │          │    /admin (Admin)         │    │
│   │  ChatWindow      │          │  UploadForm + PackageList │    │
│   └────────┬─────────┘          └──────────┬───────────────┘    │
│            │                               │   fetch             │
└────────────┼───────────────────────────────┼────────────────────┘
             │                               │
             ▼                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  API Gateway  (Node.js / Fastify :8000)          │
│                                                                  │
│   POST /api/v1/chat      POST /api/v1/ingest                    │
│   GET  /api/v1/packages  DELETE /api/v1/packages/:source        │
│   GET  /health           GET  /docs  (Swagger UI)               │
│                                                                  │
│   ┌─────────────────┐    ┌──────────────────────┐              │
│   │  EmbeddingClient│    │  LlmClient           │              │
│   │  (HTTP proxy)   │    │  (Anthropic SDK)     │              │
│   └────────┬────────┘    └──────────┬───────────┘              │
└────────────┼──────────────────────── ┼───────────────────────────┘
             │ HTTP                    │ HTTPS
             ▼                         ▼
┌───────────────────────────┐     ┌────────────────┐
│ Embedding Service         │     │  Anthropic API  │
│ (Python / FastAPI :8001)  │     │  Claude         │
│                           │     └────────────────┘
│  POST /api/v1/ingest      │
│  POST /api/v1/query       │
│  GET  /api/v1/packages    │
│  DELETE /api/v1/packages  │
│  GET  /health             │
│  GET  /docs  (Swagger UI) │
│                           │
│  IngestionService         │
│  RetrievalService         │
│  VectorStore (Repository) │
└────────────┬──────────────┘
             │ asyncpg
             ▼
┌───────────────────────────┐
│  PostgreSQL 16 + pgvector  │
│                           │
│  document_chunks          │
│  ├─ embedding VECTOR(384) │
│  └─ HNSW cosine index     │
│  users                    │
│  chat_sessions            │
│  chat_messages            │
└───────────────────────────┘
```

## Service responsibilities

### Frontend (`frontend/`) — Next.js 14

The user-facing layer. Contains **no business logic** — it's purely a UI that calls the API Gateway.

- `/chat` — `ChatWindow` component manages conversation state, renders `MessageBubble` with source citations
- `/admin` — `UploadForm` handles file ingestion; `PackageList` lists and deletes packages
- `lib/apiClient.ts` — typed wrapper around all four gateway endpoints

### API Gateway (`api_gateway/`) — Fastify + TypeScript

Orchestration layer. **Never connects to the database.**

- Receives user requests from the frontend
- Calls `EmbeddingClient` (HTTP) to retrieve relevant chunks from the embedding service
- Builds a RAG prompt and calls `LlmClient` (Anthropic SDK) with injected context
- Returns the grounded answer with source citations and latency telemetry

### Embedding Service (`embedding_service/`) — FastAPI + Python

ML and data layer. Owns **all ML models** and **all SQL**.

- `IngestionService` — chunks a document (sliding window, O(N)), embeds all chunks (batch inference), batch-inserts into pgvector
- `RetrievalService` — embeds query, fetches top-K candidates via HNSW (O(log N)), re-ranks to top-N with a cross-encoder
- `PgVectorStore` — all raw SQL behind the `VectorStore` repository interface

### Database — PostgreSQL 16 + pgvector

Single instance for both relational and vector data (eliminates synchronisation latency per HLD §2).

- `document_chunks` — stores chunk text + 384-dim embedding; HNSW index for ANN search
- `users`, `chat_sessions`, `chat_messages` — relational tables for user and conversation management

## Data flows

### Chat query flow

```
User → POST /api/v1/chat
  → Gateway: EmbeddingClient.query(query, top_n=3)
    → Embedding Service: embed query → pgvector HNSW KNN(top_k=10)
    → Embedding Service: CrossEncoder.predict(pairs) → sorted top_n=3
    ← returns: [{id, content, source, score}]
  → Gateway: LlmClient.chat(query, chunks, history)
    → Anthropic API: system prompt + context + conversation
    ← returns: {answer, input_tokens, output_tokens}
  ← User: {answer, sources, latency, usage}
```

### Ingestion flow

```
Admin → POST /api/v1/ingest
  → Gateway: EmbeddingClient.ingest(content, source, doc_type)
    → Embedding Service: DocumentLoader.load(raw) → Document
    → Embedding Service: TextSplitter.split(text) → [Chunk]  O(N)
    → Embedding Service: SentenceTransformer.encode(chunks)  O(K×D)
    → Embedding Service: VectorStore.insert(vector_docs)     O(K)
    ← returns: {chunks_stored}
  ← Admin: {chunks_stored, source}
```
