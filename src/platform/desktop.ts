export const desktopPlatform = {
    name: 'desktop',
    isAvailable(): boolean {
        return typeof window !== 'undefined' && typeof (window as any).electronAPI !== 'undefined';
    }
};
