export type StorageValue = string | number | boolean | object | null;

export const storage = {
    get<T extends StorageValue>(key: string, fallback: T): T {
        if (typeof localStorage === 'undefined') return fallback;
        const raw = localStorage.getItem(key);
        if (raw === null) return fallback;
        try {
            return JSON.parse(raw) as T;
        } catch {
            return raw as T;
        }
    },
    set(key: string, value: StorageValue): void {
        if (typeof localStorage === 'undefined') return;
        const payload = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, payload);
    },
    remove(key: string): void {
        if (typeof localStorage === 'undefined') return;
        localStorage.removeItem(key);
    }
};
