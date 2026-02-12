export interface DesktopHomeContent {
    brand: {
        name: string;
        tagline: string;
        status: string;
    };
    nowPlayingLabel: string;
    quickActions: string[];
    recommendation: {
        title: string;
        subtitle: string;
        cta: string;
    };
    player: {
        artist: string;
        controls: string[];
    };
}

export const desktopHomeContent: DesktopHomeContent = {
    brand: {
        name: 'JodiFy',
        tagline: 'Tu música, tu ritmo',
        status: 'En línea'
    },
    nowPlayingLabel: 'Reproduciendo ahora',
    quickActions: ['Biblioteca', 'Favoritos', 'Playlists', 'Descubrir'],
    recommendation: {
        title: 'Mix Diario',
        subtitle: 'Nueva música basada en tus gustos',
        cta: 'Escuchar'
    },
    player: {
        artist: 'JodiFy Studio',
        controls: ['⏮', '⏯', '⏭']
    }
};
