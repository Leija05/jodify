import type { JamMember } from '../types/jam';
import type { User } from '../types/user';

const members: JamMember[] = [];

export const jamMembers = {
    list(): JamMember[] {
        return [...members];
    },
    add(user: User, isHost = false): JamMember {
        const member = { user, joinedAt: Date.now(), isHost };
        members.push(member);
        return member;
    },
    remove(userId: User['id']): void {
        const index = members.findIndex((member) => member.user.id === userId);
        if (index >= 0) members.splice(index, 1);
    },
    clear(): void {
        members.splice(0, members.length);
    }
};
