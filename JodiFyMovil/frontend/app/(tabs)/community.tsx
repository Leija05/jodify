import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View, Image, ActivityIndicator } from 'react-native';
import { EqualizerBars } from '@components/ui/EqualizerBars';
import { PressableFluid } from '@components/ui/PressableFluid';
import { EmptyState } from '@components/ui/EmptyState';
import { fetchCommunityUsers, CommunityUser } from '@services/users.service';
import { usePlayerStore } from '@stores/player.store';
import { useSettingsStore } from '@stores/settings.store';
import { useUiStore } from '@stores/ui.store';
import { colors, typography, gradients, radius, elevation } from '@theme';
import { resolveArtist } from '@/lib/utils';

interface UserCardProps {
  user: CommunityUser;
  onPress: () => void;
}

function UserCard({ user, onPress }: UserCardProps) {
  const nowPlaying = user.now_playing;
  const presence = user.presence ?? (user.online ? 'online' : 'offline');
  const isOnline = presence === 'online';
  const isBackground = presence === 'background';

  const avatarUri = user.avatar_source === 'discord' && user.discord?.avatar_url
    ? user.discord.avatar_url
    : user.avatar_url ?? user.discord?.avatar_url;

  return (
    <PressableFluid onPress={onPress} haptic="light" style={styles.userCard} scaleTo={0.98}>
      <View style={styles.userCardContent}>
        <View style={styles.avatarWrap}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: gradients.primary[0] }]}>
              <Text style={styles.avatarText}>{user.username.slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
          <View
            style={[
              styles.onlineDot,
              isOnline && { backgroundColor: '#00E676' },
              isBackground && { backgroundColor: '#7F00FF' },
              !isOnline && !isBackground && { backgroundColor: colors.textMuted },
            ]}
          />
        </View>
        <View style={styles.userInfo}>
          <View style={styles.userHeader}>
            <Text style={styles.username}>{user.display_name ?? user.username}</Text>
            <View style={[
              styles.roleBadge,
              user.role === 'admin' && styles.roleAdmin,
              user.role === 'mod' && styles.roleMod,
              user.role === 'dev' && styles.roleDev,
            ]}>
              <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
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
                <Text style={styles.nowPlayingSong} numberOfLines={1}>{nowPlaying.song_name}</Text>
                {nowPlaying.artist && <Text style={styles.nowPlayingArtist} numberOfLines={1}>{nowPlaying.artist}</Text>}
              </View>
            </View>
          ) : (
            <Text style={[
              styles.lastSeen,
              isOnline && { color: '#00E676' },
              isBackground && { color: '#B388FF' },
            ]}>
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
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
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

import { UserProfileModal } from '@components/profile/UserProfileModal';

export default function CommunityScreen() {
  const [users, setUsers] = useState<CommunityUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CommunityUser | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  const user = useSettingsStore((s) => s.user);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const openFullscreen = useUiStore((s) => s.openFullscreen);

  const loadUsers = useCallback(async () => {
    try {
      const data = await fetchCommunityUsers();
      setUsers(data);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
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
    () => users.filter(u => u.online || u.is_online === 1 || u.presence === 'online' || u.presence === 'background').length,
    [users]
  );
  const totalUsers = users.length;
  const listeningUsers = useMemo(() => users.filter(u => !!u.now_playing).length, [users]);

  const currentUserData = useMemo(() => users.find(u => u.username.toLowerCase() === user?.username.toLowerCase()), [users, user]);

  const effectiveUserData = useMemo((): CommunityUser | null => {
    if (!user) return null;
    const base = currentUserData;
    const resolvedArtist = currentSong ? resolveArtist(currentSong) : null;
    const nowPlaying: CommunityUser['now_playing'] = currentSong
      ? {
          song_id: typeof currentSong.id === 'number' ? currentSong.id : Number(currentSong.id) || 0,
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
      ...(user.avatar_source ? { avatar_source: user.avatar_source } : {}),
      role: user.role ?? 'user',
      ...(user.created_at ? { created_at: user.created_at } : {}),
      ...base,
      online: true,
      presence: 'online',
      now_playing: nowPlaying,
    };
  }, [user, currentUserData, currentSong]);

  const youAvatarUri = effectiveUserData?.avatar_source === 'discord' && effectiveUserData.discord?.avatar_url
    ? effectiveUserData.discord.avatar_url
    : effectiveUserData?.avatar_url ?? effectiveUserData?.discord?.avatar_url;

  const otherUsers = useMemo(() => {
    if (!user) return users;
    return users.filter(u => u.username.toLowerCase() !== user.username.toLowerCase());
  }, [users, user]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Comunidad</Text>
          <Text style={styles.subtitle}>{totalUsers} usuarios · {onlineUsers} en línea</Text>
        </View>
        <PressableFluid onPress={handleRefresh} haptic="light" style={styles.refreshBtn} scaleTo={0.95}>
          <Ionicons name="refresh" size={22} color={colors.secondary} />
        </PressableFluid>
      </View>

      {effectiveUserData && (
        <PressableFluid
          onPress={() => handleUserPress(effectiveUserData)}
          haptic="light"
          style={styles.youCard}
          scaleTo={0.98}
        >
          <View style={styles.youCardContent}>
            <View style={styles.youAvatar}>
              {youAvatarUri ? (
                <Image source={{ uri: youAvatarUri }} style={styles.youAvatarImage} />
              ) : (
                <View style={[styles.youAvatarInner, { backgroundColor: gradients.play[0] }]}>
                  <Text style={styles.youAvatarText}>{effectiveUserData.username.slice(0, 1).toUpperCase()}</Text>
                </View>
              )}
              <View
                style={[
                  styles.onlineDot,
                  { backgroundColor: '#00E676' },
                ]}
              />
            </View>
            <View style={styles.youInfo}>
              <View style={styles.youHeader}>
                <Text style={styles.youName}>{effectiveUserData.display_name ?? effectiveUserData.username}</Text>
                <Text style={styles.youBadge}>TÚ</Text>
              </View>
              {currentSong || effectiveUserData.now_playing ? (
                <View style={styles.youNowPlaying}>
                  <View style={styles.youNowPlayingIcon}>
                    <EqualizerBars playing={isPlaying} bars={3} height={12} barWidth={2.5} color={colors.secondary} />
                  </View>
                  <View style={styles.youNowPlayingTexts}>
                    <Text style={styles.nowPlayingLabel}>ESCUCHANDO AHORA</Text>
                    <Text style={styles.nowPlayingSong} numberOfLines={1}>
                      {currentSong ? currentSong.name : effectiveUserData.now_playing?.song_name}
                    </Text>
                    {(currentSong ? resolveArtist(currentSong) : effectiveUserData.now_playing?.artist) && (
                      <Text style={styles.nowPlayingArtist} numberOfLines={1}>
                        {currentSong ? resolveArtist(currentSong) : effectiveUserData.now_playing?.artist}
                      </Text>
                    )}
                  </View>
                </View>
              ) : (
                <Text style={styles.youStatus}>
                  En línea · Listo para escuchar
                </Text>
              )}
            </View>
            {currentSong && (
              <PressableFluid onPress={openFullscreen} haptic="light" style={styles.youExpandBtn}>
                <Ionicons name="expand" size={20} color={colors.primary} />
              </PressableFluid>
            )}
          </View>
        </PressableFluid>
      )}

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

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Comunidad en línea</Text>
        {onlineUsers > 0 && <Text style={styles.sectionCount}>{onlineUsers}</Text>}
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : otherUsers.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="Nadie más por aquí"
          subtitle="Invita a tus amigos a JodiFy para escuchar juntos en tiempo real"
        />
      ) : (
        <FlatList
          data={otherUsers}
          keyExtractor={(item) => item.username}
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
            <View style={styles.listItem}>
              <UserCard user={item} onPress={() => handleUserPress(item)} />
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="Sin otros usuarios"
              subtitle="Sé el primero en invitar a tus amigos"
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <UserProfileModal
        user={selectedUser}
        isCurrentUser={selectedUser?.username === user?.username}
        visible={showProfile && !!selectedUser}
        onClose={() => {
          setShowProfile(false);
          setSelectedUser(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    color: colors.white,
    fontFamily: typography.displayMedium.fontFamily,
    fontSize: typography.displayMedium.fontSize,
    letterSpacing: typography.displayMedium.letterSpacing,
    lineHeight: typography.displayMedium.lineHeight,
    textShadowColor: colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 22,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    letterSpacing: typography.bodySmall.letterSpacing,
    lineHeight: typography.bodySmall.lineHeight,
    marginTop: 2,
  },
  refreshBtn: {
    padding: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryStrong,
  },
  youCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
    ...elevation.level2,
  },
  youCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 16,
  },
  youAvatar: {
    position: 'relative',
  },
  youAvatarInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  youAvatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  youAvatarText: {
    color: colors.white,
    fontFamily: typography.displayMedium.fontFamily,
    fontSize: typography.displayMedium.fontSize,
    letterSpacing: typography.displayMedium.letterSpacing,
  },
  youInfo: {
    flex: 1,
    minWidth: 0,
  },
  youHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  youName: {
    color: colors.white,
    fontFamily: typography.headlineMedium.fontFamily,
    fontSize: typography.headlineMedium.fontSize,
    letterSpacing: typography.headlineMedium.letterSpacing,
  },
  youBadge: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    letterSpacing: typography.labelSmall.letterSpacing,
    color: colors.secondary,
    backgroundColor: colors.secondarySoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  youNowPlaying: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  youNowPlayingIcon: {
    padding: 2,
  },
  youNowPlayingTexts: {
    minWidth: 0,
  },
  nowPlayingLabel: {
    color: colors.secondary,
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    letterSpacing: typography.labelSmall.letterSpacing,
    marginBottom: 2,
  },
  nowPlayingSong: {
    color: colors.white,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    letterSpacing: typography.bodyMedium.letterSpacing,
  },
  nowPlayingArtist: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    letterSpacing: typography.bodySmall.letterSpacing,
    marginTop: 1,
  },
  youStatus: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    letterSpacing: typography.bodySmall.letterSpacing,
    marginTop: 4,
  },
  youExpandBtn: {
    padding: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryStrong,
  },
  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statNumber: {
    color: colors.white,
    fontFamily: typography.displayMedium.fontFamily,
    fontSize: typography.displayMedium.fontSize,
    letterSpacing: typography.displayMedium.letterSpacing,
  },
  statLabel: {
    color: colors.textMuted,
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    letterSpacing: typography.labelSmall.letterSpacing,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '60%',
    backgroundColor: colors.border,
    alignSelf: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 10,
    marginTop: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: typography.headlineMedium.fontFamily,
    fontSize: typography.headlineMedium.fontSize,
    letterSpacing: typography.headlineMedium.letterSpacing,
  },
  sectionCount: {
    color: colors.secondary,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: typography.labelLarge.fontSize,
    letterSpacing: typography.labelLarge.letterSpacing,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 220,
    gap: 8,
  },
  listItem: {
    marginHorizontal: -16,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  userCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
    ...elevation.level1,
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarText: {
    color: colors.white,
    fontFamily: typography.displaySmall.fontFamily,
    fontSize: typography.displaySmall.fontSize,
    letterSpacing: typography.displaySmall.letterSpacing,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.background,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  username: {
    color: colors.white,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    letterSpacing: typography.bodyMedium.letterSpacing,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleAdmin: {
    backgroundColor: 'rgba(255,61,92,0.15)',
    borderColor: 'rgba(255,61,92,0.5)',
  },
  roleMod: {
    backgroundColor: 'rgba(255,179,0,0.15)',
    borderColor: 'rgba(255,179,0,0.5)',
  },
  roleDev: {
    backgroundColor: 'rgba(127,0,255,0.15)',
    borderColor: 'rgba(127,0,255,0.5)',
  },
  roleText: {
    color: colors.textMuted,
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    letterSpacing: typography.labelSmall.letterSpacing,
  },
  nowPlaying: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  nowPlayingIcon: {
    padding: 2,
  },
  nowPlayingTexts: {
    minWidth: 0,
  },
  lastSeen: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    letterSpacing: typography.bodySmall.letterSpacing,
    marginTop: 4,
  },
  // Modal
  closeBtn: {
    padding: 4,
  },
  modalContent: {
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 22,
  },
  profileHeader: {
    alignItems: 'center',
    gap: 14,
  },
  profileAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  profileAvatarText: {
    color: colors.white,
    fontFamily: typography.displayLarge.fontFamily,
    fontSize: typography.displayLarge.fontSize,
    letterSpacing: typography.displayLarge.letterSpacing,
  },
  profileUsername: {
    color: colors.white,
    fontFamily: typography.displaySmall.fontFamily,
    fontSize: typography.displaySmall.fontSize,
    letterSpacing: typography.displaySmall.letterSpacing,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,230,118,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.3)',
  },
  onlineDotSmall: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.success,
  },
  onlineText: {
    color: colors.success,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    letterSpacing: typography.labelMedium.letterSpacing,
  },
  nowPlayingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryStrong,
  },
  nowPlayingCardIcon: {
    padding: 4,
  },
  nowPlayingCardTexts: {
    flex: 1,
  },
  nowPlayingCardLabel: {
    color: colors.secondary,
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    letterSpacing: typography.labelSmall.letterSpacing,
    marginBottom: 3,
  },
  nowPlayingCardSong: {
    color: colors.white,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    letterSpacing: typography.bodyMedium.letterSpacing,
  },
  nowPlayingCardArtist: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    letterSpacing: typography.bodySmall.letterSpacing,
    marginTop: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    color: colors.white,
    fontFamily: typography.displaySmall.fontFamily,
    fontSize: typography.displaySmall.fontSize,
    letterSpacing: typography.displaySmall.letterSpacing,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnText: {
    color: colors.text,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    letterSpacing: typography.labelMedium.letterSpacing,
  },
});