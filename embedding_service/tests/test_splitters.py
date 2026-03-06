"""Unit tests for TextSplitter strategy implementations."""
import pytest

from app.splitters.character_splitter import CharacterSplitter
from app.splitters.sliding_window_splitter import SlidingWindowSplitter


class TestCharacterSplitter:
    def test_basic_split(self) -> None:
        text = "a" * 600
        splitter = CharacterSplitter(chunk_size=512, chunk_overlap=64)
        chunks = splitter.split(text)
        assert len(chunks) > 1
        assert all(len(c.content) <= 512 for c in chunks)

    def test_overlap(self) -> None:
        text = "abcdefghij"  # 10 chars
        splitter = CharacterSplitter(chunk_size=6, chunk_overlap=2)
        chunks = splitter.split(text)
        # chunk 0: [0:6] = "abcdef", chunk 1: [4:10] = "efghij"
        assert chunks[0].content[-2:] in chunks[1].content

    def test_chunk_indices_sequential(self) -> None:
        text = "word " * 200
        splitter = CharacterSplitter(chunk_size=100, chunk_overlap=20)
        chunks = splitter.split(text)
        assert [c.chunk_index for c in chunks] == list(range(len(chunks)))

    def test_empty_text(self) -> None:
        splitter = CharacterSplitter()
        assert splitter.split("") == []

    def test_short_text_single_chunk(self) -> None:
        text = "Hello world"
        splitter = CharacterSplitter(chunk_size=100, chunk_overlap=10)
        chunks = splitter.split(text)
        assert len(chunks) == 1
        assert chunks[0].content == text

    def test_invalid_overlap_raises(self) -> None:
        with pytest.raises(ValueError):
            CharacterSplitter(chunk_size=100, chunk_overlap=100)


class TestSlidingWindowSplitter:
    def test_basic_split(self) -> None:
        text = " ".join([f"word{i}" for i in range(300)])
        splitter = SlidingWindowSplitter(window_words=100, step_words=75)
        chunks = splitter.split(text)
        assert len(chunks) > 1

    def test_overlap_words(self) -> None:
        words = [f"w{i}" for i in range(10)]
        text = " ".join(words)
        splitter = SlidingWindowSplitter(window_words=6, step_words=4)
        chunks = splitter.split(text)
        # chunk 0 covers words 0-5, chunk 1 covers words 4-9
        # words 4 and 5 should appear in both chunks
        assert "w4" in chunks[0].content
        assert "w4" in chunks[1].content

    def test_no_word_cutting(self) -> None:
        """Sliding window must never split a word across chunk boundaries."""
        text = "This is a complete sentence with important travel terms."
        splitter = SlidingWindowSplitter(window_words=5, step_words=3)
        chunks = splitter.split(text)
        for chunk in chunks:
            for word in chunk.content.split():
                assert word in text  # all words are intact

    def test_chunk_indices_sequential(self) -> None:
        text = " ".join(["word"] * 500)
        splitter = SlidingWindowSplitter(window_words=100, step_words=75)
        chunks = splitter.split(text)
        assert [c.chunk_index for c in chunks] == list(range(len(chunks)))

    def test_empty_text(self) -> None:
        splitter = SlidingWindowSplitter()
        assert splitter.split("") == []

    def test_invalid_step_raises(self) -> None:
        with pytest.raises(ValueError):
            SlidingWindowSplitter(window_words=50, step_words=50)

    def test_from_char_params(self) -> None:
        splitter = SlidingWindowSplitter.from_char_params(chunk_size=512, chunk_overlap=64)
        assert splitter._window_words > splitter._step_words
