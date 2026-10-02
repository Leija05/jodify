import { create } from 'zustand';
import { ACHIEVEMENTS_LIST } from '../lib/achievements';
import { useToastStore } from './toast.store';

export interface UnlockedRecord {
  unlockedAt: number;
}

export interface AchievementsState {
  unlocked: Record<string, UnlockedRecord>;
  affectionPoints: number;
  snackCount: number;
  unlock: (id: string) => boolean;
  isUnlocked: (id: string) => boolean;
  addPetAffection: (points?: number) => void;
  feedPetSnack: () => void;
  getStats: () => { total: number; unlockedCount: number; percent: number; totalXp: number };
}

const STORAGE_KEY = 'jf_achievements_registry_v1';
const AFFECTION_KEY = 'jf_pet_affection_xp';
const SNACKS_KEY = 'jf_pet_snacks_eaten';

function loadStored(): Record<string, UnlockedRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadNumber(key: string, def = 0): number {
  try {
    const val = Number(localStorage.getItem(key));
    return Number.isFinite(val) ? val : def;
  } catch {
    return def;
  }
}

export const useAchievementsStore = create<AchievementsState>((set, get) => ({
  unlocked: loadStored(),
  affectionPoints: loadNumber(AFFECTION_KEY, 0),
  snackCount: loadNumber(SNACKS_KEY, 0),

  unlock: (id: string) => {
    const current = get().unlocked;
    if (current[id]) return false;

    const ach = ACHIEVEMENTS_LIST.find((a) => a.id === id);
    if (!ach) return false;

    const updated = {
      ...current,
      [id]: { unlockedAt: Date.now() },
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    set({ unlocked: updated });

    // Toast de celebración
    useToastStore.getState().show(
      `🏆 ¡Logro Desbloqueado! ${ach.title} (+${ach.xpReward} XP)`,
      'success',
      4500
    );

    // Otorgar XP al usuario en backend si hay sesión activa
    const username = localStorage.getItem('currentUserName');
    if (username) {
      import('../services/users.service').then(({ recordListeningTime }) => {
        // Otorgar segundos equivalentes a XP
        recordListeningTime(username, Math.round(ach.xpReward * 0.75)).catch(() => undefined);
      });
    }

    return true;
  },

  isUnlocked: (id: string) => {
    return Boolean(get().unlocked[id]);
  },

  addPetAffection: (points = 10) => {
    const next = get().affectionPoints + points;
    try {
      localStorage.setItem(AFFECTION_KEY, String(next));
    } catch {}
    set({ affectionPoints: next });
    if (next >= 150) {
      get().unlock('pet_devotion');
    }
  },

  feedPetSnack: () => {
    const nextSnacks = get().snackCount + 1;
    const nextAffection = get().affectionPoints + 20;
    try {
      localStorage.setItem(SNACKS_KEY, String(nextSnacks));
      localStorage.setItem(AFFECTION_KEY, String(nextAffection));
    } catch {}
    set({ snackCount: nextSnacks, affectionPoints: nextAffection });
    if (nextSnacks >= 10 || nextAffection >= 150) {
      get().unlock('pet_devotion');
    }
  },

  getStats: () => {
    const total = ACHIEVEMENTS_LIST.length;
    const unlockedMap = get().unlocked;
    const unlockedCount = Object.keys(unlockedMap).length;
    const percent = total > 0 ? Math.round((unlockedCount / total) * 100) : 0;
    const totalXp = ACHIEVEMENTS_LIST.reduce((acc, ach) => {
      return acc + (unlockedMap[ach.id] ? ach.xpReward : 0);
    }, 0);
    return { total, unlockedCount, percent, totalXp };
  },
}));
