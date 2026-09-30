import json
import sys
from datetime import datetime
import pymongo
from bson import ObjectId

MONGO_URL = "mongodb+srv://Leija_Admin:fPUXn0QjUHKzfOXy@cluster0.jxwxczd.mongodb.net/"
client = pymongo.MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
db = client["jodify"]

def sid(oid):
    return str(oid) if oid else ""

try:
    raw = sys.stdin.read()
    data = json.loads(raw) if raw else {}
    name = (data.get("name") or "").strip()
    if not name:
        print(json.dumps({"error": "Nombre requerido"}))
        sys.exit(1)

    youtube_id = data.get("youtube_id")
    query = {}
    if youtube_id:
        query = {"youtube_id": youtube_id}
    else:
        query = {"name": name}
        if data.get("artist"):
            query["artist"] = data.get("artist").strip()

    existing = db["songs"].find_one(query)
    if existing:
        song_doc = existing
        song_id = sid(existing["_id"])
        db["songs"].update_one({"_id": existing["_id"]}, {"$inc": {"likes": 1}})
        song_doc["likes"] = song_doc.get("likes", 0) + 1
    else:
        song_doc = {
            "name": name,
            "artist": (data.get("artist") or "").strip(),
            "album": (data.get("album") or "Enlace Web").strip(),
            "url": data.get("url") or "",
            "youtube_id": youtube_id,
            "cover_url": data.get("cover_url"),
            "duration": data.get("duration"),
            "added_by": data.get("added_by") or "Enlace Web",
            "created_at": datetime.now().isoformat(),
            "likes": 1,
            "play_count": 0,
            "source": "youtube" if youtube_id else "web",
        }
        res = db["songs"].insert_one(song_doc)
        song_doc["_id"] = res.inserted_id
        song_id = sid(res.inserted_id)

    liked_by = data.get("liked_by")
    if liked_by:
        try:
            db["likes"].insert_one({
                "username": liked_by,
                "song_id": song_id,
                "created_at": datetime.now().isoformat(),
            })
        except Exception:
            pass

    out = {
        "id": song_id,
        "name": song_doc.get("name"),
        "artist": song_doc.get("artist"),
        "album": song_doc.get("album"),
        "url": song_doc.get("url") or "",
        "youtube_id": song_doc.get("youtube_id"),
        "cover_url": song_doc.get("cover_url"),
        "duration": song_doc.get("duration"),
        "added_by": song_doc.get("added_by"),
        "likes": song_doc.get("likes", 1),
        "source": song_doc.get("source") or ("youtube" if song_doc.get("youtube_id") else "web"),
    }
    print(json.dumps(out))
except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(1)
