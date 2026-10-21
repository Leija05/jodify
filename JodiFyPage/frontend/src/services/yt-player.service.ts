import { usePlayerStore } from '../store/player.store';
import { useToastStore } from '../store/toast.store';
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
  private isHandlingError = false;

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
      container.className = 'jf-yt-player-container is-idle';

      const isMobileDevice = typeof window !== 'undefined' && (
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        (window.matchMedia && window.matchMedia('(max-width: 768px)').matches)
      );

      if (!isMobileDevice) {
        // En laptop / desktop: mantener exactamente el estilo invisible del preview vercel
        container.style.position = 'fixed';
        container.style.bottom = '0px';
        container.style.right = '0px';
        container.style.width = '200px';
        container.style.height = '200px';
        container.style.overflow = 'hidden';
        container.style.opacity = '0.001';
        container.style.pointerEvents = 'none';
        container.style.zIndex = '-999';
      } else {
        // En móvil: botón flotante para minimizar / expandir
        const closeBtn = document.createElement('button');
        closeBtn.className = 'jf-yt-pip-close';
        closeBtn.type = 'button';
        closeBtn.setAttribute('aria-label', 'Minimizar reproductor');
        closeBtn.innerHTML = '✕';
        closeBtn.onclick = (e) => {
          e.stopPropagation();
          container?.classList.toggle('is-minimized');
        };
        container.appendChild(closeBtn);
      }

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
        height: '100%',
        width: '100%',
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          enablejsapi: 1,
          fs: 0,
          playsinline: 1,
          rel: 0,
          iv_load_policy: 3,
          modestbranding: 1,
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
          onError: (event: any) => {
            const errorCode = typeof event === 'object' && event !== null ? event.data : event;
            console.warn('[YT Player Service] Error del reproductor YouTube:', errorCode);
            void this.handleError(errorCode);
          },
        },
      });
    } catch (e) {
      console.warn('[YT Player Service] Error inicializando YT.Player:', e);
      if (onReadyCallback) onReadyCallback();
    }
  }

  private async handleError(code: any) {
    if (this.isHandlingError) return;
    this.isHandlingError = true;
    this.stopProgressTracker();
    const store = usePlayerStore.getState();
    const current = store.currentSong;
    const failedVideoId = this.currentVideoId;
    this.currentVideoId = null;

    console.warn(`[YT Player Service] Error en video YouTube (${failedVideoId}): código ${code}`);

    // Errores 101/150 (inserción bloqueada por copyright) o 100 (video no encontrado):
    // Intentar buscar automáticamente una versión alternativa (audio o lyric video) del mismo tema
    if ((code === 150 || code === 101 || code === 100) && current && !(current as any)._altRetried) {
      try {
        const { linksService } = await import('./links.service');
        const altMatch = await linksService.matchTrack(current.artist || '', current.name, failedVideoId || undefined);
        if (altMatch && altMatch.youtube_id && altMatch.youtube_id !== failedVideoId) {
          (current as any)._altRetried = true;
          current.youtube_id = altMatch.youtube_id;
          current.url = altMatch.url;
          store.setCurrentSong({ ...current });
          const success = await this.playVideo(altMatch.youtube_id);
          this.isHandlingError = false;
          if (success) {
            useToastStore.getState().show(`Reproduciendo versión alternativa de «${current.name}»`, 'info', 2500);
            return;
          }
        }
      } catch (err) {
        console.warn('[YT Player Service] No se pudo encontrar versión alternativa:', err);
      }
    }

    this.isHandlingError = false;
    store.setIsPlaying(false);
    useToastStore.getState().show(`No se pudo reproducir este video de YouTube. Saltando al siguiente…`, 'warning', 2500);

    setTimeout(() => {
      const nowSong = usePlayerStore.getState().currentSong;
      if (nowSong && nowSong.id === current?.id) {
        void usePlayerStore.getState().next();
      }
    }, 1500);
  }

  private handleStateChange(state: number) {
    const store = usePlayerStore.getState();

    // 1: PLAYING
    if (state === 1) {
      store.setIsPlaying(true);
      const container = document.getElementById('jodify-yt-player-container');
      if (container) container.classList.remove('is-idle');
      this.startProgressTracker();
    }
    // 3: BUFFERING
    else if (state === 3) {
      store.setIsPlaying(true);
      const container = document.getElementById('jodify-yt-player-container');
      if (container) container.classList.remove('is-idle');
      this.startProgressTracker();
    }
    // 2: PAUSED
    else if (state === 2) {
      store.setIsPlaying(false);
      this.stopProgressTracker();
    }
    // 5: CUED (video is queued and ready on mobile)
    else if (state === 5) {
      if (this.player && typeof this.player.playVideo === 'function') {
        try {
          this.player.playVideo();
        } catch {}
      }
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

  public startProgressTracker() {
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
        if (Number.isFinite(dur) && dur > 0 && Math.abs(store.duration - dur) > 0.5) {
          store.setDuration(dur);
        }
      } catch {}
    }, 100);
  }

  public stopProgressTracker() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public onUserGesture(): void {
    if (this.player && this.isReady) {
      try {
        if (typeof this.player.unMute === 'function') {
          this.player.unMute();
        }
      } catch {}
    }
  }

  private executePlayVideo(videoId: string): boolean {
    if (!this.player || !this.isReady) return false;
    this.currentVideoId = videoId;
    const vol = usePlayerStore.getState().volume;
    try {
      const container = document.getElementById('jodify-yt-player-container');
      if (container) {
        container.classList.remove('is-idle');
      }

      if (typeof this.player.setVolume === 'function') {
        this.player.setVolume(Math.round(vol * 100));
      }
      if (typeof this.player.unMute === 'function') {
        this.player.unMute();
      }
      if (typeof this.player.loadVideoById === 'function') {
        this.player.loadVideoById({
          videoId: videoId,
          startSeconds: 0,
        });
      }
      if (typeof this.player.playVideo === 'function') {
        this.player.playVideo();
      }
      this.startProgressTracker();
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
        if (this.pendingVideoId === null) {
          // onReady ya disparó executePlayVideo
          return true;
        }
        this.pendingVideoId = null;
        return this.executePlayVideo(videoId);
      }
      return false;
    }
    return this.executePlayVideo(videoId);
  }

  public play(): void {
    if (this.player && this.isReady && typeof this.player.playVideo === 'function') {
      const container = document.getElementById('jodify-yt-player-container');
      if (container) container.classList.remove('is-idle');
      this.player.playVideo();
      this.startProgressTracker();
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
    const container = document.getElementById('jodify-yt-player-container');
    if (container) {
      container.classList.add('is-idle');
    }
  }

  public seekTo(seconds: number): void {
    if (this.player && this.isReady && typeof this.player.seekTo === 'function') {
      this.player.seekTo(seconds, true);
      this.startProgressTracker();
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
