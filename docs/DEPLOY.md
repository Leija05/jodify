# Despliegue de JodiFy

JodiFy tiene 3 piezas: **backend** (FastAPI + MongoDB), **web** (React + Vite) y
**escritorio** (Electron). Este documento describe cómo dejarlas en producción.

## Estructura del monorepo

```
jodify/
├── assets/                  ← iconos compartidos (icon.ico) para web, escritorio y móvil
├── docs/                    ← documentación
├── docker-compose.yml       ← MongoDB local para desarrollo
├── JodiFyPage/
│   └── frontend/            ← web (React + Vite) — despliegue en Vercel
├── JodiFyDesktop/           ← escritorio (Electron + electron-builder)
├── JodiFyMovil/
│   └── frontend/            ← móvil (React Native / Expo)
└── jodify-backend/          ← API (FastAPI) — despliegue en Render
```

## Arquitectura objetivo

```
Browser / Electron ──► Vercel (web estática) ──► Render (API FastAPI) ──► MongoDB Atlas
```

---

## 1) Base de datos — MongoDB Atlas (no local)

1. Crea un cluster gratis en https://www.mongodb.com/atlas.
2. Crea un usuario de BD y permite acceso desde cualquier IP (`0.0.0.0/0`).
3. Copia el connection string tipo:
   `mongodb+srv://USUARIO:PASSWORD@cluster0.xxxxx.mongodb.net/jodify?retryWrites=true&w=majority`

Guárdalo: se usa en Render (`MONGO_URI`).

---

## 2) Backend — Render

El backend está listo con `jodify-backend/Procfile` y `jodify-backend/render.yaml`.

En Render (https://render.com):

1. **New → Web Service** → conecta el repo y elige el directorio raíz `jodify-backend/`
   (Root Directory: `jodify-backend`).
2. Build: `pip install -r requirements.txt` (lo detecta solo con el Procfile).
3. Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
4. Variables de entorno:
   - `MONGO_URI` → tu string de MongoDB Atlas.
   - `MONGO_DB` → `jodify`.
   - `JWT_SECRET` → una clave secreta larga.
   - `JWT_EXPIRES_MINUTES` → `10080`.
   - (Opcional) `CORS_ORIGINS` → `https://TU-APP.vercel.app,http://localhost:5173`
     (si se deja vacío, se permite todo).
5. Guarda la URL final, p. ej. `https://jodify-api.onrender.com`.
6. Verifica: `GET https://jodify-api.onrender.com/api/health` → `{"status":"ok"}`.

> Nota: el seed crea los usuarios `dev/dev123`, `admin/admin123`, `user/user123`
> al primer arranque, útiles para probar.

---

## 3) Web — Vercel

El frontend está listo con `JodiFyPage/frontend/vercel.json` (fallback SPA) y la URL
de la API configurable por variable de entorno. El favicon se sincroniza desde
`assets/icon.ico` automáticamente en cada build (`scripts/sync-assets.mjs`).

En Vercel (https://vercel.com):

1. **New Project** → conecta el repo → directorio raíz `JodiFyPage/frontend/`.
2. Build Command: `npm run build` · Output: `dist`.
3. Variable de entorno del proyecto:
   - `VITE_API_URL=https://jodify-api.onrender.com`
4. Despliega. El sitio queda listo (ej. `https://jodify.vercel.app`).

---

## 4) Escritorio — Electron (.exe)

El instalador Windows se genera con **electron-builder** (NSIS) desde `JodiFyDesktop/`.

### Preparación

1. Instala dependencias en `JodiFyDesktop/` (una vez):
   ```
   cd JodiFyDesktop
   npm install
   ```
2. Apunta el build de escritorio al backend alojado. Crea
   `JodiFyPage/frontend/.env.electron` (copia de `JodiFyPage/frontend/.env.electron.example`) con:
   ```
   VITE_API_URL=https://jodify-api.onrender.com
   ```
   > Sin esta variable el .exe no sabrá dónde está la API.

### Generar el .exe (en Windows — recomendado)

En una terminal **Windows** (cmd o PowerShell) en `JodiFyDesktop/`:

```
npm run dist
```

Esto:
1. Compila el frontend en modo electron (`JodiFyPage/frontend/dist-electron/`).
2. Ejecuta `electron-builder --win`, que genera `release/JodiFy Setup 2.0.0.exe`
   (instalador NSIS) y `release/win-unpacked/JodiFy.exe` (portátil).

### Nota sobre Linux/WSL

En Linux/WSL el paso `win-unpacked` funciona, pero el instalador NSIS requiere
`wine` instalado (lo pide electron-builder para fijar icono/versión del .exe).
Para evitarlo, genera el instalador en Windows, o instala wine en WSL:

```
sudo apt update && sudo apt install -y wine64
npm run dist
```

### Probar en local (sin instalador)

```
cd JodiFyDesktop
npm run start     # compila dist-electron y abre Electron con el backend de .env.electron
```

---

## 5) Móvil — Expo

El icono de la app se genera desde el `.ico` compartido (`assets/icon.ico` →
`JodiFyMovil/frontend/assets/icon.png`). Para desarrollo:

```
cd JodiFyMovil/frontend
npm install
npx expo start
```

---

## Archivos clave

| Pieza       | Archivos                                                              |
| ----------- | --------------------------------------------------------------------- |
| Iconos      | `assets/icon.ico` (fuente única para web, escritorio y móvil)         |
| Backend     | `jodify-backend/Procfile`, `jodify-backend/render.yaml`, `jodify-backend/.env.example` |
| Web         | `JodiFyPage/frontend/vercel.json`, `JodiFyPage/frontend/.env.production.example`, `JodiFyPage/frontend/.env.electron.example` |
| Escritorio  | `JodiFyDesktop/package.json` (config `build`), `JodiFyDesktop/main.js`, `JodiFyDesktop/preload.js` |