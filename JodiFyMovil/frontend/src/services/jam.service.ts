import { io, Socket } from 'socket.io-client';
import { API_BASE, SOCKET_URL } from '../lib/constants';
import type { JamSession, JamHistoryEntry } from '../lib/types';

let socket: Socket | null = null;
let currentCode: string | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function connectSocket(code: string): Socket {
  currentCode = code;
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentCode = null;
  }
}

export function emitBroadcast(codeOrEvent: string, eventOrData: any, maybeData?: any): void {
  const s = getSocket();
  let event: string;
  let data: any;
  let code = currentCode;
  if (maybeData !== undefined) {
    code = codeOrEvent;
    event = eventOrData;
    data = maybeData;
  } else {
    event = codeOrEvent;
    data = eventOrData;
  }
  if (s.connected && code) {
    s.emit(event, { code, ...data });
  }
}

export function onJamEvent(event: string, handler: (data: any) => void): () => void {
  const s = getSocket();
  s.on(event, handler);
  return () => s.off(event, handler);
}

export async function createSession(username: string): Promise<{ code: string; sessionId: number }> {
  const res = await fetch(`${API_BASE}/api/jam/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) throw new Error('Failed to create session');
  return res.json();
}

export async function fetchActiveSession(code: string): Promise<JamSession | null> {
  try {
    const res = await fetch(`${API_BASE}/api/jam/${code}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function upsertMember(username: string, sessionId: number | string, isHost: boolean): Promise<void> {
  await fetch(`${API_BASE}/api/jam/${sessionId}/member`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, is_host: isHost }),
  });
}

export async function markMemberInactive(username: string, sessionId: number | string): Promise<void> {
  await fetch(`${API_BASE}/api/jam/${sessionId}/member/${encodeURIComponent(username)}`, {
    method: 'DELETE',
  });
}

export async function closeSession(sessionId: number | string): Promise<void> {
  await fetch(`${API_BASE}/api/jam/${sessionId}`, {
    method: 'DELETE',
  });
}

export async function fetchJamHistory(username: string): Promise<JamHistoryEntry[]> {
  return fetch(`${API_BASE}/api/jam/history/${encodeURIComponent(username)}`).then((r) => r.json());
}

export async function sendRecommendation(code: string, songId: string | number, songName: string, username: string): Promise<void> {
  emitBroadcast(code, 'jam-recommend', { songId, songName, username, timestamp: Date.now() });
}

export function generateJamCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}