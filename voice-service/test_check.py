"""Cases are real transcripts from the voice bake-off (voice-bakeoff/out/scores.json)."""
from check import passes, sentences

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
