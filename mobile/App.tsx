import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { playback } from '../src/core/player/playback';
import { queue } from '../src/core/player/queue';
import { time } from '../src/core/utils/time';

const now = time.now();
playback.setVolume(0.5);
queue.add({ id: 'welcome', name: 'Bienvenido a JodiFy Mobile' });

export default function App() {
  const song = queue.current();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>JodiFy</Text>
          <Text style={styles.tagline}>Tu música, tu ritmo</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>En línea</Text>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.coverArt}>
          <Text style={styles.coverText}>JF</Text>
        </View>
        <View style={styles.heroInfo}>
          <Text style={styles.heroLabel}>Reproduciendo ahora</Text>
          <Text style={styles.heroTitle}>{song?.name ?? 'Sin canción'}</Text>
          <Text style={styles.heroMeta}>Volumen: {Math.round(playback.state.volume * 100)}%</Text>
          <Text style={styles.heroMeta}>Sesión: {new Date(now).toLocaleTimeString()}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accesos rápidos</Text>
        <View style={styles.quickGrid}>
          {['Biblioteca', 'Favoritos', 'Playlists', 'Descubrir'].map((label) => (
            <View key={label} style={styles.quickCard}>
              <Text style={styles.quickLabel}>{label}</Text>
              <Text style={styles.quickMeta}>Abrir</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Para ti</Text>
        <View style={styles.recommendCard}>
          <Text style={styles.recommendTitle}>Mix Diario</Text>
          <Text style={styles.recommendSubtitle}>Nueva música basada en tus gustos</Text>
          <View style={styles.recommendPill}>
            <Text style={styles.recommendPillText}>Escuchar</Text>
          </View>
        </View>
      </View>

      <View style={styles.playerDock}>
        <View>
          <Text style={styles.playerSong}>{song?.name ?? 'Sin canción'}</Text>
          <Text style={styles.playerArtist}>JodiFy Studio</Text>
        </View>
        <View style={styles.playerControls}>
          <Text style={styles.playerButton}>⏮</Text>
          <Text style={styles.playerButton}>⏯</Text>
          <Text style={styles.playerButton}>⏭</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f12',
    paddingHorizontal: 20,
    paddingTop: 12
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  logo: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800'
  },
  tagline: {
    color: '#8c8f98',
    marginTop: 4
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#1f2a20'
  },
  statusText: {
    color: '#8cf39a',
    fontWeight: '600',
    fontSize: 12
  },
  heroCard: {
    backgroundColor: '#1a1a20',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24
  },
  coverArt: {
    width: 88,
    height: 88,
    borderRadius: 20,
    backgroundColor: '#2c2c35',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16
  },
  coverText: {
    color: '#f4f4f6',
    fontWeight: '800',
    fontSize: 24
  },
  heroInfo: {
    flex: 1
  },
  heroLabel: {
    color: '#8c8f98',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginVertical: 6
  },
  heroMeta: {
    color: '#c8c8d0',
    fontSize: 13,
    marginTop: 2
  },
  section: {
    marginBottom: 22
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  quickCard: {
    flexBasis: '47%',
    backgroundColor: '#1b1b22',
    padding: 16,
    borderRadius: 16
  },
  quickLabel: {
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 6
  },
  quickMeta: {
    color: '#8c8f98',
    fontSize: 12
  },
  recommendCard: {
    backgroundColor: '#242433',
    padding: 18,
    borderRadius: 20
  },
  recommendTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700'
  },
  recommendSubtitle: {
    color: '#b0b3bd',
    marginTop: 6,
    marginBottom: 14
  },
  recommendPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#5b5bff'
  },
  recommendPillText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12
  },
  playerDock: {
    backgroundColor: '#1a1a20',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 20
  },
  playerSong: {
    color: '#ffffff',
    fontWeight: '700'
  },
  playerArtist: {
    color: '#8c8f98',
    marginTop: 4,
    fontSize: 12
  },
  playerControls: {
    flexDirection: 'row',
    gap: 10
  },
  playerButton: {
    color: '#ffffff',
    fontSize: 18
  }
});
