import type { JamSession, JamId } from '../../types/jam';

const sessions = new Map<JamId, JamSession>();

export const jamRepo = {
    all(): JamSession[] {
        return Array.from(sessions.values());
    },
    get(id: JamId): JamSession | undefined {
        return sessions.get(id);
    },
    upsert(session: JamSession): void {
        sessions.set(session.id, session);
    },
    remove(id: JamId): void {
        sessions.delete(id);
    },
    clear(): void {
        sessions.clear();
    }
};
