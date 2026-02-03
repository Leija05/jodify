from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

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
