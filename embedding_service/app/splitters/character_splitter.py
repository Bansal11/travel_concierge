"""
Concrete Strategy — CharacterSplitter (naive).

Splits text at character boundaries with a fixed stride. Simple and fast,
but may break sentences mid-word. Use SlidingWindowSplitter for better
semantic preservation.

Time complexity: O(N) — single pass through the character array.
Space complexity: O(N) — chunks are sub-strings of the original.
"""
from .base import Chunk, TextSplitter


class CharacterSplitter(TextSplitter):
    """Splits text by fixed character count with optional overlap.

    Args:
        chunk_size:    Maximum characters per chunk.
        chunk_overlap: Number of trailing characters from the previous chunk
                       to prepend to the next (context bridging).
    """

    def __init__(self, chunk_size: int = 512, chunk_overlap: int = 64) -> None:
        if chunk_overlap >= chunk_size:
            raise ValueError("chunk_overlap must be less than chunk_size")
        self._chunk_size = chunk_size
        self._chunk_overlap = chunk_overlap

    def split(self, text: str) -> list[Chunk]:
        """Split text by character count.

        Time complexity: O(N) — stride advances by (chunk_size - overlap) each
        iteration, so total iterations = N / stride ≈ N / chunk_size.
        """
        chunks: list[Chunk] = []
        stride = self._chunk_size - self._chunk_overlap
        start = 0
        index = 0

        while start < len(text):
            end = min(start + self._chunk_size, len(text))
            chunk_text = text[start:end].strip()
            if chunk_text:
                chunks.append(Chunk(content=chunk_text, chunk_index=index))
                index += 1
            start += stride

        return chunks
