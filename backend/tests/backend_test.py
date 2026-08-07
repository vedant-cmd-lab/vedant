"""Sur Detective backend tests"""
import os
import io
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fall back for local runs
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def today_puzzle():
    r = requests.get(f"{API}/puzzle/today", timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


# --- Puzzle endpoints ---
class TestPuzzleToday:
    def test_shape(self, today_puzzle):
        p = today_puzzle
        assert isinstance(p["number"], int) and p["number"] >= 1
        assert p["clip_durations"] == [1, 2, 4, 7, 11, 16]
        assert p["max_attempts"] == 6
        assert p["clip_url"].startswith("http")
        assert len(p["options"]) == 6
        for o in p["options"]:
            assert set(o.keys()) == {"id", "title", "artist"}
        # No answer leak
        assert "song_id" not in p and "answer" not in p

    def test_stability(self, today_puzzle):
        r2 = requests.get(f"{API}/puzzle/today", timeout=30).json()
        assert r2["number"] == today_puzzle["number"]
        assert [o["id"] for o in r2["options"]] == [o["id"] for o in today_puzzle["options"]]
        assert r2["clip_url"] == today_puzzle["clip_url"]


class TestArchive:
    def test_archive(self, today_puzzle):
        r = requests.get(f"{API}/puzzle/archive", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["today_number"] == today_puzzle["number"]
        assert isinstance(data["cases"], list)
        assert data["cases"][0]["is_today"] is True
        assert data["cases"][0]["number"] == today_puzzle["number"]

    def test_past_case(self, today_puzzle):
        n = max(1, today_puzzle["number"] - 1)
        r = requests.get(f"{API}/puzzle/{n}", timeout=30)
        assert r.status_code == 200
        assert r.json()["number"] == n

    def test_future_case_forbidden(self, today_puzzle):
        r = requests.get(f"{API}/puzzle/{today_puzzle['number'] + 5}", timeout=30)
        assert r.status_code == 403


class TestGuessAndReveal:
    def test_reveal_returns_answer(self, today_puzzle):
        r = requests.get(f"{API}/puzzle/{today_puzzle['number']}/reveal", timeout=30)
        assert r.status_code == 200
        a = r.json()
        assert "id" in a and "title" in a and "artist" in a
        # answer id must be one of the options
        assert a["id"] in [o["id"] for o in today_puzzle["options"]]

    def test_wrong_guess(self, today_puzzle):
        reveal = requests.get(f"{API}/puzzle/{today_puzzle['number']}/reveal").json()
        wrong = next(o for o in today_puzzle["options"] if o["id"] != reveal["id"])
        r = requests.post(f"{API}/puzzle/{today_puzzle['number']}/guess",
                          json={"option_id": wrong["id"]}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["correct"] is False
        assert "answer" not in data

    def test_correct_guess(self, today_puzzle):
        reveal = requests.get(f"{API}/puzzle/{today_puzzle['number']}/reveal").json()
        r = requests.post(f"{API}/puzzle/{today_puzzle['number']}/guess",
                          json={"option_id": reveal["id"]}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["correct"] is True
        assert data["answer"]["id"] == reveal["id"]


# --- Admin CRUD ---
class TestAdmin:
    def test_list_seeded(self):
        r = requests.get(f"{API}/admin/songs", timeout=30)
        assert r.status_code == 200
        songs = r.json()
        assert len(songs) >= 26
        for s in songs[:3]:
            assert "id" in s and "title" in s and "preview_url" in s
            assert "_id" not in s  # no raw mongo id leak

    def test_crud_flow(self):
        payload = {
            "title": "TEST_Song_Delete_Me",
            "artist": "TEST_Artist",
            "preview_url": "https://example.com/test.m4a",
            "language": "Hindi",
            "decade": "2020s",
        }
        r = requests.post(f"{API}/admin/songs", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        song = r.json()
        sid = song["id"]
        assert song["title"] == payload["title"]

        # update
        payload2 = {**payload, "title": "TEST_Song_Updated"}
        r2 = requests.put(f"{API}/admin/songs/{sid}", json=payload2, timeout=30)
        assert r2.status_code == 200
        assert r2.json()["title"] == "TEST_Song_Updated"

        # delete
        r3 = requests.delete(f"{API}/admin/songs/{sid}", timeout=30)
        assert r3.status_code == 200
        assert r3.json()["deleted"] is True

    def test_csv_import(self):
        csv_data = (
            "title,artist,album_or_film,year,decade,language,difficulty,preview_url,artwork_url\n"
            "TEST_CSV_Song,TEST_CSV_Artist,TestFilm,2024,2020s,Hindi,Easy,https://example.com/tcsv.m4a,\n"
        )
        files = {"file": ("t.csv", io.BytesIO(csv_data.encode()), "text/csv")}
        r = requests.post(f"{API}/admin/songs/import", files=files, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["inserted"] + data["updated"] >= 1

        # cleanup
        listing = requests.get(f"{API}/admin/songs").json()
        for s in listing:
            if s["title"].startswith("TEST_CSV"):
                requests.delete(f"{API}/admin/songs/{s['id']}")
