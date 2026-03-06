"""
Concrete Strategy — JSONLoader.

Flattens a JSON object into readable key-value prose, suitable for holiday
package data (e.g. {destination, price, itinerary, inclusions}).

Time complexity: O(N) — single recursive traversal of the JSON tree.
"""
import json
from typing import Any

from .base import Document, DocumentLoader


class JSONLoader(DocumentLoader):
    """Loads holiday package data from JSON and converts it to prose."""

    def load(self, raw: str, source: str, metadata: dict[str, Any] | None = None) -> Document:
        """Parse JSON and serialise to searchable plain text.

        Args:
            raw:      JSON-encoded string.
            source:   Document identifier.
            metadata: Optional annotations.

        Returns:
            Document whose content is a flat prose representation.

        Raises:
            ValueError: If raw is not valid JSON.

        Time complexity: O(N) — single-pass tree traversal.
        """
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ValueError(f"JSONLoader: invalid JSON from source '{source}': {exc}") from exc

        lines: list[str] = []
        self._flatten(data, prefix="", lines=lines)
        content = "\n".join(lines)
        return Document(content=content, source=source, metadata=metadata or {})

    def _flatten(self, node: Any, prefix: str, lines: list[str]) -> None:
        """Recursively flatten a JSON node into key: value lines.

        Time complexity: O(N) where N is total number of leaf values.
        """
        if isinstance(node, dict):
            for key, value in node.items():
                child_prefix = f"{prefix}.{key}" if prefix else key
                self._flatten(value, child_prefix, lines)
        elif isinstance(node, list):
            for idx, item in enumerate(node):
                self._flatten(item, f"{prefix}[{idx}]", lines)
        else:
            label = prefix if prefix else "value"
            lines.append(f"{label}: {node}")
