import type { Song } from './song';
import type { User } from './user';

export type JamId = string;

export interface JamMember {
    user: User;
    joinedAt: number;
    isHost?: boolean;
}

export interface JamSession {
    id: JamId;
    code: string;
    host: User;
    members: JamMember[];
    currentSong?: Song;
    startedAt: number;
    updatedAt: number;
}
