import { cpSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const source = resolve(root, 'assets', 'icon.ico');
const destDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const dest = resolve(destDir, 'favicon.ico');

mkdirSync(destDir, { recursive: true });
if (!existsSync(source)) {
  console.error('[sync-assets] No se encontro el icono compartido:', source);
  process.exit(1);
}
cpSync(source, dest);
console.log('[sync-assets] favicon.ico sincronizado desde assets/icon.ico');