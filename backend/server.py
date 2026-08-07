from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import csv
import logging
import hashlib
import random
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, BeforeValidator
from typing import List, Optional, Annotated, Any
from datetime import datetime, timezone, date, timedelta
from zoneinfo import ZoneInfo
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ---------------------------------------------------------------------------
# Game configuration
# ---------------------------------------------------------------------------
IST = ZoneInfo("Asia/Kolkata")
LAUNCH_DATE = date(2026, 1, 1)          # Case #1
CLIP_DURATIONS = [1, 2, 4, 7, 11, 16]   # seconds unlocked per attempt
MAX_ATTEMPTS = 6
WAVEFORM_TOTAL_SECONDS = 16
NUM_OPTIONS = 6
SHUFFLE_SEED = "sur-detective-v1"

# ---------------------------------------------------------------------------
# Mongo helpers
# ---------------------------------------------------------------------------

def _validate_object_id(v: Any) -> str:
    if isinstance(v, ObjectId):
        return str(v)
    return str(v)


PyObjectId = Annotated[str, BeforeValidator(_validate_object_id)]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
    id: Optional[str] = None

    @classmethod
    def from_mongo(cls, doc):
        if not doc:
            return None
        doc = dict(doc)
        if "_id" in doc:
            doc["id"] = str(doc.pop("_id"))
        return cls(**doc)

    def to_mongo(self):
        d = self.model_dump(exclude_none=True)
        d.pop("id", None)
        return d


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class Song(BaseDocument):
    title: str
    artist: str
    album_or_film: Optional[str] = ""
    year: Optional[str] = ""
    decade: Optional[str] = ""
    language: Optional[str] = ""
    difficulty: Optional[str] = ""
    preview_url: str
    artwork_url: Optional[str] = ""


class SongInput(BaseModel):
    title: str
    artist: str
    album_or_film: Optional[str] = ""
    year: Optional[str] = ""
    decade: Optional[str] = ""
    language: Optional[str] = ""
    difficulty: Optional[str] = ""
    preview_url: str
    artwork_url: Optional[str] = ""


class GuessInput(BaseModel):
    option_id: str


# ---------------------------------------------------------------------------
# Puzzle generation
# ---------------------------------------------------------------------------

def today_ist() -> date:
    return datetime.now(IST).date()


def puzzle_number_for(d: date) -> int:
    return (d - LAUNCH_DATE).days + 1


def date_for_puzzle(n: int) -> date:
    return LAUNCH_DATE + timedelta(days=n - 1)


def _hash_rank(seed: str, value: str) -> str:
    return hashlib.md5(f"{seed}:{value}".encode()).hexdigest()


async def _ordered_song_ids() -> List[str]:
    songs = await db.songs.find({}, {"_id": 1}).to_list(1000)
    ids = [str(s["_id"]) for s in songs]
    ids.sort(key=lambda sid: _hash_rank(SHUFFLE_SEED, sid))
    return ids


async def get_or_create_puzzle(number: int) -> dict:
    if number < 1:
        raise HTTPException(status_code=404, detail="Case not found")
    if number > puzzle_number_for(today_ist()):
        raise HTTPException(status_code=403, detail="This case has not opened yet")

    existing = await db.puzzles.find_one({"number": number})
    if existing:
        return existing

    ordered = await _ordered_song_ids()
    if not ordered:
        raise HTTPException(status_code=503, detail="No songs in the archive yet")

    answer_id = ordered[(number - 1) % len(ordered)]
    answer = await db.songs.find_one({"_id": ObjectId(answer_id)})

    # Build option pool preferring same language, then decade, then anything.
    rng = random.Random(f"{SHUFFLE_SEED}:{number}")
    others = [sid for sid in ordered if sid != answer_id]

    async def _fetch(sid):
        return await db.songs.find_one({"_id": ObjectId(sid)})

    pool = []
    for sid in others:
        pool.append(sid)
    # rank distractors by similarity for a fairer puzzle
    lang = (answer.get("language") or "").lower()
    dec = (answer.get("decade") or "").lower()
    scored = []
    for sid in pool:
        s = await _fetch(sid)
        score = 0
        if (s.get("language") or "").lower() == lang:
            score += 2
        if (s.get("decade") or "").lower() == dec:
            score += 1
        scored.append((score + rng.random(), sid))
    scored.sort(reverse=True)
    distractors = [sid for _, sid in scored[: NUM_OPTIONS - 1]]

    option_ids = distractors + [answer_id]
    rng.shuffle(option_ids)

    doc = {
        "number": number,
        "date": date_for_puzzle(number).isoformat(),
        "song_id": answer_id,
        "option_ids": option_ids,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.puzzles.insert_one(doc)
    return doc


async def _public_puzzle(doc: dict) -> dict:
    options = []
    for sid in doc["option_ids"]:
        s = await db.songs.find_one({"_id": ObjectId(sid)})
        if not s:
            continue
        options.append({
            "id": sid,
            "title": s["title"],
            "artist": s["artist"],
        })
    answer = await db.songs.find_one({"_id": ObjectId(doc["song_id"])})
    return {
        "number": doc["number"],
        "date": doc["date"],
        "clip_url": answer["preview_url"],
        "clip_durations": CLIP_DURATIONS,
        "max_attempts": MAX_ATTEMPTS,
        "waveform_total_seconds": WAVEFORM_TOTAL_SECONDS,
        "options": options,
    }


def _reveal(song: dict) -> dict:
    return {
        "id": str(song["_id"]),
        "title": song["title"],
        "artist": song["artist"],
        "album_or_film": song.get("album_or_film", ""),
        "year": song.get("year", ""),
        "decade": song.get("decade", ""),
        "language": song.get("language", ""),
        "difficulty": song.get("difficulty", ""),
        "preview_url": song["preview_url"],
        "artwork_url": song.get("artwork_url", ""),
    }


# ---------------------------------------------------------------------------
# Public game routes
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "Sur Detective API"}


@api_router.get("/puzzle/today")
async def puzzle_today():
    n = puzzle_number_for(today_ist())
    doc = await get_or_create_puzzle(n)
    return await _public_puzzle(doc)


@api_router.get("/puzzle/archive")
async def puzzle_archive(limit: int = 60):
    today_n = puzzle_number_for(today_ist())
    start = max(1, today_n - limit)
    cases = []
    for n in range(today_n, start - 1, -1):
        cases.append({
            "number": n,
            "date": date_for_puzzle(n).isoformat(),
            "is_today": n == today_n,
        })
    return {"today_number": today_n, "cases": cases}


@api_router.get("/puzzle/{number}")
async def puzzle_by_number(number: int):
    doc = await get_or_create_puzzle(number)
    return await _public_puzzle(doc)


@api_router.post("/puzzle/{number}/guess")
async def puzzle_guess(number: int, body: GuessInput):
    doc = await get_or_create_puzzle(number)
    correct = body.option_id == doc["song_id"]
    resp = {"correct": correct}
    if correct:
        song = await db.songs.find_one({"_id": ObjectId(doc["song_id"])})
        resp["answer"] = _reveal(song)
    return resp


@api_router.get("/puzzle/{number}/reveal")
async def puzzle_reveal(number: int):
    doc = await get_or_create_puzzle(number)
    song = await db.songs.find_one({"_id": ObjectId(doc["song_id"])})
    return _reveal(song)


# ---------------------------------------------------------------------------
# Admin routes (open — academic prototype)
# ---------------------------------------------------------------------------
@api_router.get("/admin/songs", response_model=List[Song])
async def admin_list_songs():
    docs = await db.songs.find().sort("title", 1).to_list(1000)
    return [Song.from_mongo(d) for d in docs]


@api_router.post("/admin/songs", response_model=Song)
async def admin_create_song(body: SongInput):
    song = Song(**body.model_dump())
    res = await db.songs.insert_one(song.to_mongo())
    created = await db.songs.find_one({"_id": res.inserted_id})
    return Song.from_mongo(created)


@api_router.put("/admin/songs/{song_id}", response_model=Song)
async def admin_update_song(song_id: str, body: SongInput):
    await db.songs.update_one({"_id": ObjectId(song_id)}, {"$set": body.model_dump()})
    updated = await db.songs.find_one({"_id": ObjectId(song_id)})
    if not updated:
        raise HTTPException(status_code=404, detail="Song not found")
    return Song.from_mongo(updated)


@api_router.delete("/admin/songs/{song_id}")
async def admin_delete_song(song_id: str):
    await db.songs.delete_one({"_id": ObjectId(song_id)})
    return {"deleted": True}


@api_router.post("/admin/songs/import")
async def admin_import_csv(file: UploadFile = File(...)):
    raw = await file.read()
    text = raw.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    fields = ["title", "artist", "album_or_film", "year", "decade",
              "language", "difficulty", "preview_url", "artwork_url"]
    inserted = 0
    updated = 0
    for row in reader:
        row = {k: (v.strip() if isinstance(v, str) else v) for k, v in row.items()}
        data = {f: str(row.get(f, "") or "") for f in fields}
        if not data["title"] or not data["preview_url"]:
            continue
        existing = await db.songs.find_one({"title": data["title"], "artist": data["artist"]})
        if existing:
            await db.songs.update_one({"_id": existing["_id"]}, {"$set": data})
            updated += 1
        else:
            await db.songs.insert_one(data)
            inserted += 1
    return {"inserted": inserted, "updated": updated}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
