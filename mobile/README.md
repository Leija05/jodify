# JodiFy Mobile

## Requisitos
- Node.js 18+
- Expo CLI (se instala automáticamente con `npx expo`)

## Instalación
```bash
cd mobile
npm install
```

## Desarrollo
```bash
npm run start
```

## Ejecutar en iPhone físico (Expo Go)
1. Instala **Expo Go** desde la App Store.
2. En la terminal:
   ```bash
   npm run start:tunnel
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
