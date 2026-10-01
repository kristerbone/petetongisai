"""Did a render say all its words? Compare the text with what speech recognition heard.

Coverage is the share of the text's letters and digits that appear, in order, in the
transcript. Mis-heard names ("Siobhan" -> "Shioven") cost a few characters; a dropped
clause costs many. In the voice bake-off every render with dropped words scored below
0.80 and every complete one scored above it.
"""
import difflib
import re

MIN_COVERAGE = 0.80


def compact(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


def coverage(text: str, heard: str) -> float:
    a, b = compact(text), compact(heard)
    if not a:
        return 1.0
    blocks = difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks()
    return sum(m.size for m in blocks) / len(a)


def passes(text: str, heard: str) -> bool:
    return coverage(text, heard) >= MIN_COVERAGE


def sentences(text: str) -> list[str]:
    """Chatterbox renders one sentence at a time; long inputs drift otherwise."""
    return [s for s in re.split(r"(?<=[.?!])\s+", text.strip()) if s]
