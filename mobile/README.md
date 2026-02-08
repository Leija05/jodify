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

## Notas
- Esta app usa la lógica compartida del monorepo en `../src/core`.
- El `metro.config.js` agrega `../src` como carpeta observada para permitir imports fuera de `mobile/`.
