"""Cases are real transcripts from the voice bake-off (voice-bakeoff/out/scores.json)."""
from check import MAX_CHUNK_CHARS, MIN_COVERAGE, chunks, coverage, passes, sentences

INTRO = "This one goes out to Sam, who still owes me a tenner. Turn it up, and enjoy!"
NAMES = "Big love to Siobhan and Niamh in Dublin. This is for the dancefloor at Pacha, Ibiza."
TRACK = "So good. It's called Wow, from Hot Since 82. And before that, Rock-A-Lot from Frankie and Sandrino."


def test_complete_renders_pass_despite_misheard_names():
    assert passes(NAMES, "Big love to Shioven and Neymar in Dublin. This is for the dance floor, Pacha Ibiza.")
    assert passes(NAMES, "Big love to Savan and Nev in Dublin. This is for the dance floor at Pacha Ibiza.")
    assert passes(TRACK, "It's called Wow from HotSins82 and before that, Rocke a lot from Frankie and Sandronow.")
    assert passes(INTRO, "This one goes out to Sam, who still owes me a tenner. Turn it up and enjoy.")


def test_dropped_words_fail():
    assert not passes(INTRO, "This one goes out to sad, turn it up and enjoy.")
    assert not passes(INTRO, "This one goes out to Sam, who still owes me a tenner.")
    assert not passes(TRACK, "So good. It's called wow from HotSense80 and before that.")
    assert not passes(NAMES, "Big love to Siobhan. This is for the dance floor at Pachao Ibiza.")


def test_sentences():
    assert sentences(INTRO) == ["This one goes out to Sam, who still owes me a tenner.", "Turn it up, and enjoy!"]


LONG = (
    "Here is a belter of an essential mix, one of the most eclectic, intelligent and non mainstream playlists "
    "you'll ever hear go the mosey, I P L U sexy lover"
)


def test_a_dropped_ending_fails_even_when_most_words_were_said():
    # A real render: the model stopped early, yet 81% of the letters were heard
    heard = "Here is a belter of an essential mix, one of the most eclectic intelligent and non-mainstream playlists you'll ever hear."
    assert coverage(LONG, heard) < MIN_COVERAGE
    assert passes(LONG, heard + " Go the mosey, IPLU sexy lover.")


def test_long_sentences_are_rendered_in_clauses():
    assert chunks(INTRO) == sentences(INTRO)
    assert chunks(LONG) == [
        "Here is a belter of an essential mix, one of the most eclectic,",
        "intelligent and non mainstream playlists you'll ever hear go the mosey, I P L U sexy lover",
    ]
    assert all(len(c) <= MAX_CHUNK_CHARS for c in chunks(LONG))


def test_dropping_the_last_two_words_fails():
    # A real render of the clause above: "sexy lover" never came out
    clause = chunks(LONG)[1]
    assert not passes(clause, "Intelligent and non-mainstream playlist you'll ever hear go the Mosey. IPL use.")
