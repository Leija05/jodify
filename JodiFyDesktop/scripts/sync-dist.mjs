import { cpSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dest = resolve(here, '..', 'dist-electron');
const source = resolve(here, '..', '..', 'JodiFyPage', 'frontend', 'dist-electron');

mkdirSync(dest, { recursive: true });
rmSync(dest, { recursive: true, force: true });
if (!existsSync(source)) {
  console.error('[sync-dist] No se encontro JodiFyPage/frontend/dist-electron');
  process.exit(1);
}
cpSync(source, dest, { recursive: true });
console.log('[sync-dist] dist-electron copiado para electron-builder');