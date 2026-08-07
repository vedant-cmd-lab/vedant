"""Tests for Practice mode + same-language distractor selection."""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def songs_by_id():
    r = requests.get(f"{API}/admin/songs", timeout=30)
    assert r.status_code == 200
    return {s["id"]: s for s in r.json()}


class TestPractice:
    def test_practice_new_shape(self):
        r = requests.post(f"{API}/practice/new", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "session_id" in data and isinstance(data["session_id"], str)
        assert data["clip_url"].startswith("http")
        assert data["clip_durations"] == [1, 2, 4, 7, 11, 16]
        assert data["max_attempts"] == 6
        assert data["waveform_total_seconds"] == 16
        assert len(data["options"]) == 6
        for o in data["options"]:
            assert set(o.keys()) == {"id", "title", "artist"}
        # no answer leak
        assert "song_id" not in data

    def test_practice_reveal_and_wrong_then_correct(self):
        sess = requests.post(f"{API}/practice/new", timeout=30).json()
        sid = sess["session_id"]
        reveal = requests.get(f"{API}/practice/{sid}/reveal", timeout=30)
        assert reveal.status_code == 200
        a = reveal.json()
        assert a["id"] in [o["id"] for o in sess["options"]]

        wrong = next(o for o in sess["options"] if o["id"] != a["id"])
        wg = requests.post(f"{API}/practice/{sid}/guess", json={"option_id": wrong["id"]}, timeout=30)
        assert wg.status_code == 200
        wd = wg.json()
        assert wd["correct"] is False
        assert "answer" not in wd

        cg = requests.post(f"{API}/practice/{sid}/guess", json={"option_id": a["id"]}, timeout=30)
        assert cg.status_code == 200
        cd = cg.json()
        assert cd["correct"] is True
        assert cd["answer"]["id"] == a["id"]
        assert cd["answer"]["title"] == a["title"]

    def test_practice_unknown_session_returns_404(self):
        r1 = requests.post(f"{API}/practice/does-not-exist/guess",
                           json={"option_id": "x"}, timeout=30)
        assert r1.status_code == 404
        r2 = requests.get(f"{API}/practice/does-not-exist/reveal", timeout=30)
        assert r2.status_code == 404

    def test_practice_sessions_are_distinct(self):
        a = requests.post(f"{API}/practice/new", timeout=30).json()
        b = requests.post(f"{API}/practice/new", timeout=30).json()
        assert a["session_id"] != b["session_id"]


class TestDistractorLanguage:
    def test_today_options_prefer_same_language(self, songs_by_id):
        p = requests.get(f"{API}/puzzle/today", timeout=30).json()
        a = requests.get(f"{API}/puzzle/{p['number']}/reveal", timeout=30).json()
        ans_lang = (a.get("language") or "").lower()
        # count how many songs in the whole catalog share that language
        same_lang_pool = [s for s in songs_by_id.values()
                          if (s.get("language") or "").lower() == ans_lang and s["id"] != a["id"]]
        distractor_langs = [
            (songs_by_id[o["id"]].get("language") or "").lower()
            for o in p["options"] if o["id"] != a["id"]
        ]
        same_count = sum(1 for l in distractor_langs if l == ans_lang)
        # If the pool has >=5 same-language distractors available, ALL 5 must match.
        if len(same_lang_pool) >= 5:
            assert same_count == 5, f"expected all 5 distractors same lang, got {same_count}: {distractor_langs}"
        else:
            # Otherwise every available same-language song should appear
            assert same_count >= min(len(same_lang_pool), 5)

    def test_practice_options_prefer_same_language(self, songs_by_id):
        # sample several practice sessions to be robust
        for _ in range(5):
            sess = requests.post(f"{API}/practice/new", timeout=30).json()
            reveal = requests.get(f"{API}/practice/{sess['session_id']}/reveal", timeout=30).json()
            ans_lang = (reveal.get("language") or "").lower()
            same_lang_pool = [s for s in songs_by_id.values()
                              if (s.get("language") or "").lower() == ans_lang and s["id"] != reveal["id"]]
            distractor_langs = [
                (songs_by_id[o["id"]].get("language") or "").lower()
                for o in sess["options"] if o["id"] != reveal["id"]
            ]
            same_count = sum(1 for l in distractor_langs if l == ans_lang)
            if len(same_lang_pool) >= 5:
                assert same_count == 5, (
                    f"answer lang={ans_lang!r}, pool={len(same_lang_pool)}, "
                    f"distractor langs={distractor_langs}"
                )
            else:
                assert same_count >= min(len(same_lang_pool), 5)
