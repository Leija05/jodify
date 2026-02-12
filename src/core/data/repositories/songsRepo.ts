import type { Song, SongId } from '../../types/song';

const songs = new Map<SongId, Song>();

export const songsRepo = {
    all(): Song[] {
        return Array.from(songs.values());
    },
    get(id: SongId): Song | undefined {
        return songs.get(id);
    },
    upsert(song: Song): void {
        songs.set(song.id, song);
    },
    remove(id: SongId): void {
        songs.delete(id);
    },
    clear(): void {
        songs.clear();
    }
};
