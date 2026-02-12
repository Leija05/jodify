export interface FadeOptions {
    from: number;
    to: number;
    durationMs: number;
    stepMs?: number;
    onUpdate?: (value: number) => void;
    onComplete?: () => void;
}

export const fade = {
    run(options: FadeOptions): () => void {
        const { from, to, durationMs, stepMs = 50, onUpdate, onComplete } = options;
        const start = Date.now();
        const delta = to - from;
        const clamp = (value: number): number => Math.min(1, Math.max(0, value));
        const timer = setInterval(() => {
            const elapsed = Date.now() - start;
            const progress = Math.min(1, elapsed / durationMs);
            const value = clamp(from + delta * progress);
            onUpdate?.(value);
            if (progress >= 1) {
                clearInterval(timer);
                onComplete?.();
            }
        }, stepMs);
        return () => clearInterval(timer);
    }
};
