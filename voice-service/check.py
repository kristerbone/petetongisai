"""Did a render say all its words? Compare the text with what speech recognition heard.

Coverage is the share of the text's letters and digits that appear, in order, in the
transcript. Mis-heard names ("Siobhan" -> "Shioven") cost a few characters; a dropped
clause costs many. In the voice bake-off every render with dropped words scored below
0.80 and every complete one scored above it.

On a long line, though, the model can stop early and still say 80% of it, so the last 15% is
scored on its own too: if most of it is missing, that's the line's coverage. (Not every miss:
Whisper often mangles a name at the end of a complete take, "Pacha, Ibiza" -> "Pocce Bisa".)
"""
import difflib
import re

MIN_COVERAGE = 0.80
ENDING_SHARE = 0.15  # the end of the line's letters...
MIN_ENDING = 0.50  # ...must be at least half heard
MAX_CHUNK_CHARS = 90  # longer sentences are rendered a clause at a time


def compact(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


def coverage(text: str, heard: str) -> float:
    a, b = compact(text), compact(heard)
    if not a:
        return 1.0
    blocks = difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks()
    overall = sum(m.size for m in blocks) / len(a)
    # Letters of the text's ending that were heard (blocks are positions in the text)
    start = int(len(a) * (1 - ENDING_SHARE))
    ending = sum(max(0, m.a + m.size - max(m.a, start)) for m in blocks) / (len(a) - start)
    return ending if ending < MIN_ENDING else overall


def passes(text: str, heard: str) -> bool:
    return coverage(text, heard) >= MIN_COVERAGE


def sentences(text: str) -> list[str]:
    """Chatterbox renders one sentence at a time; long inputs drift otherwise."""
    return [s for s in re.split(r"(?<=[.?!])\s+", text.strip()) if s]


def chunks(text: str) -> list[str]:
    """What gets rendered in one go: each sentence, or a long one's clauses (split after commas
    and the like), merged back together while they fit in MAX_CHUNK_CHARS. The fine-tuned
    model tends to stop early on long sentences."""
    out = []
    for sentence in sentences(text):
        if len(sentence) <= MAX_CHUNK_CHARS:
            out.append(sentence)
            continue
        current = ""
        for clause in re.split(r"(?<=[,;:])\s+", sentence):
            if current and len(current) + 1 + len(clause) > MAX_CHUNK_CHARS:
                out.append(current)
                current = clause
            else:
                current = f"{current} {clause}" if current else clause
        out.append(current)
    return out
