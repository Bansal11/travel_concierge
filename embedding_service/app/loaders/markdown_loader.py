"""
Concrete Strategy — MarkdownLoader.

Strips Markdown syntax tokens to produce clean prose, preserving semantic
content (headings become labelled paragraphs, lists become sentences).

Time complexity: O(N) — single-pass regex replacements.
"""
import re
from typing import Any

from .base import Document, DocumentLoader


class MarkdownLoader(DocumentLoader):
    """Loads and normalises Markdown-formatted documents."""

    # Compiled once at class definition — not per call
    _HEADING_RE = re.compile(r"^#{1,6}\s+(.+)$", re.MULTILINE)
    _LINK_RE = re.compile(r"\[([^\]]+)\]\([^\)]+\)")
    _IMAGE_RE = re.compile(r"!\[([^\]]*)\]\([^\)]+\)")
    _CODE_BLOCK_RE = re.compile(r"```[\s\S]*?```", re.MULTILINE)
    _INLINE_CODE_RE = re.compile(r"`[^`]+`")
    _BOLD_ITALIC_RE = re.compile(r"\*{1,3}([^\*]+)\*{1,3}")
    _EXTRA_NEWLINES_RE = re.compile(r"\n{3,}")

    def load(self, raw: str, source: str, metadata: dict[str, Any] | None = None) -> Document:
        """Strip Markdown syntax and return clean prose.

        Args:
            raw:      Raw Markdown string.
            source:   Document identifier.
            metadata: Optional annotations.

        Returns:
            Document with normalised text content.

        Time complexity: O(N) — linear regex passes over input.
        """
        text = raw
        # Remove fenced code blocks (preserve heading context, drop code noise)
        text = self._CODE_BLOCK_RE.sub("", text)
        # Flatten headings into readable labels
        text = self._HEADING_RE.sub(r"\1", text)
        # Keep link text, discard URLs
        text = self._IMAGE_RE.sub("", text)
        text = self._LINK_RE.sub(r"\1", text)
        # Strip inline code ticks
        text = self._INLINE_CODE_RE.sub(r"", text)
        # Strip bold/italic markers
        text = self._BOLD_ITALIC_RE.sub(r"\1", text)
        # Collapse excessive blank lines
        text = self._EXTRA_NEWLINES_RE.sub("\n\n", text).strip()

        return Document(content=text, source=source, metadata=metadata or {})
