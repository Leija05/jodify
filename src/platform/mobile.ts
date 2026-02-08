export const mobilePlatform = {
    name: 'mobile',
    isAvailable(): boolean {
        return typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent);
    }
};
