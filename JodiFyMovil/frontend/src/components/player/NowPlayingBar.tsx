import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useRef, useState, useEffect } from 'react';
import { Animated, FlatList, StyleSheet, Text, View, Image } from 'react-native';
import { PressableScale } from '../ui/PressableScale';
import { EqualizerBars } from '../ui/EqualizerBars';
import { CommunityUser } from '../../services/users.service';
import { pickCoverUrl } from '../../lib/utils';
import { colors, typography, gradients, radius } from '../../theme';

const CARD_WIDTH = 190;
const GAP = 12;

interface Props {
  users: CommunityUser[];
  onPressUser: (user: CommunityUser) => void;
}

export function NowPlayingBar({ users, onPressUser }: Props) {
  const listeningUsers = useMemo(
    () => users.filter((u) => u.online && u.now_playing),
    [users]
  );

  if (listeningUsers.length === 0) return null;

  const [activeIndex, setActiveIndex] = useState(0);
  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const entranceTranslateY = useRef(new Animated.Value(24)).current;
  const pulseValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (listeningUsers.length > 0) {
      Animated.parallel([
        Animated.timing(entranceOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.spring(entranceTranslateY, {
          toValue: 0,
          damping: 18,
          stiffness: 160,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseValue, { toValue: 1, duration: 1400, useNativeDriver: true }),
            Animated.timing(pulseValue, { toValue: 0, duration: 1400, useNativeDriver: true }),
          ])
        ).start();
      });
    }
  }, [listeningUsers.length, entranceOpacity, entranceTranslateY, pulseValue]);


  const handleMomentumScrollEnd = (e: any) => {
    const offset = e.nativeEvent.contentOffset.x;
    const index = Math.round(offset / (CARD_WIDTH + GAP));
    const clampedIndex = Math.max(0, Math.min(listeningUsers.length - 1, index));
    setActiveIndex(clampedIndex);
  };

  const renderItem = ({ item, index }: { item: CommunityUser; index: number }) => {
    const np = item.now_playing;
    const coverUrl = np ? pickCoverUrl({ cover_url: '', cover: '', image_url: '', artwork_url: np.song_name } as any) : null;
    const isActive = index === activeIndex;

    return (
      <PressableScale 
        onPress={() => onPressUser(item)} 
        haptic 
        style={[styles.card, isActive && styles.cardActive]} 
        scaleTo={0.96}
      >
        <View style={styles.cardInner}>
          <View style={styles.coverWrap}>
            {coverUrl ? (
              <Image source={{ uri: coverUrl }} style={styles.cover} resizeMode="cover" />
            ) : (
              <LinearGradient
                colors={[gradients.primary[0], gradients.accent[1]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.coverGradient}
              >
                <Ionicons name="musical-notes" size={20} color={colors.white} />
              </LinearGradient>
            )}
            <Animated.View style={[
              styles.eqOverlay, 
              { opacity: isActive ? 1 : 0 }
            ]}>
              <EqualizerBars playing bars={3} height={14} barWidth={2} color={colors.secondary} />
            </Animated.View>
            {isActive && (
              <Animated.View style={[
                styles.activeGlow,
                { opacity: pulseValue.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] }) }
              ]} />
            )}
          </View>
          <View style={styles.info}>
            <Text style={styles.songName} numberOfLines={1}>{np?.song_name ?? '—'}</Text>
            <Text style={styles.artist} numberOfLines={1}>{np?.artist ?? 'Desconocido'}</Text>
            <View style={styles.userRow}>
              <View style={[styles.userAvatar, { backgroundColor: gradients.primary[0] }]}>
                <Text style={styles.userAvatarText}>{item.username.slice(0, 1).toUpperCase()}</Text>
              </View>
              <Text style={styles.username}>{item.username}</Text>
            </View>
          </View>
        </View>
      </PressableScale>
    );
  };

  return (
    <Animated.View style={[styles.container, { opacity: entranceOpacity, transform: [{ translateY: entranceTranslateY }] }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.titleIcon}>
            <Ionicons name="musical-notes" size={16} color={colors.secondary} />
          </View>
          <Text style={styles.title}>Escuchando ahora</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.count}>{listeningUsers.length} usuario{listeningUsers.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>
      
      <FlatList
        data={listeningUsers}
        keyExtractor={(item) => item.username}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + GAP}
        snapToAlignment="start"
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
      />
      
      {listeningUsers.length > 1 && (
        <View style={styles.indicators}>
          {listeningUsers.map((_, i) => (
            <View
              key={i}
              style={[
                styles.indicator,
                i === activeIndex && styles.indicatorActive,
              ]}
            />
          ))}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,240,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontFamily: typography.headlineMedium.fontFamily,
    fontSize: 17,
    letterSpacing: -0.3,
  },
  count: {
    color: colors.textDim,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: GAP,
    paddingBottom: 8,
    paddingLeft: 16,
    paddingRight: 16,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.surfaceDeep,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  cardActive: {
    borderColor: colors.secondary,
    shadowColor: colors.secondary,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
  },
  coverWrap: {
    position: 'relative',
    width: 56,
    height: 56,
    borderRadius: radius.md,
    overflow: 'hidden',
    flexShrink: 0,
  },
  cover: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
  },
  coverGradient: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eqOverlay: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    right: 2,
    height: 14,
    backgroundColor: 'rgba(5,5,7,0.7)',
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.secondary,
    shadowColor: colors.secondary,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  info: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  songName: {
    color: colors.white,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 13,
    letterSpacing: -0.2,
  },
  artist: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 11.5,
    marginTop: 1,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  userAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: colors.white,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 10,
  },
  username: {
    color: colors.textDim,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 11,
  },
  indicators: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 16,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  indicatorActive: {
    width: 18,
    backgroundColor: colors.secondary,
    shadowColor: colors.secondary,
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
});