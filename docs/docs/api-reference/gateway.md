---
sidebar_position: 1
---

# Gateway API

**Base URL:** `http://localhost:8000`

**Interactive explorer:** [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger UI)

**OpenAPI spec:** [Download YAML](/openapi/gateway.yaml)

---

## POST /api/v1/chat

Execute a RAG query: retrieve relevant context chunks, inject them into a Claude prompt, and return a grounded answer.

### Request body

```json
{
  "query": "What beach holidays do you have under £2,000?",
  "history": [
    { "role": "user", "content": "Tell me about Bali." },
    { "role": "assistant", "content": "The Bali Explorer package includes..." }
  ],
  "top_n": 3
}
```

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `query` | `string` | ✅ | — | Natural-language question |
| `history` | `Message[]` | ❌ | `[]` | Prior conversation turns for context |
| `top_n` | `integer` | ❌ | `3` | Number of re-ranked chunks to inject (1–10) |

**Message object:**

| Field | Type | Values |
|---|---|---|
| `role` | `string` | `"user"` \| `"assistant"` |
| `content` | `string` | Message text |

### Response `200 OK`

```json
{
  "answer": "We have two beach holidays under £2,000: the Bali Explorer at £1,850 per person and the Sri Lanka Highlights at £1,650 per person...",
  "sources": [
    { "id": "3f2a1b...", "source": "bali-explorer-7n.md", "score": 4.21 },
    { "id": "9c8d7e...", "source": "sri-lanka-10n.md",    "score": 3.87 }
  ],
  "latency": {
    "retrieval_ms": 18.4,
    "rerank_ms": 31.2
  },
  "usage": {
    "model": "claude-sonnet-4-6",
    "input_tokens": 412,
    "output_tokens": 94
  }
}
```

| Field | Type | Description |
|---|---|---|
| `answer` | `string` | Claude's grounded answer |
| `sources` | `Source[]` | Documents used to generate the answer |
| `sources[].id` | `string` | UUID of the chunk in the vector store |
| `sources[].source` | `string` | Document identifier (e.g. filename) |
| `sources[].score` | `number` | Cross-encoder relevance score (higher = more relevant) |
| `latency.retrieval_ms` | `number` | Time for pgvector HNSW search |
| `latency.rerank_ms` | `number` | Time for cross-encoder re-ranking |
| `usage.input_tokens` | `integer` | LLM input tokens consumed |
| `usage.output_tokens` | `integer` | LLM output tokens consumed |

### Error responses

| Status | Error | Cause |
|---|---|---|
| `400` | `ValidationError` | Missing `query` field or invalid `top_n` range |
| `503` | `EmbeddingServiceUnavailable` | Embedding service is down or timed out |
| `503` | `LlmServiceUnavailable` | Anthropic API error or timeout |

---

## POST /api/v1/ingest

Chunk, embed, and store a document in the vector database.

### Request body

```json
{
  "content": "# Bali Explorer\n\n## Inclusions\n- Return flights\n- 5-star resort",
  "source": "bali-explorer-7n.md",
  "doc_type": "markdown",
  "metadata": {
    "category": "beach",
    "region": "Asia"
  }
}
```

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `content` | `string` | ✅ | — | Raw document text |
| `source` | `string` | ✅ | — | Unique identifier (filename, URL, ID) |
| `doc_type` | `string` | ❌ | `"markdown"` | `"markdown"` or `"json"` |
| `metadata` | `object` | ❌ | `{}` | Key-value annotations stored with each chunk |

### Response `200 OK`

```json
{ "chunks_stored": 4, "source": "bali-explorer-7n.md" }
```

### Error responses

| Status | Error | Cause |
|---|---|---|
| `422` | `ValidationError` | Invalid JSON format when `doc_type` is `"json"` |
| `503` | Service error | Embedding pipeline or DB failure |

---

## GET /api/v1/packages

List all document sources currently indexed, with chunk counts and timestamps.

### Response `200 OK`

```json
{
  "packages": [
    {
      "source": "bali-explorer-7n.md",
      "chunk_count": 4,
      "last_updated": "2026-03-06T14:32:11.000Z"
    },
    {
      "source": "maldives-overwater-5n.json",
      "chunk_count": 2,
      "last_updated": "2026-03-06T14:30:05.000Z"
    }
  ],
  "total": 2
}
```

---

## DELETE /api/v1/packages/:source

Remove all chunks for the specified source from the vector database.

### Path parameter

| Parameter | Description |
|---|---|
| `source` | The source identifier used at ingestion time |

```bash
curl -X DELETE http://localhost:8000/api/v1/packages/bali-explorer-7n.md
```

### Response `200 OK`

```json
{ "source": "bali-explorer-7n.md", "chunks_deleted": 4 }
```

### Error responses

| Status | Cause |
|---|---|
| `404` | No chunks found for the given source |
| `503` | Database error |

---

## GET /health

Liveness check for Docker healthcheck and monitoring.

```bash
curl http://localhost:8000/health
# {"status":"ok"}
```
