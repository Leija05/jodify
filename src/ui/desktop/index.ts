export interface DesktopBootstrapOptions {
    onReady?: () => void;
}

export const desktopUI = {
    bootstrap({ onReady }: DesktopBootstrapOptions = {}): void {
        onReady?.();
    }
};
