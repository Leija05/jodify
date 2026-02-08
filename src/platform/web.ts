export const webPlatform = {
    name: 'web',
    isAvailable(): boolean {
        return typeof window !== 'undefined';
    }
};
