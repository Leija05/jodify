import { useCallback, useMemo, useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  ScrollView,
  Animated,
  Image,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { EqualizerBars } from '@components/ui/EqualizerBars';
import { PressableFluid } from '@components/ui/PressableFluid';
import { UserAvatar } from '@components/ui/UserAvatar';
import { EditProfileModal } from './EditProfileModal';
import { ProfileInspectionAnimation } from './ProfileInspectionAnimation';
import type { UserAccess, Song } from '@lib/types';
import type { CommunityUser } from '@services/users.service';
import { fetchUserStats, fetchUserTopSongs } from '@services/users.service';
import { getThemeDefinition } from '@lib/avatar';
import { calculateMelomanoLevel, pickCoverUrl } from '@lib/utils';
import { PetCompanionCard } from '../social/PetCompanionCard';
import { PixelPet } from '../social/PixelPet';
import { useLibraryStore } from '@stores/library.store';
import { usePlayerStore } from '@stores/player.store';
import { useEqStore } from '@stores/eq.store';
import { useUiStore } from '@stores/ui.store';
import { useJamStore } from '@stores/jam.store';
import { useSettingsStore } from '@stores/settings.store';
import { colors } from '@theme';

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
  user: userProp,
  isCurrentUser = false,
  onLogout,
  onOpenAccountDetails,
}: UserProfileModalProps) {
  const authUser = useSettingsStore((s) => s.user);
  const user = useMemo(() => {
    if (isCurrentUser && authUser) {
      return {
        ...userProp,
        ...authUser,
      };
    }
    return userProp;
  }, [isCurrentUser, authUser, userProp]);

  const songs = useLibraryStore((s) => s.songs);
  const likedIds = useLibraryStore((s) => s.likedIds);
  const downloadedIds = useLibraryStore((s) => s.downloadedIds);
  const eqPreset = useEqStore((s) => s.preset);
  const playSong = usePlayerStore((s) => s.playSong);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlayerPlaying = usePlayerStore((s) => s.isPlaying);
  const pauseSong = usePlayerStore((s) => s.pause);
  const resumeSong = usePlayerStore((s) => s.play);
  const openFullscreen = useUiStore((s) => s.openFullscreen);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalTab, setEditModalTab] = useState<'identity' | 'anthem' | 'avatar' | 'pet' | 'frame' | 'theme' | 'animation'>('identity');
  const [stats, setStats] = useState<{ liked: number; played: number; downloaded: number; listening_seconds?: number } | null>(null);
  const [topSongs, setTopSongs] = useState<Array<{ song_name: string; count: number }>>([]);

  // Animation values for smooth, premium entry
  const animValue = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (visible) {
      Animated.spring(animValue, {
        toValue: 1,
        damping: 18,
        stiffness: 140,
        mass: 0.9,
        useNativeDriver: true,
      }).start();
    } else {
      animValue.setValue(0);
    }
  }, [visible, animValue]);

  // Fetch stats and top songs when modal opens
  useEffect(() => {
    if (!visible || !user?.username) return;

    let alive = true;
    void fetchUserStats(user.username)
      .then((res) => {
        if (alive) setStats(res);
      })
      .catch(() => undefined);

    void fetchUserTopSongs(user.username, 3)
      .then((res) => {
        if (alive) setTopSongs(res);
      })
      .catch(() => undefined);

    return () => {
      alive = false;
    };
  }, [visible, user?.username]);

  const communityUser = user as CommunityUser | null;
  const nowPlaying = communityUser?.now_playing;
  const role = (user?.role || 'user').toLowerCase();

  const themeDef = useMemo(() => getThemeDefinition(user?.theme), [user?.theme]);

  const melomano = useMemo(() => {
    return calculateMelomanoLevel({
      liked: isCurrentUser ? likedIds.length : stats?.liked ?? 0,
      played: stats?.played ?? (isCurrentUser ? downloadedIds.length : 0),
      downloaded: isCurrentUser ? downloadedIds.length : stats?.downloaded ?? 0,
      listening_seconds: user?.listening_seconds ?? stats?.listening_seconds ?? 0,
    });
  }, [user?.listening_seconds, likedIds.length, downloadedIds.length, stats, isCurrentUser]);

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
          glowColors: [themeDef.primaryColor, themeDef.secondaryColor] as [string, string],
          icon: 'musical-notes' as keyof typeof Ionicons.glyphMap,
        };
    }
  }, [role, themeDef]);

  const handlePlayTheirSong = useCallback(() => {
    if (!nowPlaying) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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

  const anthemSong = useMemo(() => {
    if (!user?.anthem_song_name && !user?.anthem_song_id) return null;
    return (
      songs.find(
        (s) =>
          (user.anthem_song_id && String(s.id) === String(user.anthem_song_id)) ||
          (user.anthem_song_name && s.name.toLowerCase().trim() === user.anthem_song_name.toLowerCase().trim())
      ) || null
    );
  }, [songs, user?.anthem_song_id, user?.anthem_song_name]);

  const anthemCoverUrl = useMemo(() => {
    if (!anthemSong) return null;
    const picked = pickCoverUrl(anthemSong);
    if (picked) return picked;
    if (anthemSong.youtube_id) {
      return `https://i.ytimg.com/vi/${anthemSong.youtube_id}/hqdefault.jpg`;
    }
    return null;
  }, [anthemSong]);

  const isAnthemPlaying = useMemo(() => {
    if (!isPlayerPlaying || !currentSong || !user?.anthem_song_name) return false;
    if (user.anthem_song_id && String(currentSong.id) === String(user.anthem_song_id)) return true;
    return currentSong.name.toLowerCase().trim() === user.anthem_song_name.toLowerCase().trim();
  }, [isPlayerPlaying, currentSong, user?.anthem_song_id, user?.anthem_song_name]);

  const vinylSpinAnim = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (isAnthemPlaying) {
      const loop = Animated.loop(
        Animated.timing(vinylSpinAnim, {
          toValue: 1,
          duration: 3200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      loop.start();
      return () => {
        loop.stop();
      };
    }
    vinylSpinAnim.setValue(0);
    return undefined;
  }, [isAnthemPlaying, vinylSpinAnim]);

  const vinylSpin = vinylSpinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handlePlayAnthem = useCallback(() => {
    if (!user?.anthem_song_name) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const found = songs.find(
      (s) =>
        (user.anthem_song_id && String(s.id) === String(user.anthem_song_id)) ||
        s.name.toLowerCase().trim() === user.anthem_song_name!.toLowerCase().trim()
    );

    let songToPlay: Song;
    if (found) {
      songToPlay = found;
    } else {
      songToPlay = {
        id: user.anthem_song_id ?? 'anthem_' + Date.now(),
        name: user.anthem_song_name,
        artist: 'Anthem de ' + (user.display_name || user.username),
        ...(user.anthem_song_id ? { url: `/api/songs/${user.anthem_song_id}/audio` } : {}),
      };
    }

    playSong(songToPlay, songs.length > 0 ? songs : [songToPlay]);
  }, [user, songs, playSong]);

  const handleToggleAnthemPlay = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isAnthemPlaying) {
      pauseSong();
      return;
    }
    if (
      currentSong &&
      ((user?.anthem_song_id && String(currentSong.id) === String(user.anthem_song_id)) ||
        (user?.anthem_song_name && currentSong.name.toLowerCase().trim() === user.anthem_song_name.toLowerCase().trim()))
    ) {
      resumeSong();
      return;
    }
    handlePlayAnthem();
  }, [isAnthemPlaying, currentSong, user, pauseSong, resumeSong, handlePlayAnthem]);

  const handleStartJam = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    useJamStore.getState().maybeRecommendInstead();
    onClose();
    useUiStore.getState().setTab('community');
  }, [onClose]);

  const effectiveAnimation = useMemo(() => {
    if (user?.profile_animation && user.profile_animation !== 'none') {
      return user.profile_animation;
    }
    return 'astral-pulse';
  }, [user?.profile_animation]);

  if (!visible || !user) return null;

  const isOnline = 'online' in user ? user.online : true;
  const username = user.username;
  const displayName = user.display_name || username;

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

          <Animated.View
            style={[
              styles.sheetCard,
              {
                opacity: animValue,
                transform: [
                  {
                    scale: animValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.88, 1],
                    }),
                  },
                  {
                    translateY: animValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Ambient Glowing Header Banner */}
            <LinearGradient
              colors={[
                user.custom_gradient_start || themeDef.gradient[0] + '40',
                user.custom_gradient_end || themeDef.gradient[1] + '20',
                'transparent',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bannerGradient}
            />

            {/* Inspection Animation Layer (Visual effect when inspecting profile) */}
            <ProfileInspectionAnimation animationId={effectiveAnimation} showBadge={true} />

            {/* Close button */}
            <PressableFluid
              onPress={onClose}
              haptic="light"
              style={styles.closeBtn}
              hitSlop={10}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </PressableFluid>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Avatar Section */}
              <View style={styles.avatarSection}>
                <View style={styles.avatarGlowContainer}>
                  <UserAvatar
                    user={user}
                    size={84}
                    showPresence
                    presence={isOnline ? 'online' : 'offline'}
                  />
                  {user.pet_type && user.pet_type !== 'none' && (
                    <View style={styles.avatarPetFloat}>
                      <PixelPet
                        petType={user.pet_type}
                        variant={user.pet_variant}
                        petName={user.pet_name}
                        size={40}
                        interactive={true}
                      />
                    </View>
                  )}
                </View>

                <View style={styles.nameRow}>
                  <Text style={styles.profileName} numberOfLines={1}>
                    {displayName}
                  </Text>
                  {user.custom_badge ? (
                    <View style={styles.badgePill}>
                      <Text style={styles.badgePillText}>{user.custom_badge}</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.usernameTag}>@{username}</Text>

                <View
                  style={[
                    styles.roleBadge,
                    { backgroundColor: roleTheme.badgeBg, borderColor: roleTheme.badgeBorder },
                  ]}
                >
                  <Ionicons name={roleTheme.icon} size={13} color={roleTheme.badgeColor} />
                  <Text style={[styles.roleText, { color: roleTheme.badgeColor }]}>
                    {roleTheme.label}
                  </Text>
                </View>

                {user.vibe ? (
                  <View style={styles.vibeBox}>
                    <Text style={styles.vibeText}>{user.vibe}</Text>
                  </View>
                ) : null}

                {user.bio ? (
                  <View style={styles.bioContainer}>
                    <Text style={styles.bioText}>"{user.bio}"</Text>
                  </View>
                ) : null}

                <Text style={styles.statusSubtitle}>
                  {isCurrentUser
                    ? 'Tu perfil en JodiFy'
                    : isOnline
                    ? 'Conectado a la red de música'
                    : `Última conexión ${formatRelativeTime(communityUser?.last_seen)}`}
                </Text>
              </View>

              {/* Pet Companion Card */}
              <PetCompanionCard
                petType={user.pet_type}
                petVariant={user.pet_variant}
                petName={user.pet_name}
                isCurrentUser={isCurrentUser}
                onCustomize={() => {
                  setEditModalOpen(true);
                }}
              />

              {/* Anthem Song Showcase */}
              {user.anthem_song_name ? (
                <View style={styles.anthemCardWrapper}>
                  <PressableFluid
                    onPress={handleToggleAnthemPlay}
                    haptic="medium"
                    style={styles.anthemCard}
                    scaleTo={0.98}
                  >
                    <LinearGradient
                      colors={['rgba(127, 0, 255, 0.25)', 'rgba(0, 229, 255, 0.15)', 'rgba(15, 15, 26, 0.75)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.anthemGradient}
                    />

                    {/* Header bar inside Anthem Card */}
                    <View style={styles.anthemHeaderRow}>
                      <View style={styles.anthemBadgeRow}>
                        <Ionicons name="sparkles" size={13} color="#FFD700" />
                        <Text style={styles.anthemTag}>
                          {isCurrentUser ? 'HIMNO PERSONAL' : `HIMNO DE ${displayName.toUpperCase()}`}
                        </Text>
                      </View>

                      {isAnthemPlaying ? (
                        <View style={styles.anthemPlayingIndicator}>
                          <EqualizerBars playing bars={3} height={12} barWidth={2.5} color="#00E5FF" />
                          <Text style={styles.anthemPlayingText}>Sonando</Text>
                        </View>
                      ) : (
                        isCurrentUser && (
                          <PressableFluid
                            onPress={() => {
                              setEditModalTab('anthem');
                              setEditModalOpen(true);
                            }}
                            haptic="light"
                            style={styles.anthemChangeBtn}
                            hitSlop={8}
                          >
                            <Ionicons name="swap-horizontal" size={12} color={colors.secondary} />
                            <Text style={styles.anthemChangeText}>Cambiar</Text>
                          </PressableFluid>
                        )
                      )}
                    </View>

                    {/* Body with Cover + Vinyl + Info */}
                    <View style={styles.anthemBodyRow}>
                      {/* Cover with Vinyl Peeking */}
                      <View style={styles.anthemCoverContainer}>
                        {/* Peeking Vinyl Disk */}
                        <Animated.View
                          style={[
                            styles.anthemVinylDisk,
                            {
                              transform: [{ rotate: vinylSpin }],
                            },
                          ]}
                        >
                          <Ionicons name="disc" size={42} color="#0a0a14" />
                          <View style={styles.anthemVinylCenter} />
                        </Animated.View>

                        {/* Song Cover / Thumbnail */}
                        <View style={styles.anthemCoverWrap}>
                          {anthemCoverUrl ? (
                            <Image source={{ uri: anthemCoverUrl }} style={styles.anthemCoverImg} />
                          ) : (
                            <LinearGradient
                              colors={['#7F00FF', '#00E5FF']}
                              style={styles.anthemCoverPlaceholder}
                            >
                              <Ionicons name="musical-note" size={20} color={colors.white} />
                            </LinearGradient>
                          )}

                          {/* Play/Pause Overlay Icon */}
                          <View style={styles.anthemPlayOverlay}>
                            <Ionicons
                              name={isAnthemPlaying ? 'pause' : 'play'}
                              size={14}
                              color={colors.white}
                            />
                          </View>
                        </View>
                      </View>

                      {/* Song Info */}
                      <View style={styles.anthemMetaWrap}>
                        <Text style={styles.anthemSongTitle} numberOfLines={1}>
                          {user.anthem_song_name}
                        </Text>
                        <Text style={styles.anthemArtistName} numberOfLines={1}>
                          {anthemSong?.artist || 'Rolón Insignia'}
                        </Text>
                        <View style={styles.anthemVibePill}>
                          <View style={styles.anthemDot} />
                          <Text style={styles.anthemVibePillText}>Rolón Insignia</Text>
                        </View>
                      </View>

                      {/* Action Play Button */}
                      <View style={styles.anthemActionBtnWrap}>
                        <LinearGradient
                          colors={isAnthemPlaying ? ['#00E5FF', '#7F00FF'] : ['#7F00FF', '#00E5FF']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.anthemActionBtn}
                        >
                          <Ionicons
                            name={isAnthemPlaying ? 'pause' : 'play'}
                            size={18}
                            color={colors.white}
                          />
                        </LinearGradient>
                      </View>
                    </View>
                  </PressableFluid>
                </View>
              ) : isCurrentUser ? (
                /* Empty state for Anthem if user hasn't chosen one */
                <PressableFluid
                  onPress={() => {
                    setEditModalTab('anthem');
                    setEditModalOpen(true);
                  }}
                  haptic="medium"
                  style={styles.emptyAnthemCard}
                >
                  <LinearGradient
                    colors={['rgba(255, 215, 0, 0.12)', 'rgba(127, 0, 255, 0.08)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View style={styles.emptyAnthemIcon}>
                    <Ionicons name="musical-notes" size={20} color="#FFD700" />
                  </View>
                  <View style={styles.emptyAnthemInfo}>
                    <Text style={styles.emptyAnthemTitle}>Elige tu Himno Personal</Text>
                    <Text style={styles.emptyAnthemSubtitle}>Muestra tu rolón insignia en tu perfil</Text>
                  </View>
                  <View style={styles.emptyAnthemAddBtn}>
                    <Ionicons name="add" size={16} color={colors.white} />
                  </View>
                </PressableFluid>
              ) : null}

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
                <View style={styles.statBox}>
                  <View style={styles.statIconWrap}>
                    <Ionicons name="heart" size={16} color={colors.accent} />
                  </View>
                  <Text style={styles.statValue}>
                    {isCurrentUser ? likedIds.length : stats?.liked ?? 0}
                  </Text>
                  <Text style={styles.statTitle}>Favoritas</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statBox}>
                  <View style={styles.statIconWrap}>
                    <Ionicons name="musical-notes" size={16} color={colors.secondary} />
                  </View>
                  <Text style={styles.statValue}>{stats?.played ?? (isCurrentUser ? downloadedIds.length : 0)}</Text>
                  <Text style={styles.statTitle}>Reproducidas</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statBox}>
                  <View style={styles.statIconWrap}>
                    <Ionicons name="radio" size={16} color={colors.primary} />
                  </View>
                  <Text style={styles.statValue}>
                    {isCurrentUser ? eqPreset.toUpperCase() : isOnline ? 'En vivo' : 'Offline'}
                  </Text>
                  <Text style={styles.statTitle}>{isCurrentUser ? 'Ecualizador' : 'Estado'}</Text>
                </View>
              </View>

              {/* Melómano Rank & Listening Time Card */}
              <View style={styles.melomanoCard}>
                <LinearGradient
                  colors={['rgba(255, 215, 0, 0.12)', 'rgba(127, 0, 255, 0.08)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.melomanoTop}>
                  <View style={styles.melomanoBadgeWrap}>
                    <Text style={styles.melomanoEmoji}>{melomano.badgeEmoji}</Text>
                    <View style={styles.melomanoTitlesWrap}>
                      <Text style={styles.melomanoRankTitle} numberOfLines={1}>
                        {melomano.title}
                      </Text>
                      <Text style={styles.melomanoLevelText}>NIVEL {melomano.level}</Text>
                    </View>
                  </View>

                  <View style={styles.melomanoHoursBadge}>
                    <Ionicons name="time-outline" size={13} color="#FFD700" />
                    <Text style={styles.melomanoHoursText}>{melomano.listenedHours} h escuchadas</Text>
                  </View>
                </View>

                {/* XP Progress Bar */}
                <View style={styles.xpBarContainer}>
                  <View style={styles.xpBarLabels}>
                    <Text style={styles.xpLabel}>Progreso a Nivel {melomano.level + 1}</Text>
                    <Text style={styles.xpValue}>
                      {melomano.currentXp} / {melomano.nextLevelXp} XP ({melomano.progressPercent}%)
                    </Text>
                  </View>
                  <View style={styles.xpTrack}>
                    <LinearGradient
                      colors={['#FFD700', '#FF8800']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.xpFill, { width: `${melomano.progressPercent}%` }]}
                    />
                  </View>
                </View>
              </View>

              {/* Top Songs List if present */}
              {topSongs.length > 0 && (
                <View style={styles.topSongsSection}>
                  <Text style={styles.topSongsTitle}>Canciones más escuchadas</Text>
                  {topSongs.map((ts, idx) => (
                    <View key={idx} style={styles.topSongRow}>
                      <Text style={styles.topSongIndex}>#{idx + 1}</Text>
                      <Text style={styles.topSongName} numberOfLines={1}>
                        {ts.song_name}
                      </Text>
                      <Text style={styles.topSongCount}>{ts.count}x</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.bottomActions}>
                {isCurrentUser ? (
                  <View style={styles.currentUserActions}>
                    <PressableFluid
                      onPress={() => {
                        if (onOpenAccountDetails) {
                          onClose();
                          onOpenAccountDetails();
                        } else {
                          setEditModalTab('identity');
                          setEditModalOpen(true);
                        }
                      }}
                      haptic="medium"
                      style={styles.editProfileBtn}
                    >
                      <Ionicons name="sparkles" size={16} color={colors.white} />
                      <Text style={styles.editProfileBtnText}>Personalizar Perfil y Decoración</Text>
                    </PressableFluid>

                    {onLogout && (
                      <PressableFluid
                        onPress={() => {
                          onClose();
                          onLogout();
                        }}
                        haptic="medium"
                        style={styles.logoutBtn}
                      >
                        <Ionicons name="log-out-outline" size={16} color={colors.error} />
                        <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
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
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Edit Profile Modal Integration */}
      <EditProfileModal
        visible={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        initialTab={editModalTab}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 3, 7, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  sheetCard: {
    width: Math.min(SCREEN_WIDTH - 24, 440),
    maxHeight: '90%',
    backgroundColor: 'rgba(16, 16, 26, 0.98)',
    borderRadius: 28,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  bannerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 24,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarGlowContainer: {
    marginBottom: 12,
    position: 'relative',
  },
  avatarPetFloat: {
    position: 'absolute',
    bottom: -4,
    right: -12,
    backgroundColor: 'rgba(16, 16, 28, 0.95)',
    borderRadius: 14,
    padding: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.white,
    textAlign: 'center',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondary,
  },
  usernameTag: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  vibeBox: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
  },
  vibeText: {
    fontSize: 12,
    color: colors.secondary,
    fontWeight: '600',
  },
  bioContainer: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  bioText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  statusSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 8,
  },
  anthemCardWrapper: {
    width: '100%',
    marginBottom: 14,
  },
  anthemCard: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(0, 229, 255, 0.35)',
    padding: 14,
    backgroundColor: 'rgba(16, 16, 28, 0.85)',
    shadowColor: '#7F00FF',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  anthemGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  anthemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  anthemBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  anthemTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFD700',
    letterSpacing: 0.8,
  },
  anthemPlayingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  anthemPlayingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00E5FF',
  },
  anthemChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  anthemChangeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.secondary,
  },
  anthemBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  anthemCoverContainer: {
    position: 'relative',
    width: 58,
    height: 52,
    justifyContent: 'center',
  },
  anthemVinylDisk: {
    position: 'absolute',
    left: 12,
    top: 4,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0a0a14',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  anthemVinylCenter: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#7F00FF',
    borderWidth: 2,
    borderColor: '#00E5FF',
  },
  anthemCoverWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#16162a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  anthemCoverImg: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  anthemCoverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anthemPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  anthemMetaWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  anthemSongTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.2,
  },
  anthemArtistName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  anthemVibePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  anthemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00E5FF',
  },
  anthemVibePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.secondary,
  },
  anthemActionBtnWrap: {
    marginLeft: 4,
  },
  anthemActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00E5FF',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  emptyAnthemCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 215, 0, 0.4)',
    backgroundColor: 'rgba(255, 215, 0, 0.03)',
    marginBottom: 14,
  },
  emptyAnthemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  emptyAnthemInfo: {
    flex: 1,
  },
  emptyAnthemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.white,
  },
  emptyAnthemSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  emptyAnthemAddBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowPlayingBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 14,
  },
  nowPlayingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  equalizerWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowPlayingInfo: {
    flex: 1,
  },
  nowPlayingTag: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.secondary,
    letterSpacing: 0.8,
  },
  nowPlayingSongName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
    marginTop: 2,
  },
  nowPlayingArtistName: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  listenAlongBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  listenAlongFill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  listenAlongText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statIconWrap: {
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.white,
  },
  statTitle: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  topSongsSection: {
    marginBottom: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  topSongsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  topSongRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  topSongIndex: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.secondary,
    width: 24,
  },
  topSongName: {
    flex: 1,
    fontSize: 12,
    color: colors.white,
    fontWeight: '600',
  },
  topSongCount: {
    fontSize: 10,
    color: colors.textMuted,
    marginLeft: 8,
  },
  bottomActions: {
    marginTop: 4,
  },
  currentUserActions: {
    gap: 8,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(127, 0, 255, 0.3)',
    borderWidth: 1.2,
    borderColor: 'rgba(127, 0, 255, 0.6)',
    borderRadius: 16,
    paddingVertical: 12,
  },
  editProfileBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 61, 92, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 61, 92, 0.25)',
  },
  logoutBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
  },
  communityActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  jamBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderWidth: 1.2,
    borderColor: 'rgba(0, 229, 255, 0.4)',
    borderRadius: 14,
    paddingVertical: 12,
  },
  jamBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
  },
  dismissPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    paddingVertical: 12,
  },
  dismissPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  melomanoCard: {
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    overflow: 'hidden',
    padding: 14,
    marginVertical: 6,
    position: 'relative',
  },
  melomanoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  melomanoBadgeWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  melomanoTitlesWrap: {
    flex: 1,
  },
  melomanoEmoji: {
    fontSize: 22,
  },
  melomanoRankTitle: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  melomanoLevelText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  melomanoHoursBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    flexShrink: 0,
  },
  melomanoHoursText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '700',
  },
  xpBarContainer: {
    gap: 5,
  },
  xpBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  xpValue: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  xpTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 3,
  },
});
