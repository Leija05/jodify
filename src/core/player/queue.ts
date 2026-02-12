import type { Song, SongId } from '../types/song';

export interface QueueState {
    items: Song[];
    currentIndex: number;
}

const state: QueueState = {
    items: [],
    currentIndex: -1
};

const findIndex = (id: SongId): number => state.items.findIndex((song) => song.id === id);

export const queue = {
    state,
    add(song: Song): void {
        state.items.push(song);
        if (state.currentIndex === -1) state.currentIndex = 0;
    },
    addMany(songs: Song[]): void {
        state.items.push(...songs);
        if (state.currentIndex === -1 && state.items.length > 0) state.currentIndex = 0;
    },
    remove(id: SongId): void {
        const index = findIndex(id);
        if (index === -1) return;
        state.items.splice(index, 1);
        if (state.currentIndex >= state.items.length) state.currentIndex = state.items.length - 1;
    },
    clear(): void {
        state.items = [];
        state.currentIndex = -1;
    },
    move(fromIndex: number, toIndex: number): void {
        if (fromIndex < 0 || fromIndex >= state.items.length) return;
        if (toIndex < 0 || toIndex >= state.items.length) return;
        const [item] = state.items.splice(fromIndex, 1);
        state.items.splice(toIndex, 0, item);
    },
    current(): Song | null {
        return state.currentIndex >= 0 ? state.items[state.currentIndex] : null;
    },
    next(shuffle = false): Song | null {
        if (state.items.length === 0) return null;
        if (shuffle) {
            state.currentIndex = Math.floor(Math.random() * state.items.length);
        } else {
            state.currentIndex = (state.currentIndex + 1) % state.items.length;
        }
        return queue.current();
    },
    previous(): Song | null {
        if (state.items.length === 0) return null;
        state.currentIndex = (state.currentIndex - 1 + state.items.length) % state.items.length;
        return queue.current();
    }
};
