import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { PressableFluid } from '../../ui/PressableFluid';
import { EqualizerBars } from '../../ui/EqualizerBars';
import { KaraokeLyrics } from '../../lyrics/KaraokeLyrics';
import { colors, typography } from '../../../theme';

interface Props {
  showLyrics: boolean;
  lyricsLoading: boolean;
  lyrics: any[] | null;
  synced: boolean;
  position: number;
  onSeek: (seconds: number) => void;
  onLyricsToggle: () => void;
}

export function LyricsZone({
  showLyrics,
  lyricsLoading,
  lyrics,
  synced,
  position,
  onSeek,
  onLyricsToggle,
}: Props) {
  return (
    <View style={[styles.lyricsZone, showLyrics && styles.lyricsZoneVisible]}>
      {showLyrics ? (
        lyricsLoading ? (
          <View style={styles.lyricsEmpty}>
            <EqualizerBars playing bars={5} height={16} color={colors.primary} />
            <Text style={styles.lyricsEmptyText}>Buscando letras…</Text>
          </View>
        ) : lyrics && lyrics.length > 0 ? (
          <KaraokeLyrics lines={lyrics} currentTime={position} synced={synced} onSeek={onSeek} />
        ) : (
          <View style={styles.lyricsEmpty}>
            <Ionicons name="document-text-outline" size={26} color={colors.textMuted} />
            <Text style={styles.lyricsEmptyText}>No se encontraron letras para esta canción</Text>
          </View>
        )
      ) : (
        <PressableFluid onPress={onLyricsToggle} haptic style={styles.lyricsHint}>
          <Ionicons name="mic-outline" size={16} color={colors.textMuted} />
          <Text style={styles.lyricsHintText}>Letras</Text>
        </PressableFluid>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  lyricsZone: {
    minHeight: 58,
    marginTop: 10,
  },
  lyricsZoneVisible: {
    backgroundColor: 'rgba(8,8,14,0.66)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  lyricsEmpty: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 30,
  },
  lyricsEmptyText: {
    color: colors.textMuted,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    letterSpacing: typography.bodyMedium.letterSpacing,
    lineHeight: typography.bodyMedium.lineHeight,
  },
  lyricsHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  lyricsHintText: {
    color: colors.textMuted,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    letterSpacing: typography.labelMedium.letterSpacing,
    lineHeight: typography.labelMedium.lineHeight,
  },
});