import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLibraryStore } from '../../store/library.store';
import { usePlayerStore } from '../../store/player.store';
import { useSettingsStore } from '../../store/settings.store';
import { useUiStore } from '../../store/ui.store';
import { formatTime, resolveArtist } from '../../lib/utils';
import { colors, fonts, gradients, radius } from '../../theme';
import { PressableScale } from '../ui/PressableScale';
import { EqualizerBars } from '../ui/EqualizerBars';
import { CoverArt } from './SongRow';

/**
 * Barra de reproducción (mini player):
 * portada + título/artista + ecualizador + like + controles, con barra de
 * progreso y tiempos. Al tocar la info abre el reproductor completo.
 */
export function MiniPlayer() {
  const insets = useSafeAreaInsets();
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const openFullscreen = useUiStore((s) => s.openFullscreen);
  const openEqualizer = useUiStore((s) => s.openEqualizer);
  const likedIds = useLibraryStore((s) => s.likedIds);
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const user = useSettingsStore((s) => s.user);
  const openAuth = useUiStore((s) => s.openAuth);

  const liked = currentSong ? likedIds.some((id) => String(id) === String(currentSong.id)) : false;

  const handleLike = useCallback(async () => {
    if (!currentSong) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!user) {
      openAuth();
      return;
    }
    await toggleLike(currentSong);
  }, [currentSong, user, toggleLike, openAuth]);

  if (!currentSong) return null;

  const progress = duration > 0 ? Math.min(1, position / duration) : 0;

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 66 }]}>
      <LinearGradient colors={gradients.surface} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

      <PressableScale onPress={openFullscreen} style={styles.main} scaleTo={0.99}>
        <View style={styles.coverRing}>
          <CoverArt song={currentSong} size={44} radiusSize={10} />
        </View>

        <View style={styles.texts}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {currentSong.name}
            </Text>
            {isPlaying && (
              <View style={styles.waveWrap}>
                <EqualizerBars playing bars={3} height={11} barWidth={2} color={colors.secondary} />
              </View>
            )}
          </View>
          <Text style={styles.artist} numberOfLines={1}>
            {resolveArtist(currentSong) ?? 'Desconocido'}
          </Text>
        </View>

        <View style={styles.times}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      </PressableScale>

      <View style={styles.controls}>
        <PressableScale onPress={openEqualizer} haptic style={styles.controlBtn}>
          <Ionicons name="options-outline" size={17} color={colors.secondary} />
        </PressableScale>
        <PressableScale onPress={handleLike} haptic style={styles.controlBtn}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? colors.accent : colors.textMuted} />
        </PressableScale>
        <PressableScale onPress={previous} haptic style={styles.controlBtn}>
          <Ionicons name="play-skip-back" size={20} color={colors.text} />
        </PressableScale>
        <PressableScale onPress={togglePlay} haptic style={styles.controlBtn}>
          <View style={styles.playChip}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={17} color={colors.white} />
          </View>
        </PressableScale>
        <PressableScale onPress={next} haptic style={styles.controlBtn}>
          <Ionicons name="play-skip-forward" size={20} color={colors.text} />
        </PressableScale>
      </View>

      <View style={styles.progressTrack}>
        <LinearGradient
          colors={[gradients.primary[0], gradients.play[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${progress * 100}%` }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOpacity: 0.65,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingTop: 8,
    paddingBottom: 2,
    gap: 10,
  },
  coverRing: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: 1,
  },
  texts: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
    fontSize: 13.5,
    flexShrink: 1,
  },
  waveWrap: {
    height: 11,
  },
  artist: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 11.5,
    marginTop: 1,
  },
  times: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 4,
  },
  timeText: {
    color: colors.textDim,
    fontFamily: fonts.bodyMedium,
    fontSize: 9.5,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  controlBtn: {
    padding: 7,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  progressFill: {
    height: '100%',
  },
});