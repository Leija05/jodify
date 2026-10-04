import { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { usePlayerStore } from '../../stores/player.store';

export interface PixelPetProps {
  petType?: string | null | undefined;
  type?: string | null | undefined;
  variant?: string | null | undefined;
  petName?: string | null | undefined;
  customName?: string | null | undefined;
  size?: number | undefined;
  scale?: number | undefined;
  interactive?: boolean | undefined;
  isMusicPlaying?: boolean | undefined;
  isSleeping?: boolean | undefined;
  facing?: number | undefined;
  onClick?: (() => void) | undefined;
  style?: object | undefined;
}

export function PixelPet({
  petType,
  type,
  variant = 'orange',
  petName,
  customName,
  size = 54,
  scale,
  interactive = true,
  isMusicPlaying: propIsPlaying,
  isSleeping = false,
  facing = 1,
  onClick,
  style,
}: PixelPetProps) {
  const storeIsMusicPlaying = usePlayerStore((s) => s.isPlaying);
  const isMusicPlaying = propIsPlaying !== undefined ? propIsPlaying : storeIsMusicPlaying;

  const [dialogue, setDialogue] = useState<string | null>(null);
  const [hearts, setHearts] = useState<Array<{ id: number; x: number; y: number }>>([]);

  const activeType = (petType || type || 'cat').toLowerCase();
  const activeVariant = variant || (activeType === 'magikarp' ? 'classic' : 'orange');
  const activeSize = scale ? Math.round(scale * 24) : size;

  // Animation values
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const musicPulseAnim = useRef(new Animated.Value(0)).current;

  // Music beat loop
  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;
    if (isMusicPlaying && !isSleeping) {
      animLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(musicPulseAnim, {
            toValue: 1,
            duration: 450,
            useNativeDriver: true,
          }),
          Animated.timing(musicPulseAnim, {
            toValue: 0,
            duration: 450,
            useNativeDriver: true,
          }),
        ])
      );
      animLoop.start();
    } else {
      musicPulseAnim.setValue(0);
    }

    return () => {
      if (animLoop) animLoop.stop();
    };
  }, [isMusicPlaying, isSleeping, musicPulseAnim]);

  const triggerReaction = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Bounce animation
    Animated.sequence([
      Animated.timing(bounceAnim, { toValue: 1.25, duration: 120, useNativeDriver: true }),
      Animated.spring(bounceAnim, { toValue: 1, friction: 3, tension: 120, useNativeDriver: true }),
    ]).start();

    // Spawn heart
    const newHeart = { id: Date.now(), x: (Math.random() - 0.5) * 24, y: -16 };
    setHearts((prev) => [...prev.slice(-2), newHeart]);
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 1200);

    // Adorable dialogues
    const phrases: Record<string, string[]> = {
      cat: ['¡Miau! ♪', '¡Prrr! ♥', '¡Nya! 🐾', '¡Vibing! 🎧'],
      dog: ['¡Guau! ♫', '¡Woof! ✨', '¡Amo este beat! ♥', '¡Cola feliz! ⚡'],
      axolotl: ['¡Glu glu! 🫧', '¡Bioluminiscencia! ⚡', '¡Sonrisa acuática! ♥', '¡Nadando al ritmo! 🌊'],
      magikarp: ['¡Splash! 💦', '¡Magikarp usó Splash! 🌊', '¡Boing! ⚡', '¡Shiny! ✨'],
      frog: ['¡Ribbit! 🌿', '¡Croac lo-fi! ☕', '¡Saltito rítmico! 🎶', '¡Champiñón beat! 🍄'],
      capybara: ['Chill... ☕', 'Paz interior 🌿', 'Buen tema... 🧘', 'Total relax ✨'],
      penguin: ['¡Noot noot! ❄️', '¡Deslizando en hielo! 🐧', '¡Suban los graves! 🎧', '¡Waddle beat! 🌊'],
      ghost: ['¡Booo! 👻', '¡Spooky beat! 🎧', '¡8-Bit vibes! 🕹️', '¡Flotando! 🌌'],
      fox: ['¡Yip yip! 🦊', '¡Fuego sónico! 🔥', '¡Cola esponjosa! ✨', '¡Ritmo astuto! 🎧'],
      robot: ['BEEP BOOP! ⚡', 'SYSTEM: 100% GROOVE 🤖', 'PROCESSING AUDIO... 🎧', 'DROP THE BASS! 💥'],
      dragon: ['¡Raaawr! 🔥', '¡Fuego sónico! 🐲', '¡Bajos pesados! ⚡', '¡Chispitas! ✨'],
    };

    const displayName = petName || customName;
    const list = phrases[activeType] || ['¡Yay! ♪'];
    const chosen = list[Math.floor(Math.random() * list.length)] ?? '¡Yay! ♪';
    setDialogue(displayName ? `${displayName}: ${chosen}` : chosen);
    setTimeout(() => setDialogue(null), 1900);

    if (onClick) onClick();
  }, [activeType, bounceAnim, customName, onClick, petName]);

  if (!activeType || activeType === 'none') {
    return null;
  }

  const displayName = petName || customName;
  const musicTranslateY = musicPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -3],
  });

  return (
    <View style={[styles.container, { width: activeSize, height: activeSize }, style]}>
      {/* Dialogue bubble */}
      {dialogue && (
        <View style={styles.dialogueBubble}>
          <Text style={styles.dialogueText}>{dialogue}</Text>
          <View style={styles.dialogueArrow} />
        </View>
      )}

      {/* Heart particles */}
      {hearts.map((h) => (
        <Text key={h.id} style={[styles.heartParticle, { transform: [{ translateX: h.x }, { translateY: h.y }] }]}>
          ♥
        </Text>
      ))}

      {/* Floating music note */}
      {isMusicPlaying && !isSleeping && <Text style={styles.musicNote}>♪</Text>}

      {/* Sleeping snore */}
      {isSleeping && <Text style={styles.sleepSnore}>z z Z</Text>}

      {/* Pet body */}
      <Pressable
        onPress={interactive ? triggerReaction : onClick}
        disabled={!interactive && !onClick}
        accessibilityLabel={displayName ? `Mascota ${displayName}` : `Mascota ${activeType}`}
        style={styles.pressable}
      >
        <Animated.View
          style={[
            styles.petInner,
            {
              transform: [
                { scale: bounceAnim },
                { translateY: musicTranslateY },
                { scaleX: facing === -1 ? -1 : 1 },
              ],
            },
          ]}
        >
          <PixelPetSvg
            type={activeType}
            variant={activeVariant}
            isPlaying={Boolean(isMusicPlaying && !isSleeping)}
            size={activeSize}
          />
        </Animated.View>
      </Pressable>
    </View>
  );
}

// -------------------------------------------------------------
// SVG Pixel Art Router
// -------------------------------------------------------------
function PixelPetSvg({
  type,
  variant,
  isPlaying,
  size,
}: {
  type: string;
  variant: string;
  isPlaying: boolean;
  size: number;
}) {
  switch (type) {
    case 'dog':
      return <PixelDog variant={variant} isPlaying={isPlaying} size={size} />;
    case 'axolotl':
      return <PixelAxolotl variant={variant} isPlaying={isPlaying} size={size} />;
    case 'magikarp':
      return <PixelMagikarp variant={variant} isPlaying={isPlaying} size={size} />;
    case 'frog':
      return <PixelFrog variant={variant} isPlaying={isPlaying} size={size} />;
    case 'capybara':
      return <PixelCapybara variant={variant} isPlaying={isPlaying} size={size} />;
    case 'penguin':
      return <PixelPenguin variant={variant} isPlaying={isPlaying} size={size} />;
    case 'ghost':
      return <PixelGhost variant={variant} isPlaying={isPlaying} size={size} />;
    case 'fox':
      return <PixelFox variant={variant} isPlaying={isPlaying} size={size} />;
    case 'robot':
      return <PixelRobot variant={variant} isPlaying={isPlaying} size={size} />;
    case 'dragon':
      return <PixelDragon variant={variant} isPlaying={isPlaying} size={size} />;
    case 'cat':
    default:
      return <PixelCat variant={variant} isPlaying={isPlaying} size={size} />;
  }
}

// 1. Gato Pixel Art
function PixelCat({ variant, isPlaying, size }: { variant: string; isPlaying: boolean; size: number }) {
  let main = '#f97316';
  let shadow = '#ea580c';
  let belly = '#fef08a';
  let eye = '#10b981';
  let ear = '#fb7185';

  if (variant === 'black') {
    main = '#18181b';
    shadow = '#09090b';
    belly = '#27272a';
    eye = '#facc15';
    ear = '#f472b6';
  } else if (variant === 'white') {
    main = '#ffffff';
    shadow = '#e2e8f0';
    belly = '#f1f5f9';
    eye = '#38bdf8';
    ear = '#fbcfe8';
  } else if (variant === 'siamese') {
    main = '#fde68a';
    shadow = '#b45309';
    belly = '#fef3c7';
    eye = '#2563eb';
    ear = '#78350f';
  } else if (variant === 'calico') {
    main = '#f97316';
    shadow = '#18181b';
    belly = '#ffffff';
    eye = '#fbbf24';
    ear = '#fb7185';
  }

  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Rect x="5" y="4" width="3" height="3" fill={shadow} />
      <Rect x="6" y="5" width="2" height="2" fill={ear} />
      <Rect x="16" y="4" width="3" height="3" fill={shadow} />
      <Rect x="16" y="5" width="2" height="2" fill={ear} />

      <Rect x="6" y="7" width="12" height="7" fill={main} />
      <Rect x="5" y="8" width="14" height="5" fill={main} />

      {isPlaying ? (
        <>
          <Rect x="7" y="9" width="3" height="1" fill="#0f172a" />
          <Rect x="7" y="10" width="1" height="1" fill="#0f172a" />
          <Rect x="9" y="10" width="1" height="1" fill="#0f172a" />
          <Rect x="14" y="9" width="3" height="1" fill="#0f172a" />
          <Rect x="14" y="10" width="1" height="1" fill="#0f172a" />
          <Rect x="16" y="10" width="1" height="1" fill="#0f172a" />
        </>
      ) : (
        <>
          <Rect x="7" y="9" width="3" height="3" fill={eye} />
          <Rect x="8" y="9" width="1" height="1" fill="#ffffff" />
          <Rect x="14" y="9" width="3" height="3" fill={eye} />
          <Rect x="15" y="9" width="1" height="1" fill="#ffffff" />
        </>
      )}

      <Rect x="11" y="11" width="2" height="1" fill={ear} />
      <Rect x="4" y="11" width="2" height="1" fill="#475569" />
      <Rect x="18" y="11" width="2" height="1" fill="#475569" />
      <Rect x="4" y="13" width="2" height="1" fill="#475569" />
      <Rect x="18" y="13" width="2" height="1" fill="#475569" />

      <Rect x="7" y="14" width="10" height="7" fill={main} />
      <Rect x="9" y="15" width="6" height="5" fill={belly} />

      <Rect x="7" y="21" width="3" height="2" fill={shadow} />
      <Rect x="14" y="21" width="3" height="2" fill={shadow} />

      <Rect x="17" y="16" width="3" height="2" fill={shadow} />
      <Rect x="19" y="14" width="2" height="3" fill={shadow} />
      <Rect x="20" y="12" width="2" height="3" fill={main} />
    </Svg>
  );
}

// 2. Perro Pixel Art
function PixelDog({ variant, isPlaying, size }: { variant: string; isPlaying: boolean; size: number }) {
  let main = '#f59e0b';
  let shadow = '#d97706';
  let faceWhite = '#fef3c7';
  let nose = '#18181b';
  let tongue = '#f43f5e';

  if (variant === 'corgi') {
    main = '#ea580c';
    shadow = '#c2410c';
    faceWhite = '#ffffff';
  } else if (variant === 'husky') {
    main = '#334155';
    shadow = '#1e293b';
    faceWhite = '#ffffff';
  } else if (variant === 'dalmatian') {
    main = '#f8fafc';
    shadow = '#0f172a';
    faceWhite = '#ffffff';
  }

  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Rect x="5" y="4" width="3" height="4" fill={shadow} />
      <Rect x="16" y="4" width="3" height="4" fill={shadow} />

      <Rect x="6" y="7" width="12" height="7" fill={main} />
      <Rect x="5" y="8" width="14" height="6" fill={main} />
      <Rect x="8" y="10" width="8" height="4" fill={faceWhite} />

      {isPlaying ? (
        <>
          <Rect x="7" y="9" width="3" height="1" fill="#0f172a" />
          <Rect x="14" y="9" width="3" height="1" fill="#0f172a" />
        </>
      ) : (
        <>
          <Rect x="7" y="9" width="2" height="2" fill="#0f172a" />
          <Rect x="8" y="9" width="1" height="1" fill="#ffffff" />
          <Rect x="15" y="9" width="2" height="2" fill="#0f172a" />
          <Rect x="16" y="9" width="1" height="1" fill="#ffffff" />
        </>
      )}

      <Rect x="11" y="11" width="2" height="2" fill={nose} />
      <Rect x="11" y="13" width="2" height="2" fill={tongue} />

      {variant === 'dalmatian' && (
        <>
          <Rect x="7" y="8" width="2" height="1" fill="#0f172a" />
          <Rect x="15" y="15" width="2" height="2" fill="#0f172a" />
          <Rect x="8" y="18" width="2" height="2" fill="#0f172a" />
        </>
      )}

      <Rect x="7" y="14" width="10" height="7" fill={main} />
      <Rect x="9" y="15" width="6" height="5" fill={faceWhite} />

      <Rect x="7" y="21" width="3" height="2" fill={faceWhite} />
      <Rect x="14" y="21" width="3" height="2" fill={faceWhite} />

      <Rect x="17" y="16" width="3" height="2" fill={shadow} />
      <Rect x="19" y="14" width="2" height="3" fill={shadow} />
      <Rect x="20" y="13" width="2" height="2" fill={faceWhite} />
    </Svg>
  );
}

// 3. Magikarp Pixel Art
function PixelMagikarp({ variant, isPlaying, size }: { variant: string; isPlaying: boolean; size: number }) {
  const isGold = variant === 'golden';
  const body = isGold ? '#fbbf24' : '#ef4444';
  const bodyShadow = isGold ? '#d97706' : '#b91c1c';
  const crown = isGold ? '#f8fafc' : '#facc15';
  const whisker = isGold ? '#ffffff' : '#fbbf24';
  const eye = '#ffffff';

  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Rect x="9" y="3" width="3" height="3" fill={crown} />
      <Rect x="13" y="2" width="3" height="4" fill={crown} />
      <Rect x="17" y="4" width="2" height="3" fill={crown} />

      <Rect x="5" y="7" width="14" height="10" fill={body} />
      <Rect x="4" y="8" width="16" height="8" fill={body} />
      <Rect x="7" y="17" width="10" height="2" fill={bodyShadow} />

      <Rect x="6" y="8" width="5" height="5" fill={eye} />
      <Rect x="8" y="9" width="3" height="3" fill="#0f172a" />
      <Rect x="8" y="9" width="1" height="1" fill="#ffffff" />

      <Rect x="3" y="11" width="2" height="3" fill="#f43f5e" />
      <Rect x="4" y="12" width="1" height="2" fill="#881337" />

      <Rect x="7" y="13" width="2" height="2" fill={whisker} />
      <Rect x="5" y="15" width="3" height="2" fill={whisker} />
      <Rect x="3" y="17" width="3" height="2" fill={whisker} />
      <Rect x="2" y="19" width="2" height="3" fill={whisker} />

      <Rect x="12" y="10" width="3" height="3" fill="#ffffff" />
      <Rect x="13" y="11" width="1" height="1" fill={bodyShadow} />

      <Rect x="19" y="9" width="3" height="6" fill={crown} />
      <Rect x="21" y="8" width="2" height="8" fill={crown} />

      {isPlaying && (
        <>
          <Rect x="1" y="7" width="2" height="2" fill="#38bdf8" />
          <Rect x="21" y="18" width="2" height="2" fill="#38bdf8" />
          <Rect x="18" y="21" width="2" height="2" fill="#38bdf8" />
        </>
      )}
    </Svg>
  );
}

// 4. Capibara Zen
function PixelCapybara({ variant, isPlaying, size }: { variant: string; isPlaying: boolean; size: number }) {
  const main = variant === 'zen' ? '#b45309' : '#92400e';
  const shadow = variant === 'zen' ? '#854d0e' : '#78350f';
  const snout = '#451a03';
  const orange = '#ea580c';
  const leaf = '#22c55e';

  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Rect x="10" y="3" width="4" height="3" fill={orange} />
      <Rect x="11" y="2" width="2" height="1" fill={leaf} />

      <Rect x="6" y="6" width="12" height="8" fill={main} />
      <Rect x="5" y="7" width="14" height="6" fill={main} />

      <Rect x="15" y="6" width="3" height="2" fill={shadow} />

      <Rect x="8" y="9" width="3" height="1" fill="#0f172a" />
      <Rect x="9" y="10" width="1" height="1" fill="#0f172a" />

      <Rect x="5" y="10" width="4" height="4" fill={snout} />
      <Rect x="6" y="11" width="2" height="1" fill="#0f172a" />

      <Rect x="8" y="12" width="12" height="9" fill={main} />
      <Rect x="9" y="13" width="10" height="7" fill={shadow} />

      <Rect x="8" y="21" width="3" height="2" fill={snout} />
      <Rect x="15" y="21" width="3" height="2" fill={snout} />

      {isPlaying && (
        <>
          <Rect x="15" y="2" width="1" height="2" fill="#94a3b8" opacity={0.6} />
          <Rect x="17" y="1" width="1" height="2" fill="#94a3b8" opacity={0.4} />
        </>
      )}
    </Svg>
  );
}

// 5. Fantasmita 8-Bit Boo
function PixelGhost({ variant, isPlaying, size }: { variant: string; isPlaying: boolean; size: number }) {
  const isNeon = variant === 'neon';
  const body = isNeon ? '#c084fc' : '#e0f2fe';
  const shadow = isNeon ? '#7e22ce' : '#38bdf8';
  const blush = '#f472b6';

  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Rect x="5" y="5" width="14" height="2" fill="#0f172a" />
      <Rect x="4" y="6" width="2" height="5" fill="#f43f5e" />
      <Rect x="18" y="6" width="2" height="5" fill="#f43f5e" />

      <Rect x="6" y="6" width="12" height="13" fill={body} />
      <Rect x="5" y="7" width="14" height="11" fill={body} />

      {isPlaying ? (
        <>
          <Rect x="8" y="10" width="3" height="1" fill="#0f172a" />
          <Rect x="13" y="10" width="3" height="1" fill="#0f172a" />
        </>
      ) : (
        <>
          <Rect x="8" y="9" width="2" height="3" fill="#0f172a" />
          <Rect x="9" y="9" width="1" height="1" fill="#ffffff" />
          <Rect x="14" y="9" width="2" height="3" fill="#0f172a" />
          <Rect x="15" y="9" width="1" height="1" fill="#ffffff" />
        </>
      )}

      <Rect x="6" y="12" width="2" height="1" fill={blush} />
      <Rect x="16" y="12" width="2" height="1" fill={blush} />

      <Rect x="11" y="12" width="2" height="1" fill="#0f172a" />

      <Rect x="5" y="18" width="3" height="3" fill={shadow} />
      <Rect x="9" y="17" width="2" height="3" fill={shadow} />
      <Rect x="13" y="18" width="2" height="3" fill={shadow} />
      <Rect x="16" y="17" width="3" height="3" fill={shadow} />
    </Svg>
  );
}

// 6. Dragoncito Chibi
function PixelDragon({ variant, isPlaying, size }: { variant: string; isPlaying: boolean; size: number }) {
  const isAstral = variant === 'astral';
  const body = isAstral ? '#818cf8' : '#e11d48';
  const shadow = isAstral ? '#4338ca' : '#9f1239';
  const belly = isAstral ? '#c7d2fe' : '#fecdd3';
  const horn = '#facc15';

  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Rect x="6" y="3" width="2" height="3" fill={horn} />
      <Rect x="16" y="3" width="2" height="3" fill={horn} />

      <Rect x="6" y="6" width="12" height="7" fill={body} />
      <Rect x="5" y="7" width="14" height="5" fill={body} />

      <Rect x="7" y="8" width="3" height="3" fill={horn} />
      <Rect x="8" y="8" width="1" height="3" fill="#0f172a" />
      <Rect x="14" y="8" width="3" height="3" fill={horn} />
      <Rect x="15" y="8" width="1" height="3" fill="#0f172a" />

      <Rect x="3" y="11" width="3" height="4" fill={shadow} />
      <Rect x="18" y="11" width="3" height="4" fill={shadow} />

      <Rect x="7" y="13" width="10" height="8" fill={body} />
      <Rect x="9" y="14" width="6" height="5" fill={belly} />

      <Rect x="7" y="21" width="3" height="2" fill={shadow} />
      <Rect x="14" y="21" width="3" height="2" fill={shadow} />

      {isPlaying && (
        <>
          <Rect x="11" y="11" width="2" height="2" fill="#f97316" />
          <Rect x="12" y="10" width="1" height="1" fill="#facc15" />
        </>
      )}
    </Svg>
  );
}

// 7. Ajolote Mágico Pixel Art
function PixelAxolotl({ variant, isPlaying, size }: { variant: string; isPlaying: boolean; size: number }) {
  let body = '#f472b6';
  let gills = '#fb7185';
  let belly = '#fbcfe8';
  let eyes = '#0f172a';
  let sparkles = '#ffffff';

  if (variant === 'neon_cyan') {
    body = '#06b6d4';
    gills = '#22d3ee';
    belly = '#a5f3fc';
    eyes = '#083344';
    sparkles = '#cffafe';
  } else if (variant === 'abyssal') {
    body = '#4c1d95';
    gills = '#eab308';
    belly = '#7c3aed';
    eyes = '#facc15';
    sparkles = '#fde047';
  }

  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Rect x="2" y="6" width="3" height="2" fill={gills} />
      <Rect x="1" y="8" width="4" height="2" fill={gills} />
      <Rect x="2" y="10" width="3" height="2" fill={gills} />

      <Rect x="19" y="6" width="3" height="2" fill={gills} />
      <Rect x="19" y="8" width="4" height="2" fill={gills} />
      <Rect x="19" y="10" width="3" height="2" fill={gills} />

      <Rect x="5" y="7" width="14" height="7" fill={body} />
      <Rect x="6" y="6" width="12" height="9" fill={body} />

      {isPlaying ? (
        <>
          <Rect x="7" y="9" width="3" height="1" fill={eyes} />
          <Rect x="14" y="9" width="3" height="1" fill={eyes} />
        </>
      ) : (
        <>
          <Rect x="7" y="9" width="2" height="2" fill={eyes} />
          <Rect x="8" y="9" width="1" height="1" fill={sparkles} />
          <Rect x="15" y="9" width="2" height="2" fill={eyes} />
          <Rect x="16" y="9" width="1" height="1" fill={sparkles} />
        </>
      )}
      <Rect x="6" y="11" width="2" height="1" fill={gills} />
      <Rect x="16" y="11" width="2" height="1" fill={gills} />

      <Rect x="10" y="11" width="4" height="1" fill={eyes} />
      <Rect x="11" y="12" width="2" height="1" fill={eyes} />

      <Rect x="7" y="14" width="10" height="6" fill={body} />
      <Rect x="9" y="14" width="6" height="5" fill={belly} />

      <Rect x="5" y="17" width="2" height="3" fill={body} />
      <Rect x="17" y="17" width="2" height="3" fill={body} />

      <Rect x="11" y="20" width="2" height="3" fill={gills} opacity={0.9} />
      <Rect x="10" y="21" width="4" height="2" fill={gills} opacity={0.75} />

      {isPlaying && (
        <>
          <Rect x="3" y="3" width="1" height="1" fill={sparkles} />
          <Rect x="20" y="4" width="2" height="2" fill={gills} />
          <Rect x="2" y="14" width="1" height="1" fill={gills} />
        </>
      )}
    </Svg>
  );
}

// 8. Ranita Lo-Fi Pixel Art
function PixelFrog({ variant, isPlaying, size }: { variant: string; isPlaying: boolean; size: number }) {
  let body = '#10b981';
  let shadow = '#059669';
  let belly = '#a7f3d0';
  let eyes = '#0f172a';
  let leaf = '#22c55e';

  if (variant === 'poison_dart') {
    body = '#3b82f6';
    shadow = '#1d4ed8';
    belly = '#1e293b';
    eyes = '#facc15';
    leaf = '#06b6d4';
  } else if (variant === 'golden_frog') {
    body = '#fbbf24';
    shadow = '#d97706';
    belly = '#fef08a';
    eyes = '#0f172a';
    leaf = '#f59e0b';
  }

  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Rect x="11" y="2" width="2" height="3" fill={leaf} />
      <Rect x="10" y="3" width="4" height="2" fill={leaf} />

      <Rect x="5" y="5" width="4" height="4" fill={body} />
      <Rect x="15" y="5" width="4" height="4" fill={body} />
      <Rect x="6" y="6" width="2" height="2" fill={eyes} />
      <Rect x="7" y="6" width="1" height="1" fill="#ffffff" />
      <Rect x="16" y="6" width="2" height="2" fill={eyes} />
      <Rect x="17" y="6" width="1" height="1" fill="#ffffff" />

      <Rect x="4" y="8" width="16" height="6" fill={body} />
      <Rect x="5" y="9" width="14" height="5" fill={body} />

      {isPlaying ? (
        <>
          <Rect x="8" y="11" width="8" height="2" fill="#0f172a" />
          <Rect x="9" y="12" width="6" height="2" fill="#f43f5e" />
        </>
      ) : (
        <Rect x="8" y="11" width="8" height="1" fill="#064e3b" />
      )}

      <Rect x="5" y="11" width="2" height="1" fill="#f472b6" />
      <Rect x="17" y="11" width="2" height="1" fill="#f472b6" />

      <Rect x="6" y="14" width="12" height="6" fill={body} />
      <Rect x="8" y="14" width="8" height="5" fill={belly} />

      <Rect x="3" y="16" width="3" height="4" fill={shadow} />
      <Rect x="18" y="16" width="3" height="4" fill={shadow} />
      <Rect x="2" y="20" width="4" height="2" fill={body} />
      <Rect x="18" y="20" width="4" height="2" fill={body} />

      <Rect x="8" y="19" width="2" height="3" fill={body} />
      <Rect x="14" y="19" width="2" height="3" fill={body} />
    </Svg>
  );
}

// 9. Pingüinito DJ Pixel Art
function PixelPenguin({ variant, isPlaying, size }: { variant: string; isPlaying: boolean; size: number }) {
  let coat = '#0f172a';
  let belly = '#ffffff';
  let beak = '#f97316';
  let phoneArch = '#6366f1';
  let phoneCushion = '#f43f5e';
  let eye = '#0f172a';

  if (variant === 'gentoo') {
    coat = '#1e293b';
    belly = '#fef3c7';
    beak = '#eab308';
    phoneArch = '#ffd700';
    phoneCushion = '#f59e0b';
  } else if (variant === 'cyber_penguin') {
    coat = '#0284c7';
    belly = '#e0f2fe';
    beak = '#00f0ff';
    phoneArch = '#38bdf8';
    phoneCushion = '#a855f7';
    eye = '#00f0ff';
  }

  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Rect x="7" y="3" width="10" height="2" fill={phoneArch} />
      <Rect x="4" y="5" width="3" height="5" fill={phoneCushion} />
      <Rect x="17" y="5" width="3" height="5" fill={phoneCushion} />

      <Rect x="6" y="5" width="12" height="8" fill={coat} />
      <Rect x="7" y="6" width="10" height="7" fill={coat} />

      {isPlaying ? (
        <>
          <Rect x="8" y="7" width="2" height="1" fill={eye} />
          <Rect x="14" y="7" width="2" height="1" fill={eye} />
        </>
      ) : (
        <>
          <Rect x="8" y="7" width="2" height="2" fill="#ffffff" />
          <Rect x="9" y="7" width="1" height="2" fill={eye} />
          <Rect x="14" y="7" width="2" height="2" fill="#ffffff" />
          <Rect x="14" y="7" width="1" height="2" fill={eye} />
        </>
      )}

      <Rect x="11" y="9" width="2" height="2" fill={beak} />
      <Rect x="10" y="10" width="4" height="1" fill={beak} />

      <Rect x="6" y="13" width="12" height="8" fill={coat} />
      <Rect x="8" y="13" width="8" height="7" fill={belly} />

      {isPlaying ? (
        <>
          <Rect x="3" y="12" width="3" height="4" fill={coat} />
          <Rect x="18" y="12" width="3" height="4" fill={coat} />
        </>
      ) : (
        <>
          <Rect x="4" y="14" width="2" height="5" fill={coat} />
          <Rect x="18" y="14" width="2" height="5" fill={coat} />
        </>
      )}

      <Rect x="8" y="21" width="3" height="2" fill={beak} />
      <Rect x="13" y="21" width="3" height="2" fill={beak} />
    </Svg>
  );
}

// 10. Zorrito Kitsune Pixel Art
function PixelFox({ variant, isPlaying, size }: { variant: string; isPlaying: boolean; size: number }) {
  let main = '#f97316';
  let shadow = '#ea580c';
  let white = '#ffffff';
  let eye = '#10b981';
  let nose = '#18181b';

  if (variant === 'arctic') {
    main = '#f1f5f9';
    shadow = '#cbd5e1';
    white = '#ffffff';
    eye = '#0284c7';
    nose = '#0f172a';
  } else if (variant === 'spirit') {
    main = '#c084fc';
    shadow = '#9333ea';
    white = '#f3e8ff';
    eye = '#facc15';
    nose = '#581c87';
  }

  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Rect x="4" y="3" width="4" height="4" fill={shadow} />
      <Rect x="5" y="4" width="2" height="2" fill={white} />
      <Rect x="16" y="3" width="4" height="4" fill={shadow} />
      <Rect x="17" y="4" width="2" height="2" fill={white} />

      <Rect x="5" y="7" width="14" height="6" fill={main} />
      <Rect x="4" y="8" width="16" height="5" fill={main} />

      <Rect x="4" y="10" width="3" height="3" fill={white} />
      <Rect x="17" y="10" width="3" height="3" fill={white} />

      {isPlaying ? (
        <>
          <Rect x="7" y="9" width="3" height="1" fill="#0f172a" />
          <Rect x="14" y="9" width="3" height="1" fill="#0f172a" />
        </>
      ) : (
        <>
          <Rect x="7" y="8" width="2" height="2" fill={eye} />
          <Rect x="8" y="8" width="1" height="1" fill="#ffffff" />
          <Rect x="15" y="8" width="2" height="2" fill={eye} />
          <Rect x="16" y="8" width="1" height="1" fill="#ffffff" />
        </>
      )}

      <Rect x="11" y="11" width="2" height="2" fill={nose} />
      <Rect x="10" y="12" width="4" height="2" fill={white} />

      <Rect x="7" y="13" width="10" height="8" fill={main} />
      <Rect x="9" y="14" width="6" height="5" fill={white} />

      <Rect x="7" y="21" width="3" height="2" fill={shadow} />
      <Rect x="14" y="21" width="3" height="2" fill={shadow} />

      <Rect x="17" y="14" width="4" height="4" fill={main} />
      <Rect x="19" y="12" width="3" height="4" fill={main} />
      <Rect x="20" y="10" width="3" height="3" fill={white} />
    </Svg>
  );
}

// 11. CyberBot 808 Pixel Art
function PixelRobot({ variant, isPlaying, size }: { variant: string; isPlaying: boolean; size: number }) {
  let body = '#64748b';
  let screen = '#0f172a';
  let matrix = '#38bdf8';
  let accent = '#f43f5e';
  let bolts = '#94a3b8';

  if (variant === 'neon_matrix') {
    body = '#1e293b';
    screen = '#022c22';
    matrix = '#22c55e';
    accent = '#10b981';
    bolts = '#334155';
  } else if (variant === 'golden_mech') {
    body = '#eab308';
    screen = '#451a03';
    matrix = '#fef08a';
    accent = '#f97316';
    bolts = '#fef08a';
  }

  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Rect x="11" y="2" width="2" height="3" fill={bolts} />
      <Rect x="10" y="1" width="4" height="2" fill={isPlaying ? accent : '#94a3b8'} />

      <Rect x="5" y="5" width="14" height="8" fill={body} />
      <Rect x="6" y="6" width="12" height="6" fill={screen} />

      {isPlaying ? (
        <>
          <Rect x="8" y="8" width="3" height="1" fill={matrix} />
          <Rect x="8" y="7" width="1" height="1" fill={matrix} />
          <Rect x="10" y="7" width="1" height="1" fill={matrix} />
          <Rect x="13" y="8" width="3" height="1" fill={matrix} />
          <Rect x="13" y="7" width="1" height="1" fill={matrix} />
          <Rect x="15" y="7" width="1" height="1" fill={matrix} />
          <Rect x="10" y="10" width="4" height="1" fill={matrix} />
        </>
      ) : (
        <>
          <Rect x="8" y="8" width="2" height="2" fill={matrix} />
          <Rect x="14" y="8" width="2" height="2" fill={matrix} />
          <Rect x="10" y="10" width="4" height="1" fill={matrix} />
        </>
      )}

      <Rect x="4" y="8" width="1" height="2" fill={bolts} />
      <Rect x="19" y="8" width="1" height="2" fill={bolts} />

      <Rect x="10" y="13" width="4" height="1" fill={bolts} />

      <Rect x="6" y="14" width="12" height="7" fill={body} />

      <Rect x="8" y="16" width="2" height="3" fill={isPlaying ? accent : bolts} />
      <Rect x="11" y="15" width="2" height="4" fill={isPlaying ? matrix : bolts} />
      <Rect x="14" y="17" width="2" height="2" fill={isPlaying ? accent : bolts} />

      <Rect x="6" y="21" width="4" height="2" fill={bolts} />
      <Rect x="14" y="21" width="4" height="2" fill={bolts} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pressable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  petInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogueBubble: {
    position: 'absolute',
    top: -28,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 6,
  },
  dialogueText: {
    color: '#f8fafc',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  dialogueArrow: {
    position: 'absolute',
    bottom: -4,
    width: 6,
    height: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    transform: [{ rotate: '45deg' }],
  },
  heartParticle: {
    position: 'absolute',
    top: -6,
    color: '#f43f5e',
    fontSize: 12,
    fontWeight: '900',
    zIndex: 15,
  },
  musicNote: {
    position: 'absolute',
    top: -8,
    right: -4,
    color: '#00E5FF',
    fontSize: 13,
    fontWeight: '900',
    zIndex: 15,
  },
  sleepSnore: {
    position: 'absolute',
    top: -12,
    right: -6,
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    zIndex: 15,
  },
});
