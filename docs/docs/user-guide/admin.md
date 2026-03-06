---
sidebar_position: 2
---

# Admin Panel

The admin panel at **http://localhost:3000/admin** is the interface for managing the knowledge base — the set of holiday packages that the AI concierge can answer questions about.

:::info Access control
In the current version, the admin panel has no authentication. In production, place it behind an authentication layer (e.g. Next.js middleware + session cookie).
:::

## Uploading a package

### Via file upload

1. Click **Choose file** and select a `.md`, `.txt`, or `.json` file
2. The **Source name** field auto-fills with the filename — edit it if needed
3. The **Format** selector auto-detects from the file extension
4. Click **Upload Package**

### Via paste

1. Enter a **Source name** (e.g. `bali-summer-2025.md`)
2. Select the **Format** (Markdown or JSON)
3. Paste your content into the textarea
4. Click **Upload Package**

### Supported formats

#### Markdown

Best for rich, human-written package descriptions:

```markdown
# Bali Explorer — 7 Nights

## Overview
A premium 7-night holiday to Bali, Indonesia.

## Inclusions
- Return flights from London Heathrow
- 5-star beachfront resort
- Daily breakfast and dinner

## Pricing
From £1,850 per person based on two sharing.
```

#### JSON

Best for structured product data from a CMS or booking system:

```json
{
  "destination": "Maldives",
  "duration_nights": 5,
  "price_gbp": 2400,
  "inclusions": ["overwater bungalow", "all-inclusive meals", "snorkelling"],
  "hotel": {
    "name": "Grand Ocean Resort",
    "stars": 5,
    "rating": 4.9
  },
  "best_months": ["November", "December", "April"]
}
```

The JSON loader flattens nested objects into `key.subkey: value` pairs for embedding, so deeply nested structures are fully searchable.

### What happens after upload

1. The content is sent to the API Gateway → Embedding Service
2. The Embedding Service runs the content through a `DocumentLoader` (Markdown or JSON)
3. The cleaned text is split into overlapping chunks using the sliding-window algorithm
4. Each chunk is embedded with `all-MiniLM-L6-v2` (384-dim vector)
5. All chunks are batch-inserted into PostgreSQL with their HNSW index entries updated
6. The **Ingested Packages** list refreshes automatically showing the new source

A success banner shows how many chunks were created, e.g. `Uploaded 4 chunks for "bali-summer-2025.md"`.

## Managing packages

The **Ingested Packages** section lists all sources currently indexed, showing:

- **Source name** — the identifier used at upload time
- **Chunk count** — how many text chunks were created
- **Last updated** — when the most recent chunk was ingested

### Refreshing the list

Click the **Refresh** button or reload the page to pull the latest state from the server.

### Deleting a package

Click **Delete** next to any package and confirm the prompt. This removes all chunks for that source from the vector database. The package will no longer be retrievable in chat.

:::warning Permanent deletion
Deleting a package is irreversible. Re-upload the document to restore it.
:::

## Re-uploading / updating a package

The system does not automatically replace chunks when you re-upload the same source name. To update a package:

1. **Delete** the existing package from the list
2. **Upload** the updated version

This ensures no stale chunks remain from the previous version.
