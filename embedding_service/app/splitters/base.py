"""
Strategy Pattern — TextSplitter interface.

Architectural purpose:
    Decouples chunking strategy from IngestionService. Naive character splitting
    and context-preserving sliding-window splitting share the same contract,
    allowing runtime substitution without touching business logic.

Time complexity:
    All implementations guarantee O(N) in input length.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class Chunk:
    """A single text chunk produced by a splitter."""

    content: str
    chunk_index: int  # position within the original document


class TextSplitter(ABC):
    """Abstract base for all text splitting strategies."""

    @abstractmethod
    def split(self, text: str) -> list[Chunk]:
        """Divide text into overlapping or non-overlapping chunks.

        Args:
            text: Normalised document text (output of a DocumentLoader).

        Returns:
            Ordered list of Chunk objects.

        Time complexity: O(N) where N is len(text).
        """
