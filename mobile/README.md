# JodiFy Mobile

## Requisitos
- Node.js 18+
- Expo CLI (se instala automáticamente con `npx expo`)

## Instalación
```bash
cd mobile
npm install
```

Si actualizas dependencias o ves errores de módulos nativos (por ejemplo `PlatformConstants`),
limpia la instalación y el caché de Metro antes de reiniciar:

**macOS / Linux**
```bash
rm -rf node_modules
npm install
npx expo start -c
```

**Windows (PowerShell)**
```powershell
Remove-Item -Recurse -Force node_modules
npm install
npx expo start -c
```

Si el error aparece al escanear el QR en Expo Go, normalmente indica que la versión de
Expo Go no coincide con el SDK configurado (`sdkVersion: 54.0.0`). Actualiza Expo Go a
la última versión y asegúrate de iniciar el servidor desde `mobile/` con:
```bash
npx expo start -c
```

## Desarrollo
```bash
npm run start
```

## Ejecutar en iPhone físico (Expo Go)
1. Instala **Expo Go** desde la App Store.
2. En la terminal (acepta ambas variantes):
   ```bash
   npm run start:tunnel
   ```
   o
   ```bash
   npm run start:tunel
   ```
3. Escanea el QR desde Expo Go (o usa la opción *Scan QR Code*).

## Ejecutar en Android (físico o emulador)
- **Android físico**: instala **Expo Go** desde Google Play y ejecuta:
  ```bash
  npm run start:tunnel
  ```
  Luego escanea el QR.
- **Emulador**: con Android Studio configurado:
  ```bash
  npm run android
  ```

## Notas sobre iOS
- El simulador iOS solo funciona en macOS con Xcode.
- En Windows/Linux debes usar un iPhone físico vía Expo Go.

## Notas
- Esta app usa la lógica compartida del monorepo en `../src/core`.
- El `metro.config.js` agrega `../src` como carpeta observada para permitir imports fuera de `mobile/`.
