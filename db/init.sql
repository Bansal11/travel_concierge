-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User metadata (relational) and document embeddings (vector) in the same
-- PostgreSQL instance to eliminate data synchronization latency (HLD §2).

CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email       TEXT UNIQUE NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Stores chunked document content alongside its vector embedding.
-- Embedding dimension matches all-MiniLM-L6-v2 (384-dim).
-- Override EMBEDDING_DIM env var when switching models.
CREATE TABLE IF NOT EXISTS document_chunks (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source      TEXT NOT NULL,
    content     TEXT NOT NULL,
    metadata    JSONB DEFAULT '{}',
    embedding   VECTOR(384) NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index for approximate KNN search using cosine distance.
-- Reduces search from O(N) to O(log N) vs. brute-force.
-- m=16: connections per node (higher = better recall, more memory)
-- ef_construction=64: search width during index build (higher = better recall, slower build)
CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx
    ON document_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Index for source-based filtering (common query pattern)
CREATE INDEX IF NOT EXISTS document_chunks_source_idx
    ON document_chunks (source);

-- Chat history for conversation context
CREATE TABLE IF NOT EXISTS chat_sessions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id  UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
