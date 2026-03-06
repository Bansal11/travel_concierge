---
id: intro
title: Introduction
sidebar_position: 1
slug: /
---

# Travel Concierge

**Travel Concierge** is a production-ready, AI-powered Retrieval-Augmented Generation (RAG) platform for B2C holiday package discovery. It enables users to ask natural-language questions about travel packages and receive accurate, source-grounded answers — eliminating hallucinations through a two-stage retrieval pipeline.

## What it does

| Capability | Detail |
|---|---|
| **Semantic search** | Embeds queries and documents with a bi-encoder, retrieves candidates using HNSW approximate KNN |
| **Re-ranking** | Cross-encoder scores each (query, passage) pair for precision before injecting context into the LLM |
| **Grounded answers** | Claude generates answers strictly from retrieved context, citing source documents |
| **Package management** | Admins upload markdown or JSON holiday packages; the system chunks, embeds, and indexes them automatically |
| **Conversational memory** | Multi-turn history is passed to the LLM for coherent, contextual dialogue |

## System overview

```
Browser (React / Next.js)
  ├── /chat   ← user asks questions
  └── /admin  ← admin uploads packages

         ↕ HTTP

API Gateway (Node.js / Fastify)
  ├── Orchestrates RAG pipeline
  ├── Calls Embedding Service for retrieval
  └── Calls Claude API for generation

         ↕ HTTP

Embedding & Retrieval Service (Python / FastAPI)
  ├── Chunks and embeds documents on ingestion
  ├── HNSW KNN search via pgvector
  └── Cross-encoder re-ranking

         ↕ asyncpg

PostgreSQL + pgvector
  ├── document_chunks (384-dim HNSW index)
  └── users, chat_sessions (relational)
```

## Key design decisions

- **Strict service isolation** — The gateway never touches the database. All ML and SQL lives in the embedding service.
- **Strategy + Repository patterns** — Every major algorithm (loader, splitter, vector store) is behind an interface, making components independently testable and swappable.
- **HNSW indexing** — Reduces vector KNN search from O(N) to O(log N); configured at schema level in `db/init.sql`.
- **Two-stage retrieval** — Bi-encoder recall (fast) + cross-encoder precision (accurate) minimises both latency and hallucination.

## Quick links

- [Installation →](./getting-started/installation)
- [Quick Start →](./getting-started/quick-start)
- [Architecture →](./architecture/overview)
- [Gateway API Reference →](./api-reference/gateway)
