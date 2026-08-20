# Subir un release a GitHub (JodiFy)

Los releases de GitHub son la fuente de actualizaciones de las apps:

- **Escritorio (Electron)**: `electron-updater` busca `latest.yml` + el instalador
  `.exe` en el release de GitHub. Al iniciar la app, detecta la versión nueva,
  la descarga sola y pregunta **"Actualizar ahora / Después"**. Si elige
  "Después", la actualización queda lista y se instala desde
  **Ajustes > Actualizaciones > Instalar actualización** (sin abrir el navegador).
- **Móvil (Expo)**: al abrir la app consulta la API de releases de GitHub. Si hay
  una versión nueva, pregunta **"Actualizar ahora / Después"**. "Ahora" descarga
  el APK dentro de la app y abre el instalador de Android. Si elige "Después",
  aparece el botón **Instalar actualización** en la sección Configuración.

> La versión móvil se lee del **nombre del APK** (`JodiFyMobile-v1.0.1.apk`),
> NO del tag del release (que pertenece a la app de escritorio). Si el release
> no trae un APK, la app móvil no muestra ninguna actualización.

> En iOS no se puede auto-instalar: la app solo informa que la actualización
> se hace desde la App Store.

---

## 1) Preparar la versión

Sube la versión en los 3 lugares (deben coincidir con la etiqueta del release):

| Archivo | Campo | Ejemplo |
|---|---|---|
| `JodiFyDesktop/package.json` | `version` | `2.1.0` |
| `JodiFyMovil/frontend/package.json` | `version` | `1.0.1` |
| `JodiFyMovil/frontend/app.json` | `expo.version` | `1.0.1` |
| `JodiFyPage/frontend/package.json` | `version` | `2.1.0` (web, opcional) |

> El móvil tiene su propia numeración: no tiene que coincidir con la del
> escritorio. Subí la versión del móvil solo cuando cambie el APK.

Commit y push:

```bash
git add .
git commit -m "chore: release v2.1.0"
git push origin main
```

---

## 2) Crear el instalador de escritorio y publicar el release

Desde `JodiFyDesktop/`:

```bash
# Opción A (recomendada): electron-builder crea el release automáticamente
GH_TOKEN=<tu-token> npm run dist:release
```

Esto compila la web para Electron, empaqueta el instalador NSIS y publica en
GitHub un release con la etiqueta `v2.1.0` (o la versión de `package.json`),
subiendo `latest.yml`, el `.exe` y el `.blockmap`.

> Genera un token en GitHub → Settings → Developer settings → Personal access
> tokens → Fine-grained tokens con permiso **Contents: Read and write**.

```bash
# Opción B (manual con gh CLI): primero construir, luego crear el release
npm run dist
# electron-builder referencia el .exe sin espacios en latest.yml, así que renombrá
cp "release/JodiFy Setup 2.1.0.exe" "release/JodiFy-Setup-2.1.0.exe"
gh release create v2.1.0 \
  "release/JodiFy-Setup-2.1.0.exe" \
  release/latest.yml \
  "release/JodiFy-Setup-2.1.0.exe.blockmap" \
  --repo Leija05/jodify \
  --title "JodiFy v2.1.0" \
  --notes "Cambios: ..."
```

---

## 3) Publicar el APK del móvil en el mismo release

El móvil lee el release "latest" de GitHub y descarga el APK desde los assets.
**Importante**: el APK debe subirse con el nombre
`JodiFyMobile-v<version>.apk` (la versión de `app.json`, no la del tag de
escritorio). La app compara esa versión con la suya para saber si hay update.

### 3a) Con EAS (recomendado)

```bash
cd JodiFyMovil/frontend
npx eas-cli@latest build -p android --profile preview
```

Con un perfil `preview` en `eas.json` que genere APK:

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    }
  }
}
```

Al terminar, descarga el APK y súbelo al release que ya creaste:

```bash
gh release upload v2.1.0 ruta/al/apk --repo Leija05/jodify
# el nombre en GitHub debe quedar como JodiFyMobile-v1.0.1.apk:
gh release upload v2.1.0 ruta/al/apk --clobber --repo Leija05/jodify
```

Si el nombre no es `JodiFyMobile-v<version>.apk`, renombrá el archivo antes de
subirlo (o renombralo desde la página del release en GitHub).

### 3b) Sin EAS (build local)

```bash
cd JodiFyMovil/frontend
npx expo prebuild -p android
cd android
./gradlew assembleRelease
# El APK queda en: android/app/build/outputs/apk/release/app-release.apk
cp android/app/build/outputs/apk/release/app-release.apk \
  "JodiFyMobile-v$(grep -o '"version": *"[^"]*"' app.json | head -1 | grep -o '[0-9.]*').apk"
gh release upload v2.1.0 "JodiFyMobile-v1.0.1.apk" --repo Leija05/jodify
```

---

## 4) Verificar el release

- El release debe llamarse `v2.1.0` (con `v` adelante) y contener:
  `latest.yml`, `JodiFy Setup 2.1.0.exe`, `.blockmap` y el `.apk` con nombre
  `JodiFyMobile-v<versión del móvil>.apk`.
- El tag del release (desktop) y la versión del móvil son independientes: la
  app móvil solo detecta update cuando existe un release con APK cuya versión
  (del nombre del archivo) sea mayor a la instalada.
- El tag debe estar en `main`:
  ```bash
  git tag v2.1.0 && git push origin v2.1.0   # si no lo creó electron-builder
  ```
- Probá en una máquina con la versión anterior instalada: abrir la app debe
  mostrar el diálogo "Actualizar ahora / Después" al poco tiempo.

## Flujo de actualización (resumen)

| Momento | Escritorio | Móvil |
|---|---|---|
| Al iniciar | Busca en GitHub, descarga en segundo plano | Busca en GitHub, muestra Alert |
| Update detectado | Diálogo "Actualizar ahora / Después" | Alert "Actualizar ahora / Después" |
| "Actualizar ahora" | Se instala y reinicia solo (NSIS) | Descarga APK e abre el instalador |
| "Después" | Botón en Ajustes > Actualizaciones | Botón en Configuración |