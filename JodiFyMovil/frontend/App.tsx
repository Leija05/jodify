import React from 'react';
import { SafeAreaView, StyleSheet, Text, View, ScrollView, StatusBar } from 'react-native';

const BRAND = {
  name: 'JodiFy',
  tagline: 'Free Music For Friends',
  status: 'v2.0',
};

const TRACKS = [
  { id: '1', name: 'Bienvenido a JodiFy', artist: 'JodiFy' },
  { id: '2', name: 'Tu primera canción', artist: 'JodiFy' },
];

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.logo}>{BRAND.name}</Text>
          <Text style={styles.tagline}>{BRAND.tagline}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{BRAND.status}</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.coverArt}>
            <Text style={styles.coverText}>JF</Text>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroTitle}>{TRACKS[0].name}</Text>
            <Text style={styles.heroArtist}>{TRACKS[0].artist}</Text>
            <Text style={styles.heroHint}>Conecta la app de escritorio o la web para controlar la música en tu teléfono.</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Cola</Text>
        {TRACKS.map((t) => (
          <View key={t.id} style={styles.row}>
            <Text style={styles.rowName}>{t.name}</Text>
            <Text style={styles.rowArtist}>{t.artist}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: '#9b5cff',
  },
  tagline: {
    fontSize: 14,
    color: '#b0a8c0',
    marginTop: 2,
  },
  statusBadge: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#232323',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusText: {
    color: '#9b5cff',
    fontSize: 12,
    fontWeight: '700',
  },
  heroCard: {
    margin: 16,
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 14,
  },
  coverArt: {
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: '#9b5cff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
  },
  heroInfo: {
    flex: 1,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  heroArtist: {
    color: '#b0a8c0',
    fontSize: 13,
    marginTop: 2,
  },
  heroHint: {
    color: '#8a8494',
    fontSize: 12,
    marginTop: 8,
    lineHeight: 17,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  row: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
  },
  rowName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rowArtist: {
    color: '#8a8494',
    fontSize: 12,
    marginTop: 2,
  },
});