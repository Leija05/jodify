export interface PlaybackState {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    muted: boolean;
    loop: boolean;
    shuffle: boolean;
}

const state: PlaybackState = {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    muted: false,
    loop: false,
    shuffle: false
};

export const playback = {
    state,
    play(): void {
        state.isPlaying = true;
    },
    pause(): void {
        state.isPlaying = false;
    },
    toggle(): void {
        state.isPlaying = !state.isPlaying;
    },
    setTime(time: number, duration?: number): void {
        state.currentTime = Math.max(0, time);
        if (typeof duration === 'number') state.duration = Math.max(0, duration);
    },
    setVolume(volume: number): void {
        state.volume = Math.min(1, Math.max(0, volume));
        state.muted = state.volume === 0 ? true : state.muted;
    },
    setMuted(muted: boolean): void {
        state.muted = muted;
    },
    setLoop(loop: boolean): void {
        state.loop = loop;
    },
    setShuffle(shuffle: boolean): void {
        state.shuffle = shuffle;
    }
};
