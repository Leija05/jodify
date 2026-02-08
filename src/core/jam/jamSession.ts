import type { JamSession, JamMember } from '../types/jam';
import type { Song } from '../types/song';
import type { User } from '../types/user';
import { time } from '../utils/time';

let session: JamSession | null = null;

export const jamSession = {
    get(): JamSession | null {
        return session;
    },
    create({ host, code }: { host: User; code: string }): JamSession {
        const now = time.now();
        session = {
            id: `${code}-${now}`,
            code,
            host,
            members: [{ user: host, joinedAt: now, isHost: true }],
            startedAt: now,
            updatedAt: now
        };
        return session;
    },
    join(user: User): JamMember | null {
        if (!session) return null;
        const member = { user, joinedAt: time.now() };
        session.members.push(member);
        session.updatedAt = time.now();
        return member;
    },
    leave(userId: User['id']): void {
        if (!session) return;
        session.members = session.members.filter((member) => member.user.id !== userId);
        session.updatedAt = time.now();
    },
    setNowPlaying(song: Song | undefined): void {
        if (!session) return;
        session.currentSong = song;
        session.updatedAt = time.now();
    },
    close(): void {
        session = null;
    }
};
