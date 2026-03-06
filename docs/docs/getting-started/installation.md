---
sidebar_position: 1
---

# Installation

## Prerequisites

| Requirement | Minimum version | Notes |
|---|---|---|
| Docker | 24.x | Required for all services |
| Docker Compose | v2 | `docker compose` (not `docker-compose`) |
| Anthropic API key | — | [Get one here](https://console.anthropic.com) |
| Node.js | 22.x | Only needed for local development outside Docker |
| Python | 3.12 | Only needed for local development outside Docker |

## Clone the repository

```bash
git clone https://github.com/Bansal11/travel_concierge.git
cd travel_concierge
```

## Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in the two required secrets:

```bash
# Required
POSTGRES_PASSWORD=your_secure_password_here
ANTHROPIC_API_KEY=sk-ant-api03-...

# Optional — defaults work for local Docker setup
POSTGRES_DB=travel_concierge
POSTGRES_USER=travel
EMBEDDING_MODEL=all-MiniLM-L6-v2
RERANKER_MODEL=cross-encoder/ms-marco-MiniLM-L-6-v2
TOP_K=10
TOP_N=3
LLM_MODEL=claude-sonnet-4-6
NEXT_PUBLIC_GATEWAY_URL=http://localhost:8000
```

:::caution
Never commit `.env` to git. It is listed in `.gitignore` by default.
:::

## Start all services

```bash
docker compose up --build
```

This starts five containers in dependency order:

| Container | Port | Description |
|---|---|---|
| `travel_postgres` | 5432 | PostgreSQL 16 + pgvector extension |
| `travel_embedding` | 8001 | Python FastAPI embedding & retrieval service |
| `travel_gateway` | 8000 | Node.js Fastify API gateway |
| `travel_frontend` | 3000 | Next.js user + admin interface |
| `travel_docs` | 4000 | This documentation site |

:::info First run
The embedding service Dockerfile pre-downloads `all-MiniLM-L6-v2` and `cross-encoder/ms-marco-MiniLM-L-6-v2` at build time. The first `docker compose up --build` takes 5–10 minutes depending on your internet connection.
:::

## Verify services are healthy

```bash
docker compose ps
# All containers should show "healthy" or "running"

curl http://localhost:8000/health   # {"status":"ok"}
curl http://localhost:8001/health   # {"status":"ok"}
```

## Local development (without Docker)

If you prefer running services locally for faster iteration:

### Embedding service

```bash
cd embedding_service
pip install -r requirements.txt

# Requires a running PostgreSQL with pgvector
export DATABASE_URL=postgresql://travel:password@localhost:5432/travel_concierge
uvicorn app.main:app --reload --port 8001
```

### API gateway

```bash
cd api_gateway
npm ci
npm run dev   # ts-node-dev hot reload on port 8000
```

### Frontend

```bash
cd frontend
npm ci
npm run dev   # Next.js dev server on port 3000
```

### Documentation site

```bash
cd docs
npm ci
npm start     # Docusaurus dev server on port 4000
```
