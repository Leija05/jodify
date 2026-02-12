export type UserId = string | number;

export interface User {
    id: UserId;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    role?: string;
}
