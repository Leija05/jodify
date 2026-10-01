import { API_BASE } from '../lib/api';

export interface HealthCheckResult {
  ok: boolean;
  status: number | null;
  isWaking?: boolean;
  latencyMs?: number;
  error?: string;
}

export async function checkBackendHealth(timeoutMs = 4500): Promise<HealthCheckResult> {
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const healthUrl = `${API_BASE}/health`;
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    clearTimeout(timer);
    const latencyMs = Math.round(performance.now() - start);

    if (response.ok) {
      return {
        ok: true,
        status: response.status,
        latencyMs,
      };
    }

    // 502, 503, 504 suelen indicar que el servicio en Render está despertando (cold-start) o el proxy falló
    const isWaking = [502, 503, 504].includes(response.status);
    return {
      ok: false,
      status: response.status,
      isWaking,
      latencyMs,
      error: `Código HTTP ${response.status}`,
    };
  } catch (err: unknown) {
    clearTimeout(timer);
    const latencyMs = Math.round(performance.now() - start);
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return {
      ok: false,
      status: null,
      isWaking: isAbort, // Si da timeout de varios segundos, probablemente Render está levantando el contenedor
      latencyMs,
      error: isAbort ? 'Tiempo de espera agotado' : err instanceof Error ? err.message : 'Error de red',
    };
  }
}
