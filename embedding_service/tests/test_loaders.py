"""Unit tests for DocumentLoader strategy implementations."""
import pytest

from app.loaders.json_loader import JSONLoader
from app.loaders.markdown_loader import MarkdownLoader


class TestMarkdownLoader:
    def setup_method(self) -> None:
        self.loader = MarkdownLoader()

    def test_strips_headings(self) -> None:
        doc = self.loader.load("# Heading One\n\nBody text.", source="test.md")
        assert "# " not in doc.content
        assert "Heading One" in doc.content

    def test_strips_links_keeps_text(self) -> None:
        doc = self.loader.load("[Click here](https://example.com)", source="test.md")
        assert "Click here" in doc.content
        assert "https://" not in doc.content

    def test_strips_code_blocks(self) -> None:
        doc = self.loader.load("Text\n```python\ncode()\n```\nMore text.", source="test.md")
        assert "code()" not in doc.content
        assert "Text" in doc.content

    def test_strips_bold_italic(self) -> None:
        doc = self.loader.load("**bold** and *italic*", source="test.md")
        assert "**" not in doc.content
        assert "bold" in doc.content

    def test_preserves_source_and_metadata(self) -> None:
        doc = self.loader.load("text", source="my-doc.md", metadata={"author": "Alice"})
        assert doc.source == "my-doc.md"
        assert doc.metadata["author"] == "Alice"

    def test_empty_input(self) -> None:
        doc = self.loader.load("", source="empty.md")
        assert doc.content == ""


class TestJSONLoader:
    def setup_method(self) -> None:
        self.loader = JSONLoader()

    def test_flat_object(self) -> None:
        doc = self.loader.load('{"destination": "Bali", "price": 1500}', source="pkg.json")
        assert "destination: Bali" in doc.content
        assert "price: 1500" in doc.content

    def test_nested_object(self) -> None:
        doc = self.loader.load('{"hotel": {"name": "Grand", "stars": 5}}', source="pkg.json")
        assert "hotel.name: Grand" in doc.content
        assert "hotel.stars: 5" in doc.content

    def test_array_values(self) -> None:
        doc = self.loader.load('{"inclusions": ["flights", "hotel"]}', source="pkg.json")
        assert "inclusions[0]: flights" in doc.content
        assert "inclusions[1]: hotel" in doc.content

    def test_invalid_json_raises_value_error(self) -> None:
        with pytest.raises(ValueError, match="invalid JSON"):
            self.loader.load("not json", source="bad.json")

    def test_preserves_source(self) -> None:
        doc = self.loader.load('{"x": 1}', source="data.json")
        assert doc.source == "data.json"
