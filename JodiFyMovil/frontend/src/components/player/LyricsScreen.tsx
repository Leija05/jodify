import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, ScrollView, StyleSheet, Text, View, PanResponder, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LyricsLine } from '@lib/types';
import { fetchLyrics, lyricsFromSong, getPreloadedLyrics } from '@services/lyrics.service';
import { usePlayerStore } from '@stores/player.store';
import { useUiStore } from '@stores/ui.store';
import { colors, motion } from '@theme';
import { PressableFluid } from '@components/ui/PressableFluid';
import { DynamicBackground } from '@components/player/DynamicBackground';
import { getSongPalette } from '@lib/palette';

const SCREEN = Dimensions.get('window');
const DISMISS_THRESHOLD = 130;

interface LyricLineItemProps {
  index: number;
  line: LyricsLine;
  isActive: boolean;
  isPast: boolean;
  glowColor: string;
  onPress: (time: number) => void;
  onLayout: (index: number, y: number) => void;
}

const LyricLineItem = React.memo(
  ({ index, line, isActive, isPast, glowColor, onPress, onLayout }: LyricLineItemProps) => {
    return (
      <PressableFluid
        onPress={() => onPress(line.time)}
        haptic="selection"
        style={styles.lineContainer}
        onLayout={(event) => {
          onLayout(index, event.nativeEvent.layout.y);
        }}
      >
        <Text
          style={[
            styles.lyricText,
            isActive
              ? [
                  styles.lyricTextActive,
                  {
                    textShadowColor: glowColor,
                  },
                ]
              : isPast
              ? styles.lyricTextPast
              : styles.lyricTextFuture,
          ]}
        >
          {line.text}
        </Text>
      </PressableFluid>
    );
  }
);

LyricLineItem.displayName = 'LyricLineItem';

export const LyricsScreen = React.forwardRef<{ open: () => void; close: () => void }, any>(
  (_props, _ref) => {
    const open = useUiStore((s) => s.lyricsModalOpen);
    const closeLyricsModal = useUiStore((s) => s.closeLyricsModal);
    const currentSong = usePlayerStore((s) => s.currentSong);
    const position = usePlayerStore((s) => s.position);
    const seek = usePlayerStore((s) => s.seek);
    const insets = useSafeAreaInsets();

    const [lyrics, setLyrics] = useState<LyricsLine[] | null>(null);
    const [lyricsLoading, setLyricsLoading] = useState(false);
    const [singMode, setSingMode] = useState(false);
    const [vocalLevel, setVocalLevel] = useState(1.0); // 1.0: Full voice, 0.2: Sing karaoke

    const translateY = useRef(new Animated.Value(SCREEN.height)).current;
    const isAnimatingOutRef = useRef(false);
    const scrollViewRef = useRef<ScrollView>(null);
    const lineLayouts = useRef<{ [index: number]: number }>({});
    const hasInitiallyScrolledRef = useRef(false);
    const isUserScrollingRef = useRef(false);
    const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const palette = useMemo(() => getSongPalette(currentSong), [currentSong]);

    useEffect(() => {
      if (!currentSong) {
        setLyrics(null);
        return;
      }
      const preloaded = lyricsFromSong(currentSong.lyrics) || getPreloadedLyrics(currentSong.name, currentSong.artist);
      if (preloaded) {
        setLyrics(preloaded);
        return;
      }
      setLyrics(null);
      setLyricsLoading(true);
      fetchLyrics(currentSong.name, currentSong.artist).then((lines) => {
        setLyrics(lines);
        setLyricsLoading(false);
      });
    }, [currentSong?.id]);

    const animateIn = useCallback(() => {
      isAnimatingOutRef.current = false;
      translateY.setValue(SCREEN.height);
      Animated.spring(translateY, { toValue: 0, ...motion.springDefault, useNativeDriver: true }).start();
    }, [translateY]);

    const animateOut = useCallback(() => {
      if (isAnimatingOutRef.current) return;
      isAnimatingOutRef.current = true;
      translateY.flattenOffset();
      Animated.timing(translateY, {
        toValue: SCREEN.height,
        duration: 220,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }).start(() => {
        closeLyricsModal();
        translateY.setValue(SCREEN.height);
        isAnimatingOutRef.current = false;
      });
    }, [translateY, closeLyricsModal]);

    useEffect(() => {
      if (open) animateIn();
    }, [open, animateIn]);

    const springBack = useCallback(() => {
      if (isAnimatingOutRef.current) return;
      translateY.flattenOffset();
      Animated.spring(translateY, { toValue: 0, ...motion.springDefault, useNativeDriver: true }).start();
    }, [translateY]);

    const dismiss = useCallback(() => {
      translateY.flattenOffset();
      animateOut();
    }, [animateOut, translateY]);

    const dismissRef = useRef(dismiss);
    dismissRef.current = dismiss;
    const springBackRef = useRef(springBack);
    springBackRef.current = springBack;

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_event, gestureState) => {
          return gestureState.dy > 12 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5;
        },
        onPanResponderGrant: () => {
          translateY.extractOffset();
          isAnimatingOutRef.current = false;
        },
        onPanResponderMove: (_event, gestureState) => {
          const dy = gestureState.dy;
          if (dy > 0) {
            const clampedDy = Math.min(dy, SCREEN.height * 0.7);
            translateY.setValue(clampedDy);
          }
        },
        onPanResponderRelease: (_event, gestureState) => {
          translateY.flattenOffset();
          const { dy, vy } = gestureState;
          if (dy > DISMISS_THRESHOLD || (dy > 60 && vy > 0.45)) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            dismissRef.current();
          } else {
            springBackRef.current();
          }
        },
        onPanResponderTerminate: () => {
          translateY.flattenOffset();
          springBackRef.current();
        },
      })
    ).current;

    const modalOpacity = translateY.interpolate({
      inputRange: [0, SCREEN.height * 0.7],
      outputRange: [1, 0.2],
      extrapolate: 'clamp',
    });

    // Calculate active line index based on current playback position
    const activeLineIndex = useMemo(() => {
      if (!lyrics || lyrics.length === 0) return -1;
      let active = -1;
      for (let i = 0; i < lyrics.length; i++) {
        const item = lyrics[i];
        if (item && item.time <= position) {
          active = i;
        } else {
          break;
        }
      }
      return active;
    }, [lyrics, position]);

    const scrollToLine = useCallback((index: number, animated = true) => {
      if (index < 0 || lineLayouts.current[index] === undefined) return;
      const y = lineLayouts.current[index]!;
      scrollViewRef.current?.scrollTo({
        y: Math.max(0, y - SCREEN.height * 0.35),
        animated,
      });
    }, []);

    // Instant layout snap when active line is measured
    const handleLineLayout = useCallback(
      (index: number, y: number) => {
        lineLayouts.current[index] = y;
        if (!hasInitiallyScrolledRef.current && index === activeLineIndex) {
          hasInitiallyScrolledRef.current = true;
          requestAnimationFrame(() => {
            scrollToLine(index, false);
          });
        }
      },
      [activeLineIndex, scrollToLine]
    );

    // Auto-scroll when active line changes smoothly
    useEffect(() => {
      if (isUserScrollingRef.current) return;
      if (activeLineIndex >= 0 && lineLayouts.current[activeLineIndex] !== undefined) {
        scrollToLine(activeLineIndex, true);
        hasInitiallyScrolledRef.current = true;
      }
    }, [activeLineIndex, scrollToLine]);

    // Handle initial scroll on modal open or track change
    useEffect(() => {
      if (open) {
        hasInitiallyScrolledRef.current = false;
        isUserScrollingRef.current = false;
        if (activeLineIndex >= 0 && lineLayouts.current[activeLineIndex] !== undefined) {
          requestAnimationFrame(() => {
            scrollToLine(activeLineIndex, false);
            hasInitiallyScrolledRef.current = true;
          });
        }
      }
    }, [open, currentSong?.id, activeLineIndex, scrollToLine]);

    const onScrollBeginDrag = useCallback(() => {
      isUserScrollingRef.current = true;
      if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
    }, []);

    const onScrollEndDrag = useCallback(() => {
      if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
      userScrollTimeoutRef.current = setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 3500);
    }, []);

    const handleLinePress = useCallback(
      (time: number) => {
        Haptics.selectionAsync();
        seek(time);
      },
      [seek]
    );

    const toggleSingMode = useCallback(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSingMode((prev) => {
        const next = !prev;
        setVocalLevel(next ? 0.2 : 1.0);
        return next;
      });
    }, []);

    if (!open) return null;

    return (
      <Modal
        visible={open}
        transparent
        animationType="none"
        presentationStyle="overFullScreen"
        onRequestClose={dismiss}
        statusBarTranslucent
      >
        <View style={styles.modalRoot}>
          <Animated.View
            style={[
              styles.container,
              { transform: [{ translateY }], opacity: modalOpacity },
            ]}
          >
            {/* Living Dynamic Mesh Aura Backdrop */}
            <DynamicBackground song={currentSong} intensity={0.95} />

            {/* Top Floating Glass Header with Dismiss Swipe */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]} {...panResponder.panHandlers}>
              <PressableFluid onPress={dismiss} haptic="light" style={styles.headerBtn} hitSlop={12}>
                <Ionicons name="chevron-down" size={26} color={colors.white} />
              </PressableFluid>

              <View style={styles.headerCenter}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {currentSong?.name ?? 'Letras'}
                </Text>
                <Text style={styles.headerArtist} numberOfLines={1}>
                  {currentSong?.artist ?? 'Apple Music Sing'}
                </Text>
              </View>

              {/* Apple Music Sing Vocal Attenuator Toggle */}
              <PressableFluid
                onPress={toggleSingMode}
                haptic="medium"
                style={[
                  styles.singToggleBtn,
                  singMode && styles.singToggleBtnActive,
                ]}
                hitSlop={8}
              >
                <Ionicons
                  name="mic"
                  size={16}
                  color={singMode ? colors.white : 'rgba(255, 255, 255, 0.7)'}
                />
                <Text style={[styles.singToggleText, singMode && styles.singToggleTextActive]}>
                  {singMode ? 'Sing Activo' : 'Sing'}
                </Text>
              </PressableFluid>
            </View>

            {/* Lyrics Content Stream */}
            {lyricsLoading ? (
              <View style={styles.centerWrap}>
                <Text style={styles.loadingText}>Sincronizando letras en tiempo real…</Text>
              </View>
            ) : lyrics && lyrics.length > 0 ? (
              <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={[
                  styles.scrollContent,
                  { paddingTop: insets.top + 70, paddingBottom: insets.bottom + 80 },
                ]}
                showsVerticalScrollIndicator={false}
                onScrollBeginDrag={onScrollBeginDrag}
                onScrollEndDrag={onScrollEndDrag}
              >
                {lyrics.map((line, index) => {
                  const isActive = index === activeLineIndex;
                  const isPast = index < activeLineIndex;

                  return (
                    <LyricLineItem
                      key={index}
                      index={index}
                      line={line}
                      isActive={isActive}
                      isPast={isPast}
                      glowColor={palette.primary}
                      onPress={handleLinePress}
                      onLayout={handleLineLayout}
                    />
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.centerWrap}>
                <Ionicons name="musical-notes-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>Letras no disponibles</Text>
                <Text style={styles.emptySubtitle}>Esta canción no cuenta con transcripción sincronizada</Text>
              </View>
            )}

            {/* Floating Vocal Slider Indicator when Sing mode is active */}
            {singMode && (
              <View style={[styles.singFloatingIndicator, { bottom: insets.bottom + 24 }]}>
                <Ionicons name="sparkles" size={14} color={colors.secondary} />
                <Text style={styles.singIndicatorText}>
                  Modo Karaoke Apple Music Sing • Nivel de voz {Math.round(vocalLevel * 100)}%
                </Text>
              </View>
            )}
          </Animated.View>
        </View>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 16,
    color: colors.white,
    letterSpacing: -0.3,
  },
  headerArtist: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  singToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  singToggleBtnActive: {
    backgroundColor: colors.primary,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  singToggleText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  singToggleTextActive: {
    color: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 28,
  },
  lineContainer: {
    paddingVertical: 14,
  },
  lyricText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: -0.8,
  },
  lyricTextActive: {
    color: colors.white,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
    opacity: 1,
    transform: [{ scale: 1.02 }],
  },
  lyricTextPast: {
    color: 'rgba(255, 255, 255, 0.40)',
    opacity: 0.4,
  },
  lyricTextFuture: {
    color: 'rgba(255, 255, 255, 0.28)',
    opacity: 0.28,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  loadingText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  emptyTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 20,
    color: colors.white,
    marginTop: 8,
  },
  emptySubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  singFloatingIndicator: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(12, 12, 18, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  singIndicatorText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: colors.white,
  },
});

LyricsScreen.displayName = 'LyricsScreen';