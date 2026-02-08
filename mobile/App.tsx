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
      <View style={styles.card}>
        <Text style={styles.title}>JodiFy Mobile</Text>
        <Text style={styles.subtitle}>Core compartido conectado</Text>
        <Text style={styles.meta}>Ahora: {song?.name ?? 'Sin canción'}</Text>
        <Text style={styles.meta}>Volumen: {Math.round(playback.state.volume * 100)}%</Text>
        <Text style={styles.meta}>Init: {new Date(now).toLocaleTimeString()}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center'
  },
  card: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#1e1e1e',
    width: '90%'
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8
  },
  subtitle: {
    color: '#9aa0a6',
    marginBottom: 16
  },
  meta: {
    color: '#d0d0d0',
    marginTop: 6
  }
});
