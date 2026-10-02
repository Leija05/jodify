import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { EqualizerBars } from '@components/ui/EqualizerBars';
import { PressableFluid } from '@components/ui/PressableFluid';
import { EmptyState } from '@components/ui/EmptyState';
import { UserAvatar } from '@components/ui/UserAvatar';
import { UserProfileModal } from '@components/profile/UserProfileModal';
import { fetchCommunityUsers, CommunityUser } from '@services/users.service';
import { usePlayerStore } from '@stores/player.store';
import { useJamStore } from '@stores/jam.store';
import { useSettingsStore } from '@stores/settings.store';
import { useUiStore } from '@stores/ui.store';
import { resolveArtist } from '@lib/utils';
import { mmkv } from '@lib/mmkv';
import { colors, gradients } from '@theme';

const COMMUNITY_CACHE_KEY = 'community.cached_users';

type FilterType = 'all' | 'online' | 'listening';

interface UserCardProps {
  user: CommunityUser;
  onPress: () => void;
}

function UserCard({ user, onPress }: UserCardProps) {
  const nowPlaying = user.now_playing;
  const presence = user.presence ?? (user.online ? 'online' : 'offline');
  const isOnline = presence === 'online';
  const isBackground = presence === 'background';

  const role = (user.role || 'user').toLowerCase();
  const displayName = user.display_name || user.username;

  return (
    <PressableFluid onPress={onPress} haptic="light" style={styles.userCard} scaleTo={0.98}>
      <View style={styles.userCardContent}>
        <UserAvatar
          user={user}
          size={50}
          showPresence
          presence={isOnline ? 'online' : isBackground ? 'background' : 'offline'}
        />

        <View style={styles.userInfo}>
          <View style={styles.userHeader}>
            <Text style={styles.username} numberOfLines={1}>
              {displayName}
            </Text>
            {user.custom_badge ? (
              <View style={styles.userBadgeWrap}>
                <Text style={styles.userBadgeText}>{user.custom_badge}</Text>
              </View>
            ) : null}
            <View
              style={[
                styles.roleBadge,
                role === 'admin' && styles.roleAdmin,
                role === 'mod' && styles.roleMod,
                role === 'dev' && styles.roleDev,
              ]}
            >
              <Text style={styles.roleText}>{role.toUpperCase()}</Text>
            </View>
          </View>

          {nowPlaying ? (
            <View style={styles.nowPlaying}>
              <View style={styles.nowPlayingIcon}>
                <EqualizerBars playing bars={3} height={12} barWidth={2.5} color={colors.secondary} />
              </View>
              <View style={styles.nowPlayingTexts}>
                <Text style={styles.nowPlayingLabel}>
                  {isBackground ? 'EN 2DO PLANO · ESCUCHANDO' : 'ESCUCHANDO'}
                </Text>
                <Text style={styles.nowPlayingSong} numberOfLines={1}>
                  {nowPlaying.song_name}
                </Text>
                {nowPlaying.artist && (
                  <Text style={styles.nowPlayingArtist} numberOfLines={1}>
                    {nowPlaying.artist}
                  </Text>
                )}
              </View>
            </View>
          ) : user.vibe ? (
            <Text style={styles.vibeText} numberOfLines={1}>
              {user.vibe}
            </Text>
          ) : (
            <Text
              style={[
                styles.lastSeen,
                isOnline && { color: '#00E676' },
                isBackground && { color: '#B388FF' },
              ]}
            >
              {isOnline
                ? 'En línea'
                : isBackground
                ? 'En 2do plano'
                : user.last_seen
                ? `Visto hace ${formatRelativeTime(user.last_seen)}`
                : 'Desconectado'}
            </Text>
          )}
        </View>

        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.25)" />
      </View>
    </PressableFluid>
  );
}

function formatRelativeTime(dateString: string): string {
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function CommunityScreen() {
  const [users, setUsers] = useState<CommunityUser[]>(() => {
    try {
      const cached = mmkv.getObject<CommunityUser[]>(COMMUNITY_CACHE_KEY);
      if (Array.isArray(cached) && cached.length > 0) return cached;
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState(() => {
    try {
      const cached = mmkv.getObject<CommunityUser[]>(COMMUNITY_CACHE_KEY);
      return !(Array.isArray(cached) && cached.length > 0);
    } catch {
      return true;
    }
  });
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CommunityUser | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const user = useSettingsStore((s) => s.user);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const openFullscreen = useUiStore((s) => s.openFullscreen);
  const openJamModal = useUiStore((s) => s.openJamModal);
  const jamActive = useJamStore((s) => s.active);
  const jamCode = useJamStore((s) => s.code);
  const jamIsHost = useJamStore((s) => s.isHost);

  const loadUsers = useCallback(async () => {
    try {
      const data = await fetchCommunityUsers();
      if (Array.isArray(data) && data.length > 0) {
        setUsers(data);
        try {
          mmkv.setObject(COMMUNITY_CACHE_KEY, data);
        } catch {}
      } else if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch {
      // Retain existing or cached users instead of blanking out
      setUsers((prev) => {
        if (prev.length > 0) return prev;
        try {
          const cached = mmkv.getObject<CommunityUser[]>(COMMUNITY_CACHE_KEY);
          return Array.isArray(cached) ? cached : [];
        } catch {
          return prev;
        }
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    const interval = setInterval(() => {
      void loadUsers();
    }, 20000);
    return () => clearInterval(interval);
  }, [loadUsers]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadUsers();
  }, [loadUsers]);

  const handleUserPress = useCallback((u: CommunityUser) => {
    setSelectedUser(u);
    setShowProfile(true);
  }, []);

  const onlineUsers = useMemo(
    () =>
      users.filter(
        (u) =>
          u.online ||
          u.is_online === 1 ||
          u.presence === 'online' ||
          u.presence === 'background'
      ).length,
    [users]
  );
  const totalUsers = users.length;
  const listeningUsers = useMemo(
    () => users.filter((u) => !!u.now_playing || !!u.current_song_name).length,
    [users]
  );

  const currentUserData = useMemo(
    () =>
      users.find((u) => u.username.toLowerCase() === user?.username.toLowerCase()),
    [users, user]
  );

  const effectiveUserData = useMemo((): CommunityUser | null => {
    if (!user) return null;
    const base = currentUserData;
    const resolvedArtist = currentSong ? resolveArtist(currentSong) : null;
    const nowPlaying: CommunityUser['now_playing'] = currentSong
      ? {
          song_id:
            typeof currentSong.id === 'number'
              ? currentSong.id
              : Number(currentSong.id) || 0,
          song_name: currentSong.name,
          ...(resolvedArtist ? { artist: resolvedArtist } : {}),
          ...(currentSong.album ? { album: currentSong.album } : {}),
          ...(currentSong.cover_url ? { cover_url: currentSong.cover_url } : {}),
          ...(currentSong.duration ? { duration: currentSong.duration } : {}),
        }
      : base?.now_playing ?? null;

    return {
      id: user.id ?? 0,
      username: user.username,
      display_name: user.display_name ?? user.username,
      avatar_url: user.avatar_url ?? null,
      avatar_source: user.avatar_source ?? 'custom',
      avatar_frame: user.avatar_frame ?? 'none',
      theme: user.theme ?? 'aurora',
      accent_color: user.accent_color ?? '#10b981',
      ...(user.custom_badge ? { custom_badge: user.custom_badge } : {}),
      ...(user.vibe ? { vibe: user.vibe } : {}),
      ...(user.bio ? { bio: user.bio } : {}),
      role: user.role ?? 'user',
      ...(user.created_at ? { created_at: user.created_at } : {}),
      ...base,
      online: true,
      presence: 'online',
      now_playing: nowPlaying,
    };
  }, [user, currentUserData, currentSong]);

  // Filtered other users
  const filteredUsers = useMemo(() => {
    let list = users;
    if (user) {
      list = users.filter((u) => u.username.toLowerCase() !== user.username.toLowerCase());
    }

    if (activeFilter === 'online') {
      list = list.filter(
        (u) =>
          u.online ||
          u.is_online === 1 ||
          u.presence === 'online' ||
          u.presence === 'background'
      );
    } else if (activeFilter === 'listening') {
      list = list.filter((u) => !!u.now_playing || !!u.current_song_name);
    }

    return list;
  }, [users, user, activeFilter]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.title}>Comunidad</Text>
          <Text style={styles.subtitle}>
            {totalUsers} usuarios · {onlineUsers} en línea
          </Text>
        </View>
        <PressableFluid
          onPress={handleRefresh}
          haptic="light"
          style={styles.refreshBtn}
          scaleTo={0.95}
        >
          <Ionicons name="refresh" size={20} color={colors.secondary} />
        </PressableFluid>
      </View>

      {/* JodiFy Jam Banner */}
      <PressableFluid
        onPress={openJamModal}
        haptic="light"
        style={styles.jamBannerCard}
        scaleTo={0.98}
      >
        <View style={styles.jamBannerContent}>
          <View style={[styles.jamBannerIconWrap, jamActive && styles.jamBannerIconActive]}>
            <Ionicons name="people" size={20} color={jamActive ? '#00E676' : colors.secondary} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.jamBannerTitle}>JodiFy Jam</Text>
              {jamActive ? (
                <View style={styles.jamLiveTag}>
                  <View style={styles.jamLiveDot} />
                  <Text style={styles.jamLiveText}>
                    {jamCode} · {jamIsHost ? 'HOST' : 'EN VIVO'}
                  </Text>
                </View>
              ) : (
                <View style={styles.jamSyncTag}>
                  <Text style={styles.jamSyncTagText}>SINCRONIZAR</Text>
                </View>
              )}
            </View>
            <Text style={styles.jamBannerDesc} numberOfLines={1}>
              {jamActive
                ? 'Sesión en curso · Toca para ver participantes'
                : 'Conéctate con JodiFy Escritorio para escuchar juntos'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" />
        </View>
      </PressableFluid>

      {/* "Tú" Current User Card */}
      {effectiveUserData && (
        <PressableFluid
          onPress={() => handleUserPress(effectiveUserData)}
          haptic="light"
          style={styles.youCard}
          scaleTo={0.98}
        >
          <View style={styles.youCardContent}>
            <UserAvatar
              user={effectiveUserData}
              size={54}
              showPresence
              presence="online"
            />
            <View style={styles.youInfo}>
              <View style={styles.youHeader}>
                <Text style={styles.youName}>
                  {effectiveUserData.display_name ?? effectiveUserData.username}
                </Text>
                {effectiveUserData.custom_badge ? (
                  <View style={styles.userBadgeWrap}>
                    <Text style={styles.userBadgeText}>{effectiveUserData.custom_badge}</Text>
                  </View>
                ) : null}
                <Text style={styles.youBadge}>TÚ</Text>
              </View>
              {currentSong || effectiveUserData.now_playing ? (
                <View style={styles.youNowPlaying}>
                  <View style={styles.youNowPlayingIcon}>
                    <EqualizerBars
                      playing={isPlaying}
                      bars={3}
                      height={12}
                      barWidth={2.5}
                      color={colors.secondary}
                    />
                  </View>
                  <View style={styles.youNowPlayingTexts}>
                    <Text style={styles.nowPlayingLabel}>ESCUCHANDO AHORA</Text>
                    <Text style={styles.nowPlayingSong} numberOfLines={1}>
                      {currentSong ? currentSong.name : effectiveUserData.now_playing?.song_name}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.youStatus}>En línea · Listo para escuchar</Text>
              )}
            </View>
            {currentSong && (
              <PressableFluid onPress={openFullscreen} haptic="light" style={styles.youExpandBtn}>
                <Ionicons name="expand" size={18} color={colors.primary} />
              </PressableFluid>
            )}
          </View>
        </PressableFluid>
      )}

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{onlineUsers}</Text>
          <Text style={styles.statLabel}>En línea</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{listeningUsers}</Text>
          <Text style={styles.statLabel}>Escuchando</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{totalUsers}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <PressableFluid
          onPress={() => setActiveFilter('all')}
          style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
        >
          <Text
            style={[styles.filterChipText, activeFilter === 'all' && styles.filterChipTextActive]}
          >
            Todos ({users.length})
          </Text>
        </PressableFluid>

        <PressableFluid
          onPress={() => setActiveFilter('online')}
          style={[styles.filterChip, activeFilter === 'online' && styles.filterChipActive]}
        >
          <View style={[styles.filterDot, { backgroundColor: '#00E676' }]} />
          <Text
            style={[styles.filterChipText, activeFilter === 'online' && styles.filterChipTextActive]}
          >
            En línea ({onlineUsers})
          </Text>
        </PressableFluid>

        <PressableFluid
          onPress={() => setActiveFilter('listening')}
          style={[styles.filterChip, activeFilter === 'listening' && styles.filterChipActive]}
        >
          <Ionicons
            name="musical-notes"
            size={12}
            color={activeFilter === 'listening' ? colors.white : colors.textMuted}
          />
          <Text
            style={[
              styles.filterChipText,
              activeFilter === 'listening' && styles.filterChipTextActive,
            ]}
          >
            Escuchando ({listeningUsers})
          </Text>
        </PressableFluid>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Miembros de la Comunidad</Text>
        <Text style={styles.sectionCount}>{filteredUsers.length}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradients.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando comunidad...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => String(item.username)}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surfaceSolid}
            />
          }
          renderItem={({ item }) => (
            <UserCard user={item} onPress={() => handleUserPress(item)} />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="No hay usuarios en este filtro"
              subtitle="Toca 'Todos' o tira hacia abajo para refrescar la lista de usuarios."
              action={{ label: 'Ver todos', onPress: () => setActiveFilter('all') }}
            />
          }
        />
      )}

      {/* User Profile Details Modal */}
      <UserProfileModal
        visible={showProfile}
        onClose={() => setShowProfile(false)}
        user={selectedUser}
        isCurrentUser={
          selectedUser?.username.toLowerCase() === user?.username.toLowerCase()
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingBottom: 110,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jamBannerCard: {
    backgroundColor: 'rgba(127, 0, 255, 0.14)',
    borderWidth: 1.2,
    borderColor: 'rgba(127, 0, 255, 0.35)',
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
  },
  jamBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  jamBannerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(127, 0, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jamBannerIconActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.2)',
  },
  jamBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.white,
  },
  jamLiveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 230, 118, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  jamLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00E676',
  },
  jamLiveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00E676',
  },
  jamSyncTag: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  jamSyncTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.secondary,
    letterSpacing: 0.5,
  },
  jamBannerDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  youCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 14,
    marginBottom: 14,
  },
  youCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  youInfo: {
    flex: 1,
  },
  youHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  youName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.white,
  },
  youBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.secondary,
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  userBadgeWrap: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  userBadgeText: {
    fontSize: 10,
    color: colors.secondary,
    fontWeight: '600',
  },
  youNowPlaying: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  youNowPlayingIcon: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  youNowPlayingTexts: {
    flex: 1,
  },
  nowPlayingLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.secondary,
    letterSpacing: 0.5,
  },
  nowPlayingSong: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  youStatus: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  youExpandBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(127, 0, 255, 0.25)',
    borderColor: 'rgba(127, 0, 255, 0.6)',
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  filterChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondary,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  userCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    overflow: 'hidden',
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  username: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  roleAdmin: {
    backgroundColor: 'rgba(255, 61, 92, 0.2)',
  },
  roleMod: {
    backgroundColor: 'rgba(255, 179, 0, 0.2)',
  },
  roleDev: {
    backgroundColor: 'rgba(127, 0, 255, 0.2)',
  },
  roleText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  nowPlaying: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  nowPlayingIcon: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowPlayingTexts: {
    flex: 1,
  },
  nowPlayingArtist: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  vibeText: {
    fontSize: 11,
    color: colors.secondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  lastSeen: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});