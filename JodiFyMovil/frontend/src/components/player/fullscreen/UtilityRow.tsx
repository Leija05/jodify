import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { PressableFluid } from '../../ui/PressableFluid';
import { EqualizerBars } from '../../ui/EqualizerBars';
import { colors, shadows } from '../../../theme';

interface Props {
  liked: boolean;
  downloaded: boolean;
  downloading: boolean;
  onLike: () => void;
  onDownload: () => void;
  onEqualizer: () => void;
  onLyricsToggle: () => void;
  showLyrics: boolean;
  onLyricsFullscreen?: () => void;
  hasLyrics: boolean;
}

const BTN = 58;

export function UtilityRow({
  liked,
  downloaded,
  downloading,
  onLike,
  onDownload,
  onEqualizer,
  onLyricsToggle,
  showLyrics,
  onLyricsFullscreen,
  hasLyrics,
}: Props) {
  return (
    <View style={styles.utilityRow}>
      <PressableFluid onPress={onLike} haptic="light" style={styles.utilityBtn} hitSlop={4}>
        <View style={[styles.utilityInner, liked && styles.utilityLiked]}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={24}
            color={liked ? colors.accent : colors.textSecondary}
          />
        </View>
      </PressableFluid>
      <PressableFluid onPress={onDownload} haptic="light" style={styles.utilityBtn} hitSlop={4}>
        <View style={[styles.utilityInner, downloaded && styles.utilityDownloaded]}>
          {downloading ? (
            <EqualizerBars playing bars={3} height={16} barWidth={3} color={colors.success} />
          ) : (
            <Ionicons
              name={downloaded ? 'cloud-done' : 'cloud-download-outline'}
              size={24}
              color={downloaded ? colors.success : colors.textSecondary}
            />
          )}
        </View>
      </PressableFluid>
      <PressableFluid onPress={onEqualizer} haptic="light" style={styles.utilityBtn} hitSlop={4}>
        <View style={[styles.utilityInner, styles.utilityEq]}>
          <Ionicons name="options-outline" size={24} color={colors.secondary} />
        </View>
      </PressableFluid>
      <PressableFluid onPress={onLyricsToggle} haptic="light" style={styles.utilityBtn} hitSlop={4}>
        <View style={[styles.utilityInner, showLyrics && styles.utilityActive]}>
          <Ionicons
            name={showLyrics ? 'mic' : 'mic-outline'}
            size={24}
            color={showLyrics ? colors.secondary : colors.textSecondary}
          />
        </View>
      </PressableFluid>
      {hasLyrics && onLyricsFullscreen ? (
        <PressableFluid onPress={onLyricsFullscreen} haptic="light" style={styles.utilityBtn} hitSlop={4}>
          <View style={styles.utilityInner}>
            <Ionicons name="expand-outline" size={22} color={colors.textMuted} />
          </View>
        </PressableFluid>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  utilityRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    marginTop: 18,
    minHeight: BTN,
  },
  utilityBtn: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
  },
  utilityInner: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  utilityLiked: {
    backgroundColor: colors.accentSoft,
    borderColor: 'rgba(255,0,122,0.45)',
    ...shadows.soft,
  },
  utilityDownloaded: {
    backgroundColor: colors.successSoft,
    borderColor: 'rgba(0,230,118,0.4)',
  },
  utilityEq: {
    backgroundColor: colors.secondarySoft,
    borderColor: 'rgba(0,229,255,0.4)',
  },
  utilityActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryStrong,
  },
});
