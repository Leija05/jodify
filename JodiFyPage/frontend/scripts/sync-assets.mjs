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