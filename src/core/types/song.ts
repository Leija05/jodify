export type SongId = string | number;

export interface Song {
    id: SongId;
    name: string;
    artist?: string;
    url?: string;
    coverUrl?: string;
    duration?: number;
    playCount?: number;
    liked?: boolean;
}
