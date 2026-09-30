import { usePlayerStore } from '../store/player.store';
import { clamp } from '../lib/utils';

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: any;
  }
}

class YouTubePlayerService {
  private player: any = null;
  private isReady = false;
  private currentVideoId: string | null = null;
  private pendingVideoId: string | null = null;
  private timer: number | null = null;
  private initPromise: Promise<void> | null = null;

  public init(): Promise<void> {
    if (this.isReady && this.player) return Promise.resolve();
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve();
        return;
      }

      if (window.YT && window.YT.Player) {
        this.createPlayer(resolve);
        return;
      }

      const existingTag = document.getElementById('yt-iframe-api');
      if (!existingTag) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }

      // Polling de seguridad por si window.YT se inicializa sin disparar el callback
      const pollTimer = window.setInterval(() => {
        if (window.YT && window.YT.Player) {
          window.clearInterval(pollTimer);
          this.createPlayer(resolve);
        }
      }, 100);

      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        window.clearInterval(pollTimer);
        if (prevCallback) prevCallback();
        this.createPlayer(resolve);
      };
    });

    return this.initPromise;
  }

  private createPlayer(onReadyCallback?: () => void) {
    if (this.player && this.isReady) {
      if (onReadyCallback) onReadyCallback();
      return;
    }

    let container = document.getElementById('jodify-yt-player-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'jodify-yt-player-container';
      container.style.position = 'fixed';
      container.style.bottom = '0px';
      container.style.right = '0px';
      container.style.width = '200px';
      container.style.height = '200px';
      container.style.opacity = '0.01';
      container.style.pointerEvents = 'none';
      container.style.zIndex = '-9999';
      document.body.appendChild(container);
    }

    let playerDiv = document.getElementById('jodify-yt-player');
    if (!playerDiv) {
      playerDiv = document.createElement('div');
      playerDiv.id = 'jodify-yt-player';
      container.appendChild(playerDiv);
    }

    try {
      const origin = typeof window !== 'undefined' && window.location.protocol.startsWith('http')
        ? window.location.origin
        : undefined;

      this.player = new window.YT.Player('jodify-yt-player', {
        height: '200',
        width: '200',
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          playsinline: 1,
          rel: 0,
          ...(origin ? { origin } : {}),
        },
        events: {
          onReady: () => {
            console.log('[YT Player Service] onReady recibido con éxito');
            this.isReady = true;
            if (onReadyCallback) onReadyCallback();
            if (this.pendingVideoId) {
              const pending = this.pendingVideoId;
              this.pendingVideoId = null;
              this.executePlayVideo(pending);
            }
          },
          onStateChange: (event: { data: number }) => {
            this.handleStateChange(event.data);
          },
          onError: (err: unknown) => {
            console.warn('[YT Player Service] Error del reproductor YouTube:', err);
          },
        },
      });
    } catch (e) {
      console.warn('[YT Player Service] Error inicializando YT.Player:', e);
      if (onReadyCallback) onReadyCallback();
    }
  }

  private handleStateChange(state: number) {
    const store = usePlayerStore.getState();

    // 1: PLAYING
    if (state === 1) {
      store.setIsPlaying(true);
      this.startProgressTracker();
    }
    // 2: PAUSED
    else if (state === 2) {
      store.setIsPlaying(false);
      this.stopProgressTracker();
    }
    // 0: ENDED
    else if (state === 0) {
      store.setIsPlaying(false);
      this.stopProgressTracker();
      const { repeatMode, isLoop } = store;
      if (repeatMode === 'one' || isLoop) {
        this.seekTo(0);
        this.play();
      } else {
        void store.next();
      }
    }
  }

  private startProgressTracker() {
    this.stopProgressTracker();
    this.timer = window.setInterval(() => {
      if (!this.player || !this.isReady) return;
      try {
        const cur = typeof this.player.getCurrentTime === 'function' ? this.player.getCurrentTime() : 0;
        const dur = typeof this.player.getDuration === 'function' ? this.player.getDuration() : 0;
        const store = usePlayerStore.getState();
        if (Number.isFinite(cur) && cur >= 0) {
          store.setCurrentTime(cur);
        }
        if (Number.isFinite(dur) && dur > 0 && Math.abs(store.duration - dur) > 1) {
          store.setDuration(dur);
        }
      } catch {}
    }, 250);
  }

  private stopProgressTracker() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private executePlayVideo(videoId: string): boolean {
    if (!this.player || !this.isReady) return false;
    this.currentVideoId = videoId;
    const vol = usePlayerStore.getState().volume;
    try {
      if (typeof this.player.setVolume === 'function') {
        this.player.setVolume(Math.round(vol * 100));
      }
      if (typeof this.player.loadVideoById === 'function') {
        this.player.loadVideoById(videoId);
      }
      if (typeof this.player.playVideo === 'function') {
        this.player.playVideo();
      }
      return true;
    } catch (e) {
      console.warn('[YT Player] Error en executePlayVideo:', e);
      return false;
    }
  }

  public async playVideo(videoId: string): Promise<boolean> {
    this.currentVideoId = videoId;
    if (!this.isReady || !this.player) {
      this.pendingVideoId = videoId;
      await this.init();
      if (this.isReady) {
        return this.executePlayVideo(videoId);
      }
      return false;
    }
    return this.executePlayVideo(videoId);
  }

  public play(): void {
    if (this.player && this.isReady && typeof this.player.playVideo === 'function') {
      this.player.playVideo();
    }
  }

  public pause(): void {
    if (this.player && this.isReady && typeof this.player.pauseVideo === 'function') {
      this.player.pauseVideo();
    }
    this.stopProgressTracker();
  }

  public stop(): void {
    if (this.player && this.isReady && typeof this.player.stopVideo === 'function') {
      this.player.stopVideo();
    }
    this.stopProgressTracker();
    this.currentVideoId = null;
  }

  public seekTo(seconds: number): void {
    if (this.player && this.isReady && typeof this.player.seekTo === 'function') {
      this.player.seekTo(seconds, true);
    }
  }

  public setVolume(volume0to100: number): void {
    if (this.player && this.isReady && typeof this.player.setVolume === 'function') {
      this.player.setVolume(clamp(Math.round(volume0to100), 0, 100));
    }
  }

  public isPlayingVideo(videoId?: string): boolean {
    if (!videoId) return Boolean(this.currentVideoId);
    return this.currentVideoId === videoId;
  }
}

export const ytPlayerService = new YouTubePlayerService();
