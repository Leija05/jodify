from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from urllib.parse import quote
import json
import mimetypes
import os
from pathlib import Path
import tempfile
import urllib.request
import uvicorn
from yt_dlp import YoutubeDL

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(os.environ.get("JODIFY_STATIC_ROOT", Path(__file__).resolve().parent.parent))

# Servir archivos estáticos desde el repo
app.mount("/css", StaticFiles(directory=str(BASE_DIR / "css")), name="css")
app.mount("/js", StaticFiles(directory=str(BASE_DIR / "js")), name="js")
app.mount("/assets", StaticFiles(directory=str(BASE_DIR / "assets")), name="assets")

@app.get("/")
async def root():
    return FileResponse(str(BASE_DIR / "index.html"))

@app.get("/index.html")
async def index():
    return FileResponse(str(BASE_DIR / "index.html"))

@app.get("/splash.html")
async def splash():
    return FileResponse(str(BASE_DIR / "splash.html"))

@app.get("/health")
async def health():
    return {"status": "ok"}


class ImportRequest(BaseModel):
    url: str


def is_spotify(url: str) -> bool:
    return "open.spotify.com" in url


def is_youtube(url: str) -> bool:
    return "youtube.com" in url or "youtu.be" in url


def fetch_spotify_query(url: str) -> str:
    oembed_url = f"https://open.spotify.com/oembed?url={quote(url)}"
    with urllib.request.urlopen(oembed_url) as response:
        data = json.loads(response.read().decode("utf-8"))
    title = data.get("title", "").strip()
    author = data.get("author_name", "").strip()
    query_parts = [title, author]
    return " ".join([part for part in query_parts if part]).strip()


def download_audio(target: str) -> str:
    download_dir = tempfile.mkdtemp(prefix="jodify-import-")
    output_template = os.path.join(download_dir, "%(title).200s.%(ext)s")
    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": output_template,
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "prefer_free_formats": True,
    }
    with YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(target, download=True)
        if "entries" in info:
            info = info["entries"][0]
        filename = ydl.prepare_filename(info)
    return filename


def cleanup_file(path: str) -> None:
    try:
        if os.path.exists(path):
            os.remove(path)
        parent_dir = os.path.dirname(path)
        if parent_dir and os.path.isdir(parent_dir):
            os.rmdir(parent_dir)
    except OSError:
        pass


@app.post("/api/import")
async def import_audio(payload: ImportRequest, background_tasks: BackgroundTasks):
    url = payload.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="Enlace inválido.")

    target = url
    if is_spotify(url):
        try:
            query = fetch_spotify_query(url)
        except Exception as exc:
            raise HTTPException(status_code=400, detail="No se pudo leer el enlace de Spotify.") from exc
        if not query:
            raise HTTPException(status_code=400, detail="No se encontró metadata en Spotify.")
        target = f"ytsearch1:{query}"
    elif not is_youtube(url):
        raise HTTPException(status_code=400, detail="El enlace debe ser de Spotify o YouTube.")

    try:
        filename = download_audio(target)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Falló la descarga del audio.") from exc

    if not os.path.exists(filename):
        raise HTTPException(status_code=500, detail="No se pudo generar el archivo.")

    media_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    background_tasks.add_task(cleanup_file, filename)
    return FileResponse(filename, media_type=media_type, filename=os.path.basename(filename))


if __name__ == "__main__":
    port = int(os.environ.get("JODIFY_IMPORT_PORT", "8000"))
    uvicorn.run(app, host="127.0.0.1", port=port, reload=False)
