---
sidebar_position: 2
---

# Design Patterns & DSA

## Design patterns

### Strategy Pattern — DocumentLoader

**Problem:** The system must ingest documents in multiple formats (Markdown, JSON) without the ingestion pipeline knowing which format it is handling.

**Solution:** Define a `DocumentLoader` ABC with a single `load()` method. Concrete classes (`MarkdownLoader`, `JSONLoader`) implement format-specific parsing. `IngestionService` receives a loader via constructor injection.

```python
# base.py
class DocumentLoader(ABC):
    @abstractmethod
    def load(self, raw: str, source: str, ...) -> Document: ...

# Concrete strategies
class MarkdownLoader(DocumentLoader): ...   # strips Markdown syntax
class JSONLoader(DocumentLoader): ...       # flattens JSON to key: value prose
```

Adding a new format (e.g. `PDFLoader`) requires only a new class — no changes to `IngestionService`.

**Files:** `embedding_service/app/loaders/`

---

### Strategy Pattern — TextSplitter

**Problem:** Chunking strategy needs to vary: fast & simple for bulk ingestion, context-aware for quality indexing.

**Solution:** `TextSplitter` ABC with two concrete strategies:

| Strategy | Algorithm | Best for |
|---|---|---|
| `CharacterSplitter` | Fixed-size character windows with overlap | Fast bulk ingestion |
| `SlidingWindowSplitter` | Word-boundary sliding window, O(N) | Production — preserves semantic context |

```python
class TextSplitter(ABC):
    @abstractmethod
    def split(self, text: str) -> list[Chunk]: ...

class SlidingWindowSplitter(TextSplitter):
    # Never cuts a word in half — critical for embedding quality
    def split(self, text: str) -> list[Chunk]:
        words = text.split()               # O(N) tokenisation
        for start in range(0, len(words), self._step_words):
            yield Chunk(" ".join(words[start:start + self._window_words]))
```

**Files:** `embedding_service/app/splitters/`

---

### Repository Pattern — VectorStore

**Problem:** Core business logic must not contain raw SQL. Database can change (pgvector → Weaviate) without rewriting services.

**Solution:** `VectorStore` ABC isolates all SQL behind four abstract methods. `PgVectorStore` is the only class that contains SQL. Services depend on the interface.

```python
class VectorStore(ABC):
    async def insert(self, documents: list[VectorDocument]) -> list[str]: ...
    async def search(self, query_embedding, top_k) -> list[VectorDocument]: ...
    async def list_sources(self) -> list[dict]: ...
    async def delete_by_source(self, source: str) -> int: ...
```

In unit tests, the interface is replaced with an `AsyncMock` — no database required.

**Files:** `embedding_service/app/store/`

---

## DSA foundations

### HNSW — O(log N) approximate KNN

The `document_chunks` table is indexed with HNSW (Hierarchical Navigable Small World), a graph-based data structure that organises vectors in a multi-layer proximity graph.

```sql
-- db/init.sql
CREATE INDEX document_chunks_embedding_hnsw_idx
    ON document_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
```

| Parameter | Value | Effect |
|---|---|---|
| `m` | 16 | Max connections per node. Higher = better recall, more memory |
| `ef_construction` | 64 | Search width during build. Higher = better recall, slower build |
| `hnsw.ef_search` | 40 (at query time) | Wider beam at search time — set per connection |

**Complexity:** O(log N) search vs O(N) brute-force IVFFlat.

---

### Sliding Window — O(N) semantic chunking

The `SlidingWindowSplitter` uses a word-level sliding window to preserve context across chunk boundaries.

```
Original: "Return flights, beachfront hotel, daily breakfast, airport transfers, cultural tour"
           ←── window (100 words) ───→
                        ←── overlap (25 words) ───→
                                   ←── next window ───→
```

Words in the overlap zone appear in both adjacent chunks, ensuring that sentences spanning a boundary are fully represented in at least one chunk. This prevents embedding fragmentation where a key phrase like "£1,850 per person" is split across chunks.

**Complexity:** O(N) — each word is visited at most `ceil(window/step)` times (a small constant).

---

### Two-stage retrieval — recall + precision

```
Query: "What's included in the Maldives package?"
          │
          ▼
Stage 1: Bi-encoder (fast)
  SentenceTransformer.encode(query) → 384-dim vector
  pgvector HNSW → top-K=10 candidates  ← O(log N)
          │
          ▼
Stage 2: Cross-encoder re-ranking (precise)
  CrossEncoder.predict([(query, chunk_i) for i in range(K)])
  Sort by score → top-N=3               ← O(K) where K=10
          │
          ▼
  3 highly relevant chunks injected into LLM context
```

**Why two stages?** Bi-encoders are fast (independent encoding) but less accurate. Cross-encoders jointly attend to both texts and are far more accurate but too slow to run over the full corpus. The two-stage approach gets both speed and accuracy.

---

### Cosine similarity

All vector comparisons use cosine similarity:

```
cosine_similarity(A, B) = (A · B) / (|A| × |B|)
```

In pgvector, the `<=>` operator computes **cosine distance** (1 − similarity). The HNSW index is built with `vector_cosine_ops` for this metric.

```sql
-- Score = cosine similarity (higher = more similar)
SELECT 1 - (embedding <=> $1::vector) AS score
FROM document_chunks
ORDER BY embedding <=> $1::vector   -- ascending distance = descending similarity
LIMIT $2;
```
