const IMPORT_BASE = import.meta.env.VITE_IMPORT_API ?? '/api';

export async function importFromUrl(url: string): Promise<{ filename: string; blob: Blob; mediaType: string }> {
  const response = await fetch(`${IMPORT_BASE}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    let detail = 'Falló la importación';
    try {
      const json = (await response.json()) as { detail?: string };
      detail = json.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  const disposition = response.headers.get('content-disposition') ?? '';
  const filename = extractFilename(disposition) ?? 'imported-audio';
  return { filename, blob: await response.blob(), mediaType: response.headers.get('content-type') ?? 'audio/mpeg' };
}

function extractFilename(disposition: string): string | null {
  const match = disposition.match(/filename="?([^";]+)"?/i);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function buildImportPayload(url: string): { url: string } {
  return { url: url.trim() };
}
