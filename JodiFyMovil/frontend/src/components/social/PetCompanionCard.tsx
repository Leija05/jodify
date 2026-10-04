import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { PixelPet } from './PixelPet';
import { PressableFluid } from '../ui/PressableFluid';
import { usePlayerStore } from '../../stores/player.store';

interface PetCompanionCardProps {
  petType?: string | null | undefined;
  petVariant?: string | null | undefined;
  petName?: string | null | undefined;
  onCustomize?: (() => void) | undefined;
  isCurrentUser?: boolean | undefined;
  style?: object | undefined;
}

export function PetCompanionCard({
  petType,
  petVariant,
  petName,
  onCustomize,
  isCurrentUser = false,
  style,
}: PetCompanionCardProps) {
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const activeType = (petType || 'cat').toLowerCase();
  const activeVariant = petVariant || (activeType === 'magikarp' ? 'classic' : 'orange');

  const speciesLabels: Record<string, { name: string; icon: string; quote: string }> = {
    cat: { name: 'Gatito Pixel Art', icon: 'paw', quote: 'Amante de las melodías suaves y ronroneos' },
    dog: { name: 'Perrito Fiel', icon: 'heart', quote: '¡Siempre emocionado con los mejores temas!' },
    axolotl: { name: 'Ajolote Mágico', icon: 'water', quote: 'Bioluminiscencia viva en cada nota' },
    magikarp: { name: 'Magikarp', icon: 'flash', quote: '¡Salta en el drop de cada canción!' },
    frog: { name: 'Ranita Lo-Fi', icon: 'leaf', quote: 'Vibes relajadas con beats de lluvia' },
    capybara: { name: 'Capibara Zen', icon: 'sunny', quote: 'Total paz interior y buena música' },
    penguin: { name: 'Pingüino DJ', icon: 'disc', quote: 'Deslizando en el hielo con audífonos' },
    ghost: { name: 'Fantasmita 8-Bit', icon: 'moon', quote: 'Flotando entre sintetizadores retro' },
    fox: { name: 'Kitsune Astuto', icon: 'flame', quote: 'Ritmos sagrados y espíritu musical' },
    robot: { name: 'CyberBot 808', icon: 'hardware-chip', quote: 'Procesando audio a 320kbps' },
    dragon: { name: 'Dragoncito Chibi', icon: 'sparkles', quote: 'Escupe chispas de fuego al compás del bajo' },
  };

  const meta = speciesLabels[activeType] || {
    name: 'Compañero Pixel',
    icon: 'sparkles',
    quote: 'Tu fiel amigo sonoro en JodiFy',
  };

  const displayName = petName || (activeType === 'magikarp' ? 'Karp' : activeType === 'cat' ? 'Michi' : meta.name);

  if (!petType || petType === 'none') {
    if (!isCurrentUser) return null;

    return (
      <View style={[styles.emptyContainer, style]}>
        <LinearGradient
          colors={['rgba(127, 0, 255, 0.12)', 'rgba(0, 229, 255, 0.06)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.emptyLeft}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="sparkles" size={20} color="#00E5FF" />
          </View>
          <View style={styles.emptyTexts}>
            <Text style={styles.emptyTitle}>Adopta tu Mascota Virtual</Text>
            <Text style={styles.emptySubtitle}>Añade un gatito, perrito, ajolote o dragón a tu perfil</Text>
          </View>
        </View>

        {onCustomize && (
          <PressableFluid
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onCustomize();
            }}
            haptic="medium"
            style={styles.adoptBtn}
          >
            <LinearGradient
              colors={['#7F00FF', '#00E5FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.adoptGradient}
            >
              <Ionicons name="add" size={14} color="#ffffff" />
              <Text style={styles.adoptBtnText}>Elegir</Text>
            </LinearGradient>
          </PressableFluid>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.cardWrapper, style]}>
      <LinearGradient
        colors={['rgba(25, 25, 42, 0.95)', 'rgba(14, 14, 24, 0.98)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardBg}
      />

      <LinearGradient
        colors={['rgba(0, 229, 255, 0.18)', 'rgba(127, 0, 255, 0.12)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.8 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.contentRow}>
        {/* Left: Pixel Art Creature (Interactive) */}
        <View style={styles.petWrap}>
          <PixelPet
            petType={activeType}
            variant={activeVariant}
            petName={displayName}
            size={56}
            interactive={true}
          />
        </View>

        {/* Center: Info */}
        <View style={styles.infoCol}>
          <View style={styles.tagRow}>
            <View style={styles.badgePill}>
              <Ionicons name="sparkles" size={10} color="#00E5FF" />
              <Text style={styles.badgeText}>MASCOTA COMPAÑERA</Text>
            </View>

            {isPlaying && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Vibing</Text>
              </View>
            )}
          </View>

          <Text style={styles.petNameText} numberOfLines={1}>
            {displayName}
          </Text>

          <Text style={styles.speciesText} numberOfLines={1}>
            {meta.name} • {isPlaying ? 'Bailando al ritmo ♪' : 'Atento & Feliz ✨'}
          </Text>

          <Text style={styles.quoteText} numberOfLines={1}>
            {meta.quote}
          </Text>
        </View>

        {/* Right: Quick action if user */}
        {isCurrentUser && onCustomize && (
          <PressableFluid
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onCustomize();
            }}
            haptic="light"
            style={styles.editBtn}
            hitSlop={8}
          >
            <Ionicons name="pencil" size={13} color="#00E5FF" />
            <Text style={styles.editBtnText}>Cambiar</Text>
          </PressableFluid>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(0, 229, 255, 0.28)',
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 6,
  },
  cardBg: {
    ...StyleSheet.absoluteFillObject,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  petWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
  },
  badgeText: {
    color: '#00E5FF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 255, 136, 0.12)',
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#00FF88',
  },
  liveText: {
    color: '#00FF88',
    fontSize: 9,
    fontWeight: '700',
  },
  petNameText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  speciesText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  quoteText: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 2,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  editBtnText: {
    color: '#00E5FF',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    marginVertical: 6,
  },
  emptyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  emptyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTexts: {
    flex: 1,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 1,
  },
  adoptBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  adoptGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  adoptBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
