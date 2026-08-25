#!/usr/bin/env node
/**
 * Auto-fixer de imports sin uso (TS6133) a partir de la salida de tsc.
 * Uso: node fix-imports.mjs <frontendDir>
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2];
if (!root) {
  console.error('usage: node fix-imports.mjs <dir>');
  process.exit(1);
}

function runTsc() {
  try {
    const out = execSync(
      `${join(root, 'node_modules', '.bin', 'tsc')} --noEmit --pretty false`,
      { cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
    ).toString();
    return out.split(/\r?\n/).filter(Boolean);
  } catch (err) {
    const out = String(err.stdout ?? '');
    return out.split(/\r?\n/).filter(Boolean);
  }
}

const toWsliPath = (p) => p.replace(/^C:/i, '/mnt/c').replaceAll('\\', '/');

let changedTotal = 0;
for (let pass = 0; pass < 6; pass++) {
  const lines = runTsc();
  // Map<file, Array<{line, id}>>
  const perFile = new Map();
  for (const ln of lines) {
    const m = /^(.+?)\((\d+),\d+\): error TS6133: '([^']+)' is declared but its value is never read\./.exec(ln);
    if (!m) continue;
    const file = toWsliPath(m[1]);
    const lineNo = Number(m[2]);
    const id = m[3];
    if (!perFile.has(file)) perFile.set(file, []);
    perFile.get(file).push({ lineNo, id });
  }
  if (perFile.size === 0) {
    console.log(`pass ${pass}: nothing to fix`);
    break;
  }
  let changed = 0;
  for (const [file, items] of perFile) {
    let src = readFileSync(file, 'utf8');
    const eol = src.includes('\r\n') ? '\r\n' : '\n';
    const linesArr = src.split(/\r?\n/);
    for (const { lineNo, id } of items) {
      const idx = lineNo - 1;
      const raw = linesArr[idx];
      if (raw == null || !/^\s*import\b/.test(raw)) continue;
      // eslint-disable-next-line prefer-regex-literals
      const importRe = new RegExp(`^\\s*import\\s+(type\\s+)?([A-Za-z_$][\\w$]*)(?:\\s*,\\s*\\{([^}]*)\\})?\\s+from\\s`);
      const defM = importRe.exec(raw);
      if (defM && defM[2] === id) {
        // default o namespace import
        const named = defM[3]?.trim();
        if (named) {
          linesArr[idx] = raw.replace(importRe, `import {${defM[3]}} from `);
        } else {
          linesArr.splice(idx, 1);
        }
        changed++;
        continue;
      }
      // import X from / import * as X
      const nsRe = new RegExp(`^\\s*import\\s+(\\*\\s+as\\s+${id}|${id})\\s+from\\s`);
      if (nsRe.test(raw)) {
        linesArr.splice(idx, 1);
        changed++;
        continue;
      }
      // specifier dentro de llaves
      if (raw.includes('{')) {
        const open = raw.indexOf('{');
        const close = raw.lastIndexOf('}');
        if (open >= 0 && close > open) {
          const before = raw.slice(0, open + 1);
          const inner = raw.slice(open + 1, close);
          const after = raw.slice(close);
          const specs = inner.split(',').map((s) => s.trim()).filter(Boolean);
          const filtered = specs.filter((s) => {
            const name = s.replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim();
            return name !== id;
          });
          if (filtered.length !== specs.length) {
            if (filtered.length === 0 && /^\s*import\s*\{/.test(raw)) {
              linesArr.splice(idx, 1);
            } else {
              linesArr[idx] = before + ' ' + filtered.join(', ') + ' ' + after;
            }
            changed++;
          }
        }
      }
    }
    writeFileSync(file, linesArr.join(eol));
  }
  changedTotal += changed;
  console.log(`pass ${pass}: fixed ${changed} unused imports across ${perFile.size} files`);
  if (changed === 0) break;
}
console.log(`TOTAL fixed: ${changedTotal}`);
