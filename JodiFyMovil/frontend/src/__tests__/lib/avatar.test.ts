import { describe, it, expect } from 'vitest';
import {
  resolveAvatarUrl,
  getFrameDefinition,
  getThemeDefinition,
  AVATAR_FRAMES,
  PROFILE_THEMES,
} from '../../lib/avatar';

describe('avatar utility', () => {
  it('resolves direct http and https avatar urls', () => {
    const user = { avatar_url: 'https://images.unsplash.com/photo-123' };
    expect(resolveAvatarUrl(user)).toBe('https://images.unsplash.com/photo-123');
  });

  it('resolves relative avatar urls with backend API base', () => {
    const user = { avatar_url: '/api/users/avatar/test.png' };
    const resolved = resolveAvatarUrl(user);
    expect(resolved).toContain('/api/users/avatar/test.png');
  });

  it('resolves discord profile avatar if present', () => {
    const user = {
      username: 'test',
      discord: { avatar_url: 'https://cdn.discordapp.com/avatars/123/abc.png' },
    };
    expect(resolveAvatarUrl(user)).toBe('https://cdn.discordapp.com/avatars/123/abc.png');
  });

  it('resolves discord id fallback avatar if no avatar_url is provided', () => {
    const user = {
      username: 'test',
      discord_id: '768431429313888266',
    };
    const resolved = resolveAvatarUrl(user);
    expect(resolved).toMatch(/cdn\.discordapp\.com\/embed\/avatars\/\d\.png/);
  });

  it('returns null when user has no avatar data', () => {
    expect(resolveAvatarUrl(null)).toBeNull();
    expect(resolveAvatarUrl({})).toBeNull();
    expect(resolveAvatarUrl({ username: 'Carlos' })).toBeNull();
  });

  it('returns valid frame definition for known frames', () => {
    const neon = getFrameDefinition('neon_cyan');
    expect(neon.id).toBe('neon_cyan');
    expect(neon.colors.length).toBeGreaterThan(1);

    const none = getFrameDefinition('none');
    expect(none.id).toBe('none');

    const fallback = getFrameDefinition('non_existent_frame');
    expect(fallback.id).toBe('none');
  });

  it('returns valid theme definition for known themes', () => {
    const aurora = getThemeDefinition('aurora');
    expect(aurora.id).toBe('aurora');
    expect(aurora.primaryColor).toBe('#10b981');

    const fallback = getThemeDefinition('non_existent_theme');
    expect(fallback.id).toBe('aurora');
  });
});
