export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'audio' | 'social' | 'pet' | 'library';
  xpReward: number;
  badge: string;
}

export const ACHIEVEMENTS_LIST: Achievement[] = [
  {
    id: 'night_owl',
    title: 'Búho Noctámbulo',
    description: 'Escuchar música en plena madrugada entre las 2:00 AM y las 5:00 AM',
    category: 'audio',
    xpReward: 150,
    badge: 'Nocturno',
  },
  {
    id: 'sound_marathon',
    title: 'Maratón Sonora',
    description: 'Completar 1 hora de escucha continua en una sola sesión',
    category: 'audio',
    xpReward: 250,
    badge: 'Resistencia',
  },
  {
    id: 'offline_vault',
    title: 'Bóveda Offline',
    description: 'Tener al menos 5 canciones descargadas en tu almacenamiento local',
    category: 'library',
    xpReward: 200,
    badge: 'Coleccionista',
  },
  {
    id: 'pet_devotion',
    title: 'Amor de Mascota',
    description: 'Alimentar o acariciar a tu compañero pixel 15 veces',
    category: 'pet',
    xpReward: 200,
    badge: 'Entrenador',
  },
  {
    id: 'audio_audiophile',
    title: 'Oído Absoluto',
    description: 'Personalizar el ecualizador de 10 bandas o activar la normalización de volumen',
    category: 'audio',
    xpReward: 150,
    badge: 'Hi-Fi Pro',
  },
  {
    id: 'karaoke_hero',
    title: 'Estrella de Karaoke',
    description: 'Disfrutar de las letras a pantalla completa en modo Karaoke Sing',
    category: 'audio',
    xpReward: 150,
    badge: 'Vocalista',
  },
  {
    id: 'music_explorer',
    title: 'Explorador Musical',
    description: 'Importar o reproducir música desde un enlace externo (YouTube/Spotify)',
    category: 'library',
    xpReward: 200,
    badge: 'Descubridor',
  },
  {
    id: 'jam_comrade',
    title: 'Espíritu de Jam',
    description: 'Unirte o compartir música en una sesión Jam comunitaria',
    category: 'social',
    xpReward: 250,
    badge: 'Comunitario',
  },
];
