import { useSettingsStore } from '../store/settings.store';

export type Language = 'es' | 'en';

export const translations = {
  es: {
    // Navigation / Header
    'nav.lyrics': 'Letras',
    'nav.collection': 'Colección',
    'nav.search': 'Buscar',
    'nav.settings': 'Ajustes',
    'nav.community': 'Comunidad',
    'nav.jam': 'Jam',
    'nav.equalizer': 'Ecualizador',
    'nav.history': 'Historial',
    'nav.logout': 'Cerrar sesión',
    'nav.fullscreen': 'Pantalla completa',

    // Player
    'player.nowPlaying': 'Ahora suena',
    'player.noTrack': 'Sin canción',
    'player.selectTrack': 'Selecciona una canción para comenzar',
    'player.play': 'Reproducir',
    'player.pause': 'Pausar',
    'player.next': 'Siguiente',
    'player.prev': 'Anterior',
    'player.shuffle': 'Aleatorio',
    'player.repeat': 'Repetir',
    'player.mute': 'Silenciar',
    'player.unmute': 'Activar sonido',
    'player.like': 'Me gusta',
    'player.unlike': 'Quitar de favoritos',

    // Settings
    'settings.title': 'Ajustes de JodiFy',
    'settings.tabs.general': 'General',
    'settings.tabs.audio': 'Audio & DSP',
    'settings.tabs.visual': 'Apariencia',
    'settings.tabs.obs': 'Overlay OBS',
    'settings.tabs.storage': 'Almacenamiento',
    'settings.tabs.account': 'Cuenta',

    'settings.lang': 'Idioma de la aplicación',
    'settings.lang.desc': 'Elige el idioma de visualización de la interfaz',
    'settings.theme': 'Tema visual',
    'settings.theme.dark': 'Oscuro (Studio Pro)',
    'settings.theme.light': 'Claro',
    'settings.focus': 'Modo concentración',
    'settings.focus.desc': 'Oculta elementos secundarios para una experiencia inmersiva',

    'settings.audio.crossfade': 'Fundido suave entre canciones',
    'settings.audio.crossfade.desc': 'Transición gradual sin silencios entre pistas',
    'settings.audio.duration': 'Duración del fundido',
    'settings.audio.norm': 'Normalización inteligente de volumen',
    'settings.audio.norm.desc': 'Evita saltos bruscos de volumen entre diferentes pistas',
    'settings.audio.quality': 'Calidad de reproducción',
    'settings.audio.quality.lossless': 'Master (Hi-Res Lossless)',
    'settings.audio.quality.high': 'Alta fidelidad (320 kbps)',
    'settings.audio.quality.auto': 'Automático',

    'settings.visual.dynamicBg': 'Fondo dinámico y auroras vivas',
    'settings.visual.dynamicBg.desc': 'Genera iluminación ambiental fluida según la portada del tema actual',
    'settings.visual.noise': 'Grano analógico cinematográfico',
    'settings.visual.noise.desc': 'Añade sutil micro-textura que erradica el banding en gradientes',
    'settings.visual.intensity': 'Intensidad de iluminación ambiental',
    'settings.visual.visualizer': 'Espectrograma en vivo en la barra',
    'settings.visual.visualizer.desc': 'Visualizador de barras en la isla de control',

    'settings.obs.title': 'Overlay para transmisiones (OBS Studio / Twitch)',
    'settings.obs.desc': 'Integra un widget transparente y animado en tu software de stream',
    'settings.obs.theme': 'Estilo del widget overlay',
    'settings.obs.theme.default': 'Estudio Glassmorphism',
    'settings.obs.theme.neon': 'Neón Cyberpunk',
    'settings.obs.theme.minimal': 'Mini Cápsula Flotante',
    'settings.obs.url': 'URL del Navegador OBS',
    'settings.obs.copy': 'Copiar URL',
    'settings.obs.open': 'Probar en navegador',

    'settings.storage.title': 'Caché de canciones y modo sin conexión',
    'settings.storage.desc': 'Gestiona tus canciones guardadas en el dispositivo',
    'settings.storage.songs': 'canciones',
    'settings.storage.clear': 'Liberar espacio de caché',
    'settings.storage.confirm': '¿Confirmar borrado?',
    'settings.storage.cleared': 'Caché de canciones liberada con éxito',

    'settings.account.title': 'Sesión activa',
    'settings.account.user': 'Usuario actual',
    'settings.account.role': 'Rango de acceso',
    'settings.account.switch': 'Cambiar de cuenta',
    'settings.account.logout': 'Cerrar sesión',
  },
  en: {
    // Navigation / Header
    'nav.lyrics': 'Lyrics',
    'nav.collection': 'Collection',
    'nav.search': 'Search',
    'nav.settings': 'Settings',
    'nav.community': 'Community',
    'nav.jam': 'Jam',
    'nav.equalizer': 'Equalizer',
    'nav.history': 'History',
    'nav.logout': 'Sign out',
    'nav.fullscreen': 'Fullscreen',

    // Player
    'player.nowPlaying': 'Now Playing',
    'player.noTrack': 'No song selected',
    'player.selectTrack': 'Pick a track to get started',
    'player.play': 'Play',
    'player.pause': 'Pause',
    'player.next': 'Next',
    'player.prev': 'Previous',
    'player.shuffle': 'Shuffle',
    'player.repeat': 'Repeat',
    'player.mute': 'Mute',
    'player.unmute': 'Unmute',
    'player.like': 'Favorite',
    'player.unlike': 'Remove favorite',

    // Settings
    'settings.title': 'JodiFy Settings',
    'settings.tabs.general': 'General',
    'settings.tabs.audio': 'Audio & DSP',
    'settings.tabs.visual': 'Appearance',
    'settings.tabs.obs': 'OBS Overlay',
    'settings.tabs.storage': 'Storage',
    'settings.tabs.account': 'Account',

    'settings.lang': 'Application Language',
    'settings.lang.desc': 'Select your preferred interface display language',
    'settings.theme': 'Appearance Theme',
    'settings.theme.dark': 'Dark (Studio Pro)',
    'settings.theme.light': 'Light',
    'settings.focus': 'Focus Mode',
    'settings.focus.desc': 'Hides secondary elements for a pure listening experience',

    'settings.audio.crossfade': 'Smooth Track Crossfade',
    'settings.audio.crossfade.desc': 'Seamless transition without silences between tracks',
    'settings.audio.duration': 'Crossfade Duration',
    'settings.audio.norm': 'Smart Volume Normalization',
    'settings.audio.norm.desc': 'Prevents jarring volume jumps between different songs',
    'settings.audio.quality': 'Playback Quality',
    'settings.audio.quality.lossless': 'Master (Hi-Res Lossless)',
    'settings.audio.quality.high': 'High Fidelity (320 kbps)',
    'settings.audio.quality.auto': 'Automatic',

    'settings.visual.dynamicBg': 'Dynamic Background & Aurora',
    'settings.visual.dynamicBg.desc': 'Generates living fluid ambient lighting matching current cover art',
    'settings.visual.noise': 'Cinematic Analog Grain',
    'settings.visual.noise.desc': 'Adds subtle micro-texture that eliminates gradient color banding',
    'settings.visual.intensity': 'Ambient Lighting Intensity',
    'settings.visual.visualizer': 'Live Island Spectrogram',
    'settings.visual.visualizer.desc': 'Audio frequency bars on the player dock',

    'settings.obs.title': 'Live Stream Overlay (OBS Studio / Twitch)',
    'settings.obs.desc': 'Integrate a transparent, animated now-playing widget into your stream',
    'settings.obs.theme': 'Overlay Widget Theme',
    'settings.obs.theme.default': 'Studio Glassmorphism',
    'settings.obs.theme.neon': 'Neon Cyberpunk',
    'settings.obs.theme.minimal': 'Mini Floating Capsule',
    'settings.obs.url': 'OBS Browser Source URL',
    'settings.obs.copy': 'Copy URL',
    'settings.obs.open': 'Test in Browser',

    'settings.storage.title': 'Song Cache & Offline Storage',
    'settings.storage.desc': 'Manage your locally stored audio tracks',
    'settings.storage.songs': 'songs',
    'settings.storage.clear': 'Clear Cached Audio',
    'settings.storage.confirm': 'Confirm Clear?',
    'settings.storage.cleared': 'Offline cache cleared successfully',

    'settings.account.title': 'Active Session',
    'settings.account.user': 'Current User',
    'settings.account.role': 'Access Role',
    'settings.account.switch': 'Switch Account',
    'settings.account.logout': 'Sign Out',
  },
} as const;

export type TranslationKey = keyof typeof translations.es;

export function t(key: TranslationKey, lang: Language = 'es'): string {
  const dict = translations[lang] || translations.es;
  return (dict as Record<string, string>)[key] || (translations.es as Record<string, string>)[key] || key;
}

export function useT() {
  const lang = (useSettingsStore((s) => s.language) || 'es') as Language;
  return (key: TranslationKey) => t(key, lang);
}
