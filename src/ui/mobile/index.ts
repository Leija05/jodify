export interface MobileBootstrapOptions {
    onReady?: () => void;
}

export const mobileUI = {
    bootstrap({ onReady }: MobileBootstrapOptions = {}): void {
        onReady?.();
    }
};
