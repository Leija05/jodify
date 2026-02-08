import type { JamSession } from '../types/jam';
import { time } from '../utils/time';

export interface SyncState {
    lastSyncedAt: number;
    status: 'idle' | 'syncing' | 'error';
    error?: string;
}

const state: SyncState = {
    lastSyncedAt: 0,
    status: 'idle'
};

export const jamSync = {
    state,
    async sync(session: JamSession, handler: (session: JamSession) => Promise<void>): Promise<void> {
        state.status = 'syncing';
        try {
            await handler(session);
            state.lastSyncedAt = time.now();
            state.status = 'idle';
            state.error = undefined;
        } catch (error) {
            state.status = 'error';
            state.error = error instanceof Error ? error.message : 'Unknown error';
        }
    }
};
