import { api, API_BASE, getAuthToken } from '../lib/api';
import type { AppUpdateItem, DevKeyRow, DevLogEvent, DevOverview, DevState, DevToken, DevUserRow } from '../lib/types';

export interface DevAccessResult {
  token: string;
  username: string;
  role: string;
}

export const devService = {
  async accessWithKey(devKey: string): Promise<DevAccessResult> {
    const result = await api.post<DevAccessResult>('/dev/access', { dev_key: devKey });
    return result;
  },

  async redeemToken(token: string, username: string, password: string): Promise<DevAccessResult> {
    return api.post<DevAccessResult>('/dev/redeem', { token, username, password });
  },

  async state(): Promise<DevState> {
    return api.get<DevState>('/dev/state');
  },

  async overview(): Promise<DevOverview> {
    return api.get<DevOverview>('/dev/overview');
  },

  async plays(days = 14): Promise<Array<{ date: string; count: number }>> {
    return api.get<Array<{ date: string; count: number }>>(`/dev/plays?days=${days}`);
  },

  async listTokens(): Promise<DevToken[]> {
    return api.get<DevToken[]>('/dev/tokens');
  },

  async createToken(params: {
    role: 'admin' | 'mod';
    label?: string;
    expires_in_days?: number | null;
    max_uses?: number;
    assigned_username?: string;
    assigned_password?: string;
  }): Promise<DevToken> {
    return api.post<DevToken>('/dev/tokens', params);
  },

  async revokeToken(id: string): Promise<{ ok: boolean }> {
    return api.post<{ ok: boolean }>(`/dev/tokens/${id}/revoke`);
  },

  async listUsers(): Promise<DevUserRow[]> {
    return api.get<DevUserRow[]>('/dev/users');
  },

  async createUser(username: string, password: string, role: 'user' | 'mod' | 'admin' = 'user'): Promise<{ ok: boolean; username: string; role: string }> {
    return api.post<{ ok: boolean; username: string; role: string }>('/dev/users', { username, password, role });
  },

  async listDevKeys(): Promise<DevKeyRow[]> {
    return api.get<DevKeyRow[]>('/dev/keys');
  },

  async createDevKey(label = ''): Promise<DevKeyRow & { token: string }> {
    return api.post<DevKeyRow & { token: string }>('/dev/keys', { label });
  },

  async revokeDevKey(id: string): Promise<{ ok: boolean }> {
    return api.post<{ ok: boolean }>(`/dev/keys/${id}/revoke`);
  },

  async setRole(username: string, role: 'user' | 'mod' | 'admin'): Promise<{ ok: boolean }> {
    return api.post<{ ok: boolean }>(`/dev/users/${encodeURIComponent(username)}/role`, { role });
  },

  async forceOffline(username: string): Promise<{ ok: boolean }> {
    return api.post<{ ok: boolean }>(`/dev/users/${encodeURIComponent(username)}/offline`);
  },

  async updateUser(
    usernameOrId: string,
    data: Partial<DevUserRow> & { password?: string; new_username?: string }
  ): Promise<DevUserRow> {
    return api.put<DevUserRow>(`/dev/users/${encodeURIComponent(usernameOrId)}`, data);
  },

  async deleteUser(usernameOrId: string): Promise<{ ok: boolean; username: string }> {
    return api.del<{ ok: boolean; username: string }>(`/dev/users/${encodeURIComponent(usernameOrId)}`);
  },

  async setMaintenance(enabled: boolean, message = ''): Promise<{ enabled: boolean; message: string }> {
    return api.post<{ enabled: boolean; message: string }>('/dev/maintenance', { enabled, message });
  },

  async purgeLogs(): Promise<void> {
    await api.del('/dev/logs');
  },

  subscribeStream(onEvent: (event: DevLogEvent) => void): () => void {
    const token = getAuthToken();
    const controller = new AbortController();
    const url = `${API_BASE}/dev/stream`;

    async function run(): Promise<void> {
      try {
        const response = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: controller.signal,
        });
        if (!response.ok || !response.body) return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let sep: number;
          while ((sep = buffer.indexOf('\n\n')) !== -1) {
            const frame = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            for (const line of frame.split('\n')) {
              if (!line.startsWith('data:')) continue;
              try {
                const event = JSON.parse(line.slice(5).trim()) as DevLogEvent;
                onEvent(event);
              } catch {
                /* ignore malformed frames */
              }
            }
          }
        }
      } catch {
        /* aborted or network error */
      }
    }

    void run();
    return () => controller.abort();
  },

  async listAppUpdates(): Promise<AppUpdateItem[]> {
    return api.get<AppUpdateItem[]>('/updates/list');
  },

  async uploadAppUpdate(
    formData: FormData,
    onProgress?: (percent: number) => void
  ): Promise<{ success: boolean; message: string; update: AppUpdateItem }> {
    const token = getAuthToken();
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/updates/upload`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            const percent = Math.round((evt.loaded / evt.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve({ success: true, message: 'Actualización subida con éxito', update: {} as any });
          }
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.detail || 'Error al subir archivo APK a la base de datos'));
          } catch {
            reject(new Error(`Error del servidor (${xhr.status})`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Error de conexión con el servidor al subir APK'));
      xhr.send(formData);
    });
  },

  async activateAppUpdate(updateId: string): Promise<{ success: boolean; message: string }> {
    return api.put<{ success: boolean; message: string }>(`/updates/${updateId}/activate`);
  },

  async deleteAppUpdate(updateId: string): Promise<{ success: boolean; message: string }> {
    return api.del<{ success: boolean; message: string }>(`/updates/${updateId}`);
  },
};
