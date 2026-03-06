"""
Strategy Pattern — DocumentLoader interface.

Architectural purpose:
    Decouples document parsing from the ingestion pipeline. Adding support for
    a new format (e.g. PDFLoader) requires only a new concrete class — no
    changes to IngestionService (Open/Closed Principle).

Time complexity:
    Implementations must be O(N) in document length.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class Document:
    """Intermediate representation produced by a loader."""

    content: str
    source: str
    metadata: dict[str, Any] = field(default_factory=dict)


class DocumentLoader(ABC):
    """Abstract base class for all document loaders.

    Concrete subclasses implement format-specific text extraction while
    preserving a uniform contract for IngestionService.
    """

    @abstractmethod
    def load(self, raw: str, source: str, metadata: dict[str, Any] | None = None) -> Document:
        """Parse raw input and return a normalised Document.

        Args:
            raw:      Raw document string (file content, API payload, etc.).
            source:   Logical identifier for the document (path, URL, ID).
            metadata: Optional key-value annotations to attach to the document.

        Returns:
            Document with cleaned content ready for chunking.

        Time complexity: O(N) where N is len(raw).
        """
