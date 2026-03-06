"""
Concrete Strategy — SlidingWindowSplitter (semantic context-preserving).

Uses a word-boundary-aware sliding window to split text. Unlike naive
character splitting, it never cuts a word in half, which is critical for
preserving embedding quality in travel package descriptions.

Algorithm:
    1. Tokenise input into words: O(N)
    2. Slide a window of `window_words` tokens, stepping by `step_words`: O(N)
    3. Rejoin each window into a string: O(window_words) per chunk

Overall time complexity: O(N) — each token is processed at most
    ceil(window_words / step_words) times (a small constant).
Space complexity: O(N) — proportional to total output chunk text.
"""
from .base import Chunk, TextSplitter


class SlidingWindowSplitter(TextSplitter):
    """Splits text with a word-level sliding window to preserve context.

    The overlap between consecutive chunks ensures that sentences spanning
    a chunk boundary appear in at least one complete chunk, reducing
    embedding fragmentation artifacts.

    Args:
        window_words: Number of words per chunk.
        step_words:   How many words to advance the window each step.
                      overlap = window_words - step_words words shared between
                      consecutive chunks.
    """

    def __init__(self, window_words: int = 100, step_words: int = 75) -> None:
        if step_words >= window_words:
            raise ValueError("step_words must be less than window_words to produce overlap")
        self._window_words = window_words
        self._step_words = step_words

    def split(self, text: str) -> list[Chunk]:
        """Apply sliding window at word boundaries.

        Time complexity: O(N) — linear in total token count.
        """
        words = text.split()  # O(N) tokenisation
        chunks: list[Chunk] = []
        index = 0

        for start in range(0, len(words), self._step_words):
            window = words[start : start + self._window_words]
            chunk_text = " ".join(window).strip()
            if chunk_text:
                chunks.append(Chunk(content=chunk_text, chunk_index=index))
                index += 1
            if start + self._window_words >= len(words):
                break  # last window already consumed all remaining words

        return chunks

    @classmethod
    def from_char_params(cls, chunk_size: int, chunk_overlap: int) -> "SlidingWindowSplitter":
        """Convenience constructor mapping character-based params to word counts.

        Assumes an average English word length of 5 characters + 1 space.
        """
        avg_word_len = 6
        window_words = max(1, chunk_size // avg_word_len)
        overlap_words = max(0, chunk_overlap // avg_word_len)
        step_words = max(1, window_words - overlap_words)
        return cls(window_words=window_words, step_words=step_words)
