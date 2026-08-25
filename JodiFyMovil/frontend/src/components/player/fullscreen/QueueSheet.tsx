import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { PressableFluid } from '../../ui/PressableFluid';
import { SongRow } from '../SongRow';
import { usePlayerStore } from '../../../store/player.store';
import { colors, typography, radius, safeArea } from '../../../theme';


interface Props {
  open: boolean;
  onClose: () => void;
}

export function QueueSheet({ open, onClose }: Props) {
  const { queue, currentSong, isPlaying, playSong, removeFromQueue, clearQueue, error } = usePlayerStore();
  const togglePlay = usePlayerStore((s) => s.togglePlay);

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Cola de reproducción</Text>
              <Text style={styles.sheetSubtitle}>
                {queue.length} canción{queue.length === 1 ? '' : 'es'}
              </Text>
            </View>
            <View style={styles.sheetHeaderActions}>
              {queue.length > 0 && (
                <PressableFluid
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    clearQueue();
                  }}
                  haptic
                  style={styles.sheetClearBtn}
                >
                  <Ionicons name="trash-outline" size={15} color={colors.error} />
                  <Text style={styles.sheetClearText}>Vaciar</Text>
                </PressableFluid>
              )}
              <PressableFluid onPress={onClose} haptic style={styles.sheetCloseBtn}>
                <Ionicons name="chevron-down" size={22} color={colors.textMuted} />
              </PressableFluid>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={15} color={colors.error} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          <FlatList
            data={queue}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.sheetList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => {
              const isCurrent = String(currentSong?.id) === String(item.id);
              return (
                <View style={styles.sheetRow}>
                  <Text style={styles.sheetIndex}>{String(index + 1).padStart(2, '0')}</Text>
                  <View style={styles.sheetRowMain}>
                    <SongRow
                      song={item}
                      isCurrent={isCurrent}
                      isPlaying={isPlaying && isCurrent}
                      onPress={() => playSong(item, queue)}
                      right={
                        isCurrent ? (
                          <PressableFluid onPress={togglePlay} haptic>
                            <Ionicons name={isPlaying ? 'pause' : 'play'} size={19} color={colors.secondary} />
                          </PressableFluid>
                        ) : undefined
                      }
                    />
                  </View>
                  <PressableFluid
                    onPress={() => removeFromQueue(item.id)}
                    haptic
                    style={styles.sheetRemoveBtn}
                  >
                    <Ionicons name="close" size={16} color={colors.textDim} />
                  </PressableFluid>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.sheetEmpty}>
                <Ionicons name="list-outline" size={30} color={colors.textDim} />
                <Text style={styles.sheetEmptyText}>La cola está vacía</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5,5,7,0.72)',
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  sheet: {
    backgroundColor: colors.surfaceSolid,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    maxHeight: '78%',
    paddingBottom: safeArea.bottom + 12,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  sheetTitle: {
    color: colors.text,
    fontFamily: typography.headlineMedium.fontFamily,
    fontSize: typography.headlineMedium.fontSize,
    letterSpacing: typography.headlineMedium.letterSpacing,
    lineHeight: typography.headlineMedium.lineHeight,
  },
  sheetSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    letterSpacing: typography.bodyMedium.letterSpacing,
    lineHeight: typography.bodyMedium.lineHeight,
    marginTop: 2,
  },
  sheetHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sheetClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,61,102,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,61,102,0.3)',
  },
  sheetClearText: {
    color: colors.error,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    letterSpacing: typography.labelMedium.letterSpacing,
    lineHeight: typography.labelMedium.lineHeight,
  },
  sheetCloseBtn: {
    padding: 9,
  },
  sheetList: {
    paddingBottom: 8,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },
  sheetIndex: {
    width: 32,
    textAlign: 'center',
    color: colors.textDim,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    letterSpacing: typography.labelMedium.letterSpacing,
    lineHeight: typography.labelMedium.lineHeight,
  },
  sheetRowMain: {
    flex: 1,
  },
  sheetRemoveBtn: {
    padding: 11,
  },
  sheetEmpty: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 40,
  },
  sheetEmptyText: {
    color: colors.textMuted,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    letterSpacing: typography.bodyMedium.letterSpacing,
    lineHeight: typography.bodyMedium.lineHeight,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 18,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,61,102,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,61,102,0.3)',
  },
  errorBannerText: {
    flex: 1,
    color: colors.error,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    letterSpacing: typography.labelMedium.letterSpacing,
    lineHeight: typography.labelMedium.lineHeight,
  },
});

