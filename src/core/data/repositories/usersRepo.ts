import type { User, UserId } from '../../types/user';

const users = new Map<UserId, User>();

export const usersRepo = {
    all(): User[] {
        return Array.from(users.values());
    },
    get(id: UserId): User | undefined {
        return users.get(id);
    },
    upsert(user: User): void {
        users.set(user.id, user);
    },
    remove(id: UserId): void {
        users.delete(id);
    },
    clear(): void {
        users.clear();
    }
};
