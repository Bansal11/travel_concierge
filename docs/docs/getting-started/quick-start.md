---
sidebar_position: 2
---

# Quick Start

This guide walks you from zero to a working chat conversation in under 5 minutes (after Docker build completes).

## 1. Upload a sample package

Once all services are running, open the admin panel at **http://localhost:3000/admin** or use curl:

```bash
curl -X POST http://localhost:8000/api/v1/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# Bali Explorer — 7 Nights\n\n## Overview\nA premium 7-night holiday to Bali, Indonesia. Perfect for couples and families.\n\n## Inclusions\n- Return flights from London Heathrow\n- 5-star beachfront resort accommodation\n- Daily breakfast and dinner\n- Airport transfers\n- Full-day Ubud cultural tour\n- Sunset dinner cruise\n\n## Pricing\nFrom £1,850 per person based on two sharing.\n\n## Best Time to Visit\nApril to October (dry season). Avoid school holidays for better pricing.",
    "source": "bali-explorer-7n.md",
    "doc_type": "markdown"
  }'
```

**Response:**
```json
{ "chunks_stored": 3, "source": "bali-explorer-7n.md" }
```

## 2. Ask a question

Open the chat interface at **http://localhost:3000/chat** or use curl:

```bash
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{ "query": "What does the Bali package include and how much does it cost?" }'
```

**Response:**
```json
{
  "answer": "The Bali Explorer 7-night package includes return flights from London Heathrow, 5-star beachfront resort accommodation, daily breakfast and dinner, airport transfers, a full-day Ubud cultural tour, and a sunset dinner cruise. Pricing starts from £1,850 per person based on two sharing.",
  "sources": [
    { "id": "3f2a...", "source": "bali-explorer-7n.md", "score": 4.21 }
  ],
  "latency": { "retrieval_ms": 18.4, "rerank_ms": 31.2 },
  "usage": { "model": "claude-sonnet-4-6", "input_tokens": 312, "output_tokens": 78 }
}
```

## 3. Upload a JSON package

The system also accepts structured JSON holiday data:

```bash
curl -X POST http://localhost:8000/api/v1/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "content": "{\"destination\": \"Maldives\", \"duration_nights\": 5, \"price_gbp\": 2400, \"inclusions\": [\"overwater bungalow\", \"all-inclusive meals\", \"snorkelling equipment\", \"seaplane transfer\"], \"best_months\": [\"November\", \"April\"], \"rating\": 4.9}",
    "source": "maldives-overwater-5n.json",
    "doc_type": "json"
  }'
```

## 4. Continue a conversation

Pass `history` to maintain context across turns:

```bash
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What about the Maldives option?",
    "history": [
      { "role": "user", "content": "What does the Bali package include?" },
      { "role": "assistant", "content": "The Bali Explorer package includes..." }
    ]
  }'
```

## 5. Manage packages

```bash
# List all ingested packages
curl http://localhost:8000/api/v1/packages

# Delete a package
curl -X DELETE http://localhost:8000/api/v1/packages/bali-explorer-7n.md
```

## Next steps

- Browse all uploaded packages in the **[Admin panel →](/user-guide/admin)**
- Explore the full **[API Reference →](/api-reference/gateway)**
- Understand the **[Architecture →](/architecture/overview)**
