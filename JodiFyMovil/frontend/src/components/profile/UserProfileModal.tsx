import { useCallback, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { EqualizerBars } from '@components/ui/EqualizerBars';
import { PressableFluid } from '@components/ui/PressableFluid';
import type { UserAccess, Song } from '@lib/types';
import type { CommunityUser } from '@services/users.service';
import { useLibraryStore } from '@stores/library.store';
import { usePlayerStore } from '@stores/player.store';
import { useEqStore } from '@stores/eq.store';
import { useUiStore } from '@stores/ui.store';
import { useJamStore } from '@stores/jam.store';
import { colors, typography, radius } from '@theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface UserProfileModalProps {
  visible: boolean;
  onClose: () => void;
  user: UserAccess | CommunityUser | null;
  isCurrentUser?: boolean;
  onLogout?: () => void;
  onOpenAccountDetails?: () => void;
}

function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return 'hace un momento';
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diff < 60) return 'ahora mismo';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} días`;
}

export function UserProfileModal({
  visible,
  onClose,
  user,
  isCurrentUser = false,
  onLogout,
  onOpenAccountDetails,
}: UserProfileModalProps) {
  const songs = useLibraryStore((s) => s.songs);
  const likedIds = useLibraryStore((s) => s.likedIds);
  const downloadedIds = useLibraryStore((s) => s.downloadedIds);
  const eqPreset = useEqStore((s) => s.preset);
  const playSong = usePlayerStore((s) => s.playSong);
  const openFullscreen = useUiStore((s) => s.openFullscreen);

  const communityUser = user as CommunityUser | null;
  const nowPlaying = communityUser?.now_playing;

  const role = (user?.role || 'user').toLowerCase();

  const userObj = user as any;
  const avatarUri = userObj?.avatar_source === 'discord' && userObj?.discord?.avatar_url
    ? userObj.discord.avatar_url
    : userObj?.avatar_url ?? userObj?.discord?.avatar_url;

  const roleTheme = useMemo(() => {
    switch (role) {
      case 'admin':
        return {
          label: 'ADMINISTRADOR',
          badgeBg: 'rgba(255, 61, 92, 0.18)',
          badgeBorder: 'rgba(255, 61, 92, 0.55)',
          badgeColor: '#FF3D5C',
          glowColors: ['#FF3D5C', '#7F00FF'] as [string, string],
          icon: 'shield' as keyof typeof Ionicons.glyphMap,
        };
      case 'mod':
        return {
          label: 'MODERADOR',
          badgeBg: 'rgba(255, 179, 0, 0.18)',
          badgeBorder: 'rgba(255, 179, 0, 0.55)',
          badgeColor: '#FFB300',
          glowColors: ['#FFB300', '#FF3D5C'] as [string, string],
          icon: 'star' as keyof typeof Ionicons.glyphMap,
        };
      case 'dev':
        return {
          label: 'DESARROLLADOR',
          badgeBg: 'rgba(127, 0, 255, 0.18)',
          badgeBorder: 'rgba(127, 0, 255, 0.55)',
          badgeColor: '#7F00FF',
          glowColors: ['#7F00FF', '#00E5FF'] as [string, string],
          icon: 'code-slash' as keyof typeof Ionicons.glyphMap,
        };
      default:
        return {
          label: 'COMUNIDAD VIP',
          badgeBg: 'rgba(0, 229, 255, 0.14)',
          badgeBorder: 'rgba(0, 229, 255, 0.45)',
          badgeColor: '#00E5FF',
          glowColors: ['#00E5FF', '#7F00FF'] as [string, string],
          icon: 'musical-notes' as keyof typeof Ionicons.glyphMap,
        };
    }
  }, [role]);

  const handlePlayTheirSong = useCallback(() => {
    if (!nowPlaying) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Look for song in our library
    const found = songs.find(
      (s) =>
        String(s.id) === String(nowPlaying.song_id) ||
        s.name.toLowerCase().trim() === nowPlaying.song_name.toLowerCase().trim()
    );

    let songToPlay: Song;
    if (found) {
      songToPlay = found;
    } else {
      songToPlay = {
        id: nowPlaying.song_id ?? 'temp_' + Date.now(),
        name: nowPlaying.song_name,
        artist: nowPlaying.artist ?? 'Desconocido',
        ...(nowPlaying.song_id ? { url: `/api/songs/${nowPlaying.song_id}/audio` } : {}),
      };
    }

    playSong(songToPlay, songs.length > 0 ? songs : [songToPlay]);
    onClose();
    setTimeout(() => {
      openFullscreen();
    }, 150);
  }, [nowPlaying, songs, playSong, onClose, openFullscreen]);

  const handleStartJam = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    useJamStore.getState().maybeRecommendInstead();
    onClose();
    useUiStore.getState().setTab('community');
  }, [onClose]);

  if (!visible || !user) return null;

  const isOnline = 'online' in user ? user.online : true;
  const username = user.username;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheetCard}>
          {/* Ambient Glowing Header Banner */}
          <LinearGradient
            colors={[roleTheme.glowColors[0] + '33', roleTheme.glowColors[1] + '11', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bannerGradient}
          />

          {/* Close button */}
          <PressableFluid
            onPress={onClose}
            haptic="light"
            style={styles.closeBtn}
            hitSlop={10}
          >
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </PressableFluid>

          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarGlowContainer}>
              <LinearGradient
                colors={roleTheme.glowColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarOuter}
              >
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarInner}>
                    <Text style={styles.avatarText}>{username.slice(0, 1).toUpperCase()}</Text>
                  </View>
                )}
              </LinearGradient>

              {isOnline && (
                <View style={styles.onlinePill}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.onlinePillText}>EN LÍNEA</Text>
                </View>
              )}
            </View>

            <Text style={styles.profileName}>{username}</Text>

            <View style={[styles.roleBadge, { backgroundColor: roleTheme.badgeBg, borderColor: roleTheme.badgeBorder }]}>
              <Ionicons name={roleTheme.icon} size={13} color={roleTheme.badgeColor} />
              <Text style={[styles.roleText, { color: roleTheme.badgeColor }]}>{roleTheme.label}</Text>
            </View>

            <Text style={styles.statusSubtitle}>
              {isCurrentUser
                ? 'Tu perfil en JodiFy'
                : isOnline
                ? 'Conectado a la red de música'
                : `Última conexión ${formatRelativeTime(communityUser?.last_seen)}`}
            </Text>
          </View>

          {/* Currently Playing Card for other users */}
          {!isCurrentUser && nowPlaying && (
            <View style={styles.nowPlayingBox}>
              <View style={styles.nowPlayingTop}>
                <View style={styles.equalizerWrap}>
                  <EqualizerBars playing bars={3} height={14} barWidth={3} color={colors.secondary} />
                </View>
                <View style={styles.nowPlayingInfo}>
                  <Text style={styles.nowPlayingTag}>ESCUCHANDO AHORA</Text>
                  <Text style={styles.nowPlayingSongName} numberOfLines={1}>
                    {nowPlaying.song_name}
                  </Text>
                  <Text style={styles.nowPlayingArtistName} numberOfLines={1}>
                    {nowPlaying.artist || 'Artista'}
                  </Text>
                </View>
              </View>

              <PressableFluid
                onPress={handlePlayTheirSong}
                haptic="medium"
                style={styles.listenAlongBtn}
              >
                <LinearGradient
                  colors={['#7F00FF', '#00E5FF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.listenAlongFill}
                >
                  <Ionicons name="play" size={16} color={colors.white} />
                  <Text style={styles.listenAlongText}>Escuchar esta canción</Text>
                </LinearGradient>
              </PressableFluid>
            </View>
          )}

          {/* Stats Bar */}
          <View style={styles.statsContainer}>
            {isCurrentUser ? (
              <>
                <View style={styles.statBox}>
                  <View style={styles.statIconWrap}>
                    <Ionicons name="heart" size={18} color={colors.accent} />
                  </View>
                  <Text style={styles.statValue}>{likedIds.length}</Text>
                  <Text style={styles.statTitle}>Favoritas</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statBox}>
                  <View style={styles.statIconWrap}>
                    <Ionicons name="cloud-done" size={18} color={colors.secondary} />
                  </View>
                  <Text style={styles.statValue}>{downloadedIds.length}</Text>
                  <Text style={styles.statTitle}>Descargas</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statBox}>
                  <View style={styles.statIconWrap}>
                    <Ionicons name="options" size={18} color={colors.primary} />
                  </View>
                  <Text style={styles.statValue}>{eqPreset.toUpperCase()}</Text>
                  <Text style={styles.statTitle}>Ecualizador</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.statBox}>
                  <View style={styles.statIconWrap}>
                    <Ionicons name="radio" size={18} color={colors.secondary} />
                  </View>
                  <Text style={styles.statValue}>{isOnline ? 'Activo' : 'Offline'}</Text>
                  <Text style={styles.statTitle}>Estado</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statBox}>
                  <View style={styles.statIconWrap}>
                    <Ionicons name="people" size={18} color={colors.accent} />
                  </View>
                  <Text style={styles.statValue}>Comunidad</Text>
                  <Text style={styles.statTitle}>JodiFy Live</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statBox}>
                  <View style={styles.statIconWrap}>
                    <Ionicons name="musical-note" size={18} color={colors.primary} />
                  </View>
                  <Text style={styles.statValue}>{nowPlaying ? 'En vivo' : 'En pausa'}</Text>
                  <Text style={styles.statTitle}>Música</Text>
                </View>
              </>
            )}
          </View>

          {/* Action Row */}
          <View style={styles.bottomActions}>
            {isCurrentUser ? (
              <View style={styles.currentUserActions}>
                {onOpenAccountDetails && (
                  <PressableFluid
                    onPress={() => {
                      onClose();
                      onOpenAccountDetails();
                    }}
                    haptic="medium"
                    style={styles.editProfileBtn}
                  >
                    <Ionicons name="create-outline" size={18} color={colors.white} />
                    <Text style={styles.editProfileBtnText}>Personalizar Perfil y Avatar</Text>
                  </PressableFluid>
                )}

                {onLogout && (
                  <PressableFluid
                    onPress={() => {
                      onClose();
                      onLogout();
                    }}
                    haptic="medium"
                    style={styles.logoutBtn}
                  >
                    <Ionicons name="log-out-outline" size={18} color={colors.error} />
                    <Text style={styles.logoutBtnText}>Cerrar sesión de {username}</Text>
                  </PressableFluid>
                )}
              </View>
            ) : (
              <View style={styles.communityActionRow}>
                <PressableFluid
                  onPress={handleStartJam}
                  haptic="light"
                  style={styles.jamBtn}
                >
                  <Ionicons name="sparkles" size={16} color={colors.secondary} />
                  <Text style={styles.jamBtnText}>Invitar a Jam</Text>
                </PressableFluid>

                <PressableFluid
                  onPress={onClose}
                  haptic="light"
                  style={styles.dismissPill}
                >
                  <Text style={styles.dismissPillText}>Cerrar</Text>
                </PressableFluid>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 3, 7, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  sheetCard: {
    width: Math.min(SCREEN_WIDTH - 36, 420),
    backgroundColor: 'rgba(16, 16, 26, 0.98)',
    borderRadius: 28,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.65,
    shadowRadius: 32,
    elevation: 20,
  },
  bannerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  closeBtn: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: 8,
  },
  avatarGlowContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    padding: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 10,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 40,
    backgroundColor: '#0a0a14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 39,
  },
  avatarText: {
    color: colors.white,
    fontFamily: typography.displayMedium.fontFamily,
    fontSize: 34,
  },
  onlinePill: {
    position: 'absolute',
    bottom: -6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#051b11',
    borderWidth: 1,
    borderColor: '#00e676',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00e676',
  },
  onlinePillText: {
    color: '#00e676',
    fontSize: 9,
    fontFamily: typography.labelSmall.fontFamily,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  profileName: {
    color: colors.white,
    fontFamily: typography.displayMedium.fontFamily,
    fontSize: 22,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginBottom: 6,
  },
  roleText: {
    fontSize: 11,
    fontFamily: typography.labelLarge.fontFamily,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  statusSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 12,
  },
  nowPlayingBox: {
    marginTop: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(127, 0, 255, 0.28)',
    padding: 14,
    gap: 12,
  },
  nowPlayingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  equalizerWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowPlayingInfo: {
    flex: 1,
    minWidth: 0,
  },
  nowPlayingTag: {
    color: colors.secondary,
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  nowPlayingSongName: {
    color: colors.white,
    fontFamily: typography.headlineMedium.fontFamily,
    fontSize: 14,
    marginTop: 1,
  },
  nowPlayingArtistName: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 12,
  },
  listenAlongBtn: {
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  listenAlongFill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  listenAlongText: {
    color: colors.white,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 13,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statIconWrap: {
    marginBottom: 2,
  },
  statValue: {
    color: colors.white,
    fontFamily: typography.headlineMedium.fontFamily,
    fontSize: 14,
    fontWeight: '700',
  },
  statTitle: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 11,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  bottomActions: {
    marginTop: 20,
  },
  currentUserActions: {
    width: '100%',
    gap: 10,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(127, 0, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(127, 0, 255, 0.6)',
  },
  editProfileBtnText: {
    color: colors.white,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 13,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 61, 92, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 61, 92, 0.35)',
  },
  logoutBtnText: {
    color: colors.error,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 13,
    fontWeight: '600',
  },
  communityActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  jamBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(127, 0, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(127, 0, 255, 0.45)',
  },
  jamBtnText: {
    color: colors.white,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 13,
    fontWeight: '600',
  },
  dismissPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  dismissPillText: {
    color: colors.textSecondary,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 13,
  },
});
