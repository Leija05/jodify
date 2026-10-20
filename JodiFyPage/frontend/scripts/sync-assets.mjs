import { cpSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const destDir = resolve(currentDir, '..', 'public');
const dest = resolve(destDir, 'favicon.ico');

mkdirSync(destDir, { recursive: true });

const possibleSources = [
  resolve(currentDir, '..', '..', '..', 'assets', 'icon.ico'),
  resolve(currentDir, '..', '..', 'assets', 'icon.ico'),
  resolve(currentDir, '..', 'assets', 'icon.ico'),
];

let copied = false;
for (const source of possibleSources) {
  if (existsSync(source)) {
    try {
      cpSync(source, dest);
      console.log(`[sync-assets] favicon.ico sincronizado desde ${source}`);
      copied = true;
      break;
    } catch {
      // Continue to next candidate
    }
  }
}

if (!copied) {
  if (existsSync(dest)) {
    console.log('[sync-assets] favicon.ico ya existe en public/, manteniendo icono existente.');
  } else {
    console.warn('[sync-assets] Aviso: No se encontró icon.ico compartido, continuando compilación...');
  }
}

// Sincronizar video de promoción para la página principal
const promoDest = resolve(destDir, 'jodify-promo.mp4');
const promoSources = [
  resolve(currentDir, '..', '..', '..', 'jodify-video', 'jodify-21s-launch.mp4'),
  resolve(currentDir, '..', '..', 'jodify-video', 'jodify-21s-launch.mp4'),
  resolve(currentDir, '..', '..', '..', 'jodify-video', 'jodify-promo.mp4'),
];

for (const source of promoSources) {
  if (existsSync(source) && !existsSync(promoDest)) {
    try {
      cpSync(source, promoDest);
      console.log(`[sync-assets] jodify-promo.mp4 sincronizado desde ${source}`);
      break;
    } catch (e) {
      console.warn('[sync-assets] Error copiando video de promo:', e.message);
    }
  }
}