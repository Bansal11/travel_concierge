---
sidebar_position: 1
---

# Docker Deployment

## Local development

```bash
cp .env.example .env
# Edit .env: set POSTGRES_PASSWORD and ANTHROPIC_API_KEY

docker compose up --build
```

All five services start in dependency order. The `--build` flag rebuilds images when source code changes.

## Service URLs (local)

| Service | URL | Purpose |
|---|---|---|
| Frontend | http://localhost:3000 | User chat + admin panel |
| API Gateway | http://localhost:8000 | REST API + Swagger UI at `/docs` |
| Embedding Service | http://localhost:8001 | Internal ML service + Swagger at `/docs` |
| Documentation | http://localhost:4000 | This site |
| PostgreSQL | localhost:5432 | Internal only |

## Useful commands

```bash
# Start in background
docker compose up -d

# Follow logs for a specific service
docker compose logs -f embedding_service

# Restart a single service after code change
docker compose up -d --build api_gateway

# Stop all services (preserves database volume)
docker compose down

# Stop and delete all data (full reset)
docker compose down -v
```

## Production considerations

### 1. Restrict CORS

In `embedding_service/app/main.py`, change:

```python
allow_origins=["*"]
```

to your frontend domain:

```python
allow_origins=["https://your-frontend-domain.com"]
```

### 2. Set NEXT_PUBLIC_GATEWAY_URL at build time

Since `NEXT_PUBLIC_*` variables are inlined at Next.js build time, set the correct public gateway URL before building:

```bash
# In your CI/CD pipeline
NEXT_PUBLIC_GATEWAY_URL=https://api.your-domain.com docker compose up --build frontend
```

### 3. Use a managed PostgreSQL

Replace the `postgres` service in `docker-compose.yml` with your managed DB connection string. Ensure the `pgvector` extension is installed:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 4. Separate `embedding_dim` per model

If you switch embedding models, update `.env`:

```
EMBEDDING_MODEL=intfloat/e5-large-v2
EMBEDDING_DIM=1024
```

Then re-create the `document_chunks` table with the correct vector dimension.

### 5. Secure the admin panel

Add authentication middleware to the Next.js `/admin` route before going to production. The current implementation has no access control.

## CI/CD (GitHub Actions)

The `.github/workflows/ci.yml` pipeline runs on every push to `main`:

1. **Python** — `ruff` lint + `mypy` typecheck + `pytest`
2. **Node.js** — `tsc --noEmit` + `jest`
3. **Docker** — builds both service images to catch Dockerfile errors early

Add a deployment job to push images to a registry and trigger a remote deployment:

```yaml
- name: Push to registry
  run: |
    docker tag travel-embedding:ci ghcr.io/Bansal11/travel-embedding:latest
    docker push ghcr.io/Bansal11/travel-embedding:latest
```
