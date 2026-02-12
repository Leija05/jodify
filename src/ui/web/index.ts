export interface WebBootstrapOptions {
    onReady?: () => void;
}

export const webUI = {
    bootstrap({ onReady }: WebBootstrapOptions = {}): void {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => onReady?.());
        } else {
            onReady?.();
        }
    }
};
