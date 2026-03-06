FROM python:3.12-slim

WORKDIR /app

# Install system deps for sentence-transformers
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

# Pre-download models at build time to avoid cold-start latency
ARG EMBEDDING_MODEL=all-MiniLM-L6-v2
ARG RERANKER_MODEL=cross-encoder/ms-marco-MiniLM-L-6-v2
RUN python -c "from sentence_transformers import SentenceTransformer, CrossEncoder; \
    SentenceTransformer('${EMBEDDING_MODEL}'); \
    CrossEncoder('${RERANKER_MODEL}')"

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
