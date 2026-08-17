import type { DiscordProfile, Presence, UserAccess } from './types';
import { timeAgo } from './utils';

export const JF_ONLINE_MS = 90_000;

export interface UserStatusView {
  jfOnline: boolean;
  jfLabel: string;
  jfTone: string;
  discordLabel?: string;
  discordTone?: string;
}

export function jfIsOnline(user?: Pick<UserAccess, 'is_online' | 'last_seen'> | null): boolean {
  if (!user || user.is_online !== 1) return false;
  if (!user.last_seen) return true;
  const t = Date.parse(user.last_seen);
  return Number.isNaN(t) ? true : Date.now() - t < JF_ONLINE_MS;
}

export function presenceLabel(p?: Presence | null): string {
  switch (p) {
    case 'online':
      return 'En línea';
    case 'idle':
      return 'Ausente';
    case 'dnd':
      return 'No molestar';
    case 'offline':
      return 'Sin conexión';
    default:
      return 'Desconectado';
  }
}

export function presenceTone(p?: Presence | null): string {
  const t = p ?? 'offline';
  return t === 'online' || t === 'idle' || t === 'dnd' ? t : 'offline';
}

export function statusView(user?: Pick<UserAccess, 'is_online' | 'last_seen'> | null, discord?: DiscordProfile | null): UserStatusView {
  const online = jfIsOnline(user);
  const offlineLabel = user?.last_seen ? `Visto ${timeAgo(user.last_seen)}` : 'Desconectado';
  return {
    jfOnline: online,
    jfLabel: online ? 'En línea en JodiFy' : offlineLabel,
    jfTone: online ? 'online' : 'offline',
    discordLabel: discord ? presenceLabel(discord.presence) : undefined,
    discordTone: discord ? presenceTone(discord.presence) : undefined,
  };
}
