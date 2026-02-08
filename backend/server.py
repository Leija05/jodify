from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from urllib.parse import quote
import json
import mimetypes
import os
import tempfile
import urllib.request
from yt_dlp import YoutubeDL

app = FastAPI()

# Servir archivos estáticos desde /app
app.mount("/css", StaticFiles(directory="/app/css"), name="css")
app.mount("/js", StaticFiles(directory="/app/js"), name="js")
app.mount("/assets", StaticFiles(directory="/app/assets"), name="assets")

@app.get("/")
async def root():
    return FileResponse("/app/index.html")

@app.get("/index.html")
async def index():
    return FileResponse("/app/index.html")

@app.get("/splash.html")
async def splash():
    return FileResponse("/app/splash.html")

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
