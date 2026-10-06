import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Link as LinkIcon,
  Play,
  Pause,
  Download,
  PaperPlaneTilt,
  CheckCircle,
  SpinnerGap,
  X,
  MusicNotes,
  Queue,
  Trash,
  Clock,
  YoutubeLogo,
  SpotifyLogo,
  Globe,
  Sparkle,
  ThumbsUp,
  Heart,
  CloudArrowDown,
  ClipboardText,
  Lightning,
  Warning,
  CheckSquare,
  Square,
  PlusCircle,
  FolderSimplePlus,
} from '@phosphor-icons/react';
import { useUiStore } from '../../store/ui.store';
import { usePlayerStore } from '../../store/player.store';
import { useQueueStore } from '../../store/queue.store';
import { usePlaylistsStore } from '../../store/playlists.store';
import { useToastStore } from '../../store/toast.store';
import { useIsAdmin, useIsDev, useSession } from '../../context/SessionContext';
import {
  linksService,
  ResolvedMedia,
  ResolvedTrack,
  ResolvedPlaylistItem,
  SongSuggestion,
} from '../../services/links.service';
import { formatTime } from '../../lib/utils';
import type { Song } from '../../lib/types';
import { useLibraryStore } from '../../store/library.store';
import { downloadSong } from '../../services/offline.service';
import { likesService } from '../../services/social.service';
import { songsService } from '../../services/songs.service';
import { cacheExternalLikedSong, removeExternalLikedSong } from '../../services/player-shortcuts';
import { playSong } from '../../services/player.service';

function toVirtualSong(
  track: {
    title: string;
    artist?: string;
    album?: string;
    stream_url?: string;
    url?: string;
    thumbnail?: string;
    duration?: number;
    id?: string;
    youtube_id?: string;
    source?: string;
    original_url?: string;
    webpage_url?: string;
  },
  playlistCover?: string
): Song {
  const hashVal = Math.abs(
    Array.from(track.title + (track.artist || '')).reduce(
      (acc, char) => (acc << 5) - acc + char.charCodeAt(0),
      0
    )
  );
  const cleanId = track.id ? String(track.id) : `link-${hashVal}`;

  const allUrls = decodeURIComponent(
    `${track.url || ''} ${track.stream_url || ''} ${track.id || ''} ${track.original_url || ''} ${track.webpage_url || ''}`
  );
  let ytId = track.youtube_id;
  if (!ytId && (allUrls.includes('youtube.com') || allUrls.includes('youtu.be') || allUrls.includes('yt-'))) {
    const ytMatch = allUrls.match(/(?:watch\?v=|youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|live\/)|yt-)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) ytId = ytMatch[1];
  }
  if (!ytId && track.id && /^[a-zA-Z0-9_-]{11}$/.test(String(track.id))) {
    ytId = String(track.id);
  }

  const effectiveSource = track.source || (ytId ? 'youtube' : (allUrls.includes('spotify') ? 'spotify' : 'web'));

  let cover = track.thumbnail;
  // Nunca propagar la foto general de una playlist o mosaico a una canción individual
  if (cover && ((playlistCover && cover === playlistCover) || cover.includes('ab67706c'))) {
    cover = undefined;
  }
  const finalCover = cover || (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : undefined);

  return {
    id: cleanId,
    name: track.title,
    artist: track.artist || 'Enlace Externo',
    album: track.album || 'Streaming Web',
    url: track.stream_url || track.url || '',
    youtube_id: ytId,
    source: effectiveSource,
    cover_url: finalCover,
    duration: track.duration,
    likes: 0,
    added_by: 'Enlace Web',
  };
}

export function LinkMusicModal() {
  const ui = useUiStore();
  const { session } = useSession();
  const isAdmin = useIsAdmin();
  const isDev = useIsDev();

  const [activeTab, setActiveTab] = useState<'search' | 'suggestions'>('search');
  const [url, setUrl] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<ResolvedMedia | null>(null);
  const [notes, setNotes] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [suggestedOk, setSuggestedOk] = useState(false);
  const [savingOffline, setSavingOffline] = useState(false);

  // Sugerencias comunitarias
  const [suggestions, setSuggestions] = useState<SongSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [sugStatusFilter, setSugStatusFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [sugSearch, setSugSearch] = useState('');

  const likedIds = useLibraryStore((s) => s.likedIds);
  const downloadedIds = useLibraryStore((s) => s.downloadedIds);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentSong = usePlayerStore((s) => s.currentSong);

  const isTrackLiked = (songId: string | number) =>
    likedIds.some((id) => String(id) === String(songId));
  const isTrackDownloaded = (songId: string | number) =>
    downloadedIds.some((id) => String(id) === String(songId));

  const isTrackPlaying = (track: { id?: string | number; youtube_id?: string; title: string; artist?: string; url?: string; stream_url?: string }) => {
    if (!currentSong || !isPlaying) return false;
    const v = toVirtualSong(track as any);
    return (
      String(currentSong.id) === String(v.id) ||
      (Boolean(v.youtube_id) && currentSong.youtube_id === v.youtube_id) ||
      (Boolean(currentSong.url) && Boolean(v.url) && currentSong.url === v.url)
    );
  };

  const librarySongs = useLibraryStore((s) => s.songs);

  // Playlist State: Selection & Duplicate Handling
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const normalize = (text?: string | null) =>
    String(text ?? '').toLowerCase().replace(/[^a-z0-9]/gi, '').trim();

  const checkDuplicate = (item?: { title?: string | null; artist?: string | null; youtube_id?: string | null; url?: string | null } | null) => {
    if (!item) return false;
    const itemNormTitle = normalize(item.title);
    const itemNormArtist = normalize(item.artist);
    const v = toVirtualSong(item as any);

    return librarySongs.some((s) => {
      if (!s) return false;
      if (v.youtube_id && s.youtube_id && v.youtube_id === s.youtube_id) {
        return true;
      }
      if (v.url && s.url && v.url === s.url) {
        return true;
      }
      const sNormTitle = normalize(s.name);
      const sNormArtist = normalize(s.artist);

      if (itemNormTitle && sNormTitle && itemNormTitle === sNormTitle) {
        if (!itemNormArtist || !sNormArtist) return true;
        if (itemNormArtist === sNormArtist) return true;
        if (itemNormArtist.includes(sNormArtist) || sNormArtist.includes(itemNormArtist)) return true;
      }
      return false;
    });
  };

  useEffect(() => {
    if (resolved?.type === 'playlist' && resolved.items) {
      setSelectedIndices(new Set(resolved.items.map((_, i) => i)));
    } else {
      setSelectedIndices(new Set());
    }
  }, [resolved]);

  const selectedItems = useMemo(() => {
    if (resolved?.type !== 'playlist' || !resolved.items) return [];
    return Array.from(selectedIndices)
      .sort((a, b) => a - b)
      .map((idx) => resolved.items[idx])
      .filter(Boolean);
  }, [resolved, selectedIndices]);

  const duplicateItemsInSelected = useMemo(() => {
    return selectedItems.filter((item) => checkDuplicate(item));
  }, [selectedItems, librarySongs]);

  const duplicateCountInPlaylist = useMemo(() => {
    if (resolved?.type !== 'playlist' || !resolved.items) return 0;
    return resolved.items.filter((item) => checkDuplicate(item)).length;
  }, [resolved, librarySongs]);

  const handleToggleSelect = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (resolved?.type === 'playlist' && resolved.items) {
      setSelectedIndices(new Set(resolved.items.map((_, i) => i)));
    }
  };

  const handleDeselectAll = () => {
    setSelectedIndices(new Set());
  };

  const handleSelectOnlyNew = () => {
    if (resolved?.type === 'playlist' && resolved.items) {
      const newIndices = resolved.items
        .map((it, i) => (!checkDuplicate(it) ? i : -1))
        .filter((i) => i !== -1);
      setSelectedIndices(new Set(newIndices));
      useToastStore
        .getState()
        .show(`Seleccionadas ${newIndices.length} canciones nuevas (duplicadas desmarcadas)`, 'info', 2200);
    }
  };

  const handleAddAllPlaylist = () => {
    if (resolved?.type !== 'playlist' || !resolved.items?.length) return;
    setSelectedIndices(new Set(resolved.items.map((_, i) => i)));
    if (duplicateCountInPlaylist > 0) {
      setShowDuplicateAlert(true);
    } else {
      void executeImport(resolved.items, false);
    }
  };

  const handleSaveAsCustomPlaylist = async (playlist: ResolvedMedia & { type: 'playlist' }) => {
    const targetItems = selectedItems.length > 0 ? selectedItems : playlist.items;
    if (!targetItems.length) {
      useToastStore.getState().show('No hay canciones para guardar', 'warning');
      return;
    }

    setIsImporting(true);
    try {
      const vSongs = targetItems.map((item) => toVirtualSong(item, playlist.thumbnail));
      vSongs.forEach((s) => useLibraryStore.getState().upsertSong(s));

      if (session?.username) {
        try {
          const batchPayload = vSongs.map((v) => ({
            name: v.name,
            artist: v.artist,
            album: v.album,
            url: v.url,
            youtube_id: v.youtube_id,
            cover_url: v.cover_url,
            duration: v.duration,
            added_by: session.username,
          }));
          const CHUNK_SIZE = 100;
          for (let i = 0; i < batchPayload.length; i += CHUNK_SIZE) {
            await songsService.registerBatch(batchPayload.slice(i, i + CHUNK_SIZE), true);
          }
        } catch (e) {
          console.warn('[LinkMusicModal] Error guardando batch para playlist:', e);
        }
      }

      const cover = playlist.thumbnail || targetItems[0]?.thumbnail || vSongs[0]?.cover_url;
      const created = usePlaylistsStore.getState().createFullPlaylist({
        name: playlist.title || 'Mi Playlist de JodiFy',
        description: `Importada desde ${playlist.source.toUpperCase()} (${vSongs.length} temas) · ${playlist.artist || 'Varios Artistas'}`,
        coverUrl: cover,
        songIds: vSongs.map((s) => String(s.id)),
        username: session?.username || 'Usuario',
      });

      useToastStore.getState().show(
        `📁 ¡Playlist «${created.name}» guardada con éxito! Ya puedes escucharla desde tus Playlists`,
        'success',
        4000
      );
    } catch (err: any) {
      useToastStore.getState().show(err.message || 'Error al guardar la playlist', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleLikeAllSongs = async () => {
    if (resolved?.type !== 'playlist' || !resolved.items?.length) return;
    const targetItems = selectedItems.length > 0 ? selectedItems : resolved.items;
    if (!targetItems.length) return;

    setIsImporting(true);
    let count = 0;
    try {
      const vSongs = targetItems.map((item) => toVirtualSong(item, resolved?.thumbnail));
      for (const s of vSongs) {
        useLibraryStore.getState().upsertSong(s);
        useLibraryStore.getState().toggleLikeLocal(s.id, true);
        cacheExternalLikedSong(s);
        count++;
      }

      if (session?.username) {
        try {
          const batchPayload = vSongs.map((v) => ({
            name: v.name,
            artist: v.artist,
            album: v.album,
            url: v.url,
            youtube_id: v.youtube_id,
            cover_url: v.cover_url,
            duration: v.duration,
            added_by: session.username,
            liked_by: session.username,
          }));
          const CHUNK_SIZE = 100;
          for (let i = 0; i < batchPayload.length; i += CHUNK_SIZE) {
            const res = await songsService.registerBatch(batchPayload.slice(i, i + CHUNK_SIZE), false);
            if (res.added) {
              for (const song of res.added) {
                useLibraryStore.getState().upsertSong(song);
                useLibraryStore.getState().toggleLikeLocal(song.id, true);
                void likesService.addLike(session.username, song.id).catch(() => undefined);
              }
            }
            if (res.skipped) {
              for (const song of res.skipped) {
                useLibraryStore.getState().upsertSong(song);
                useLibraryStore.getState().toggleLikeLocal(song.id, true);
                void likesService.addLike(session.username, song.id).catch(() => undefined);
              }
            }
          }
          for (const s of vSongs) {
            void likesService.addLike(session.username, s.id).catch(() => undefined);
          }
        } catch (e) {
          console.warn('[LinkMusicModal] Error guardando likes en backend:', e);
        }
      }

      useToastStore.getState().show(
        `❤️ ¡Se añadieron ${count} canciones a tus Me Gusta!`,
        'success',
        3000
      );
    } catch (err: any) {
      useToastStore.getState().show(err.message || 'Error dando like a canciones', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleAddSingleSong = async (item: ResolvedTrack | ResolvedPlaylistItem) => {
    await executeImport([item], false);
  };

  const handleStartImport = () => {
    if (selectedItems.length === 0) {
      useToastStore.getState().show('Selecciona al menos una canción para agregar', 'warning');
      return;
    }
    if (duplicateItemsInSelected.length > 0) {
      setShowDuplicateAlert(true);
    } else {
      void executeImport(selectedItems, false);
    }
  };

  const executeImport = async (
    itemsToImport: Array<ResolvedTrack | ResolvedPlaylistItem>,
    skipDups: boolean = false
  ) => {
    if (itemsToImport.length === 0) {
      useToastStore.getState().show('No hay canciones para agregar', 'info');
      return;
    }
    setIsImporting(true);
    setShowDuplicateAlert(false);

    try {
      const username = session?.username || (isAdmin ? 'Admin' : 'Usuario');
      const allSongs = itemsToImport.map((item) =>
        toVirtualSong(item, resolved?.type === 'playlist' ? resolved.thumbnail : undefined)
      );

      // Guardar de inmediato en la biblioteca local para respuesta reactiva instantánea
      allSongs.forEach((v) => useLibraryStore.getState().upsertSong(v));

      const batchPayload = allSongs.map((v) => ({
        name: v.name,
        artist: v.artist,
        album: v.album,
        url: v.url,
        youtube_id: v.youtube_id,
        cover_url: v.cover_url,
        duration: v.duration,
        added_by: username,
        liked_by: session?.username,
      }));

      // Procesar en chunks de 100 para evitar sobrecarga de red y timeouts
      const CHUNK_SIZE = 100;
      let totalAdded = 0;
      let totalSkipped = 0;

      for (let i = 0; i < batchPayload.length; i += CHUNK_SIZE) {
        const chunk = batchPayload.slice(i, i + CHUNK_SIZE);
        const res = await songsService.registerBatch(chunk, skipDups);
        if (res.added && res.added.length > 0) {
          for (const song of res.added) {
            useLibraryStore.getState().upsertSong(song);
          }
        }
        totalAdded += res.added_count;
        totalSkipped += res.skipped_count;
      }

      useToastStore
        .getState()
        .show(
          `✅ ¡Éxito! Se agregaron ${totalAdded} canciones a la biblioteca${
            totalSkipped > 0 ? ` (${totalSkipped} duplicadas omitidas)` : ''
          }.`,
          'success',
          4000
        );
    } catch (err: any) {
      useToastStore.getState().show(err.message || 'Error al procesar canciones de la playlist', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handlePlaySelectedPlaylist = async (playlist: ResolvedMedia & { type: 'playlist' }) => {
    const targetItems = selectedItems.length > 0 ? selectedItems : playlist.items;
    if (!targetItems.length) return;
    const songs = targetItems.map((item) => toVirtualSong(item, playlist.thumbnail));
    songs.forEach((s) => useLibraryStore.getState().upsertSong(s));

    const queue = useQueueStore.getState();
    songs.slice(1).forEach((s) => queue.add(s));

    await playSong(songs[0]);
    useToastStore.getState().show(`Reproduciendo playlist (${songs.length} pistas)`, 'success', 2500);
  };

  const handleQueueSelectedPlaylist = (playlist: ResolvedMedia & { type: 'playlist' }) => {
    const targetItems = selectedItems.length > 0 ? selectedItems : playlist.items;
    if (!targetItems.length) return;
    const songs = targetItems.map((item) => toVirtualSong(item, playlist.thumbnail));
    songs.forEach((s) => {
      useLibraryStore.getState().upsertSong(s);
      useQueueStore.getState().add(s);
    });
    useToastStore.getState().show(`Se agregaron ${songs.length} canciones a la cola`, 'info', 2200);
  };

  useEffect(() => {
    if (!isAdmin && !isDev && activeTab === 'suggestions') {
      setActiveTab('search');
    }
  }, [isAdmin, isDev, activeTab]);

  useEffect(() => {
    if (ui.modal === 'linkMusic' && activeTab === 'suggestions') {
      void loadSuggestions();
    }
  }, [ui.modal, activeTab]);

  // Enriquecer en vivo las carátulas auténticas de canciones de playlists que falten o traigan la de la playlist
  useEffect(() => {
    if (resolved?.type !== 'playlist' || !resolved.items?.length) return;
    const playlistCover = resolved.thumbnail;
    const itemsNeedingThumb = resolved.items.filter(
      (it) => !it.thumbnail || (playlistCover && it.thumbnail === playlistCover) || it.thumbnail.includes('ab67706c')
    );
    if (!itemsNeedingThumb.length) return;

    let isMounted = true;
    const fetchMissingCovers = async () => {
      const CHUNK = 6;
      for (let i = 0; i < itemsNeedingThumb.length; i += CHUNK) {
        if (!isMounted) break;
        const chunk = itemsNeedingThumb.slice(i, i + CHUNK);
        await Promise.all(
          chunk.map(async (item) => {
            try {
              const cleanArtist = (item.artist || '').split(',')[0].trim();
              const cleanTitle = (item.title || '').replace(/\(.*?\)|\[.*?\]/g, '').trim();
              const term = encodeURIComponent(`${cleanArtist} ${cleanTitle}`.trim());
              const res = await fetch(`https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=1`);
              if (res.ok) {
                const data = await res.json();
                const artwork = data.results?.[0]?.artworkUrl100?.replace('100x100bb', '600x600bb');
                if (artwork && isMounted) {
                  setResolved((prev) => {
                    if (!prev || prev.type !== 'playlist') return prev;
                    return {
                      ...prev,
                      items: prev.items.map((it) => (it.id === item.id ? { ...it, thumbnail: artwork } : it)),
                    };
                  });
                }
              }
            } catch {
              // Silencioso ante fallos de red
            }
          })
        );
      }
    };

    void fetchMissingCovers();
    return () => {
      isMounted = false;
    };
  }, [resolved?.type, (resolved as any)?.id || (resolved as any)?.title]);

  if (ui.modal !== 'linkMusic') return null;

  const loadSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const data = await linksService.getSuggestions();
      setSuggestions(data);
    } catch {
      // ignore
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      if (navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().startsWith('http')) {
          setUrl(text.trim());
          useToastStore.getState().show('Enlace pegado desde el portapapeles', 'info', 1600);
        }
      }
    } catch {
      // ignore clipboard error
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsResolving(true);
    setError(null);
    setResolved(null);
    setSuggestedOk(false);

    try {
      const res = await linksService.resolveLink(url.trim());
      setResolved(res);
      useToastStore.getState().show('¡Música encontrada con éxito!', 'success', 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo resolver el enlace');
    } finally {
      setIsResolving(false);
    }
  };

  const handlePlayResolvedTrack = async (track: ResolvedTrack) => {
    const virtualSong = toVirtualSong(track);
    if (
      currentSong &&
      (String(currentSong.id) === String(virtualSong.id) ||
        (Boolean(virtualSong.youtube_id) && currentSong.youtube_id === virtualSong.youtube_id) ||
        (Boolean(currentSong.url) && Boolean(virtualSong.url) && currentSong.url === virtualSong.url))
    ) {
      usePlayerStore.getState().togglePlay();
      return;
    }
    useLibraryStore.getState().upsertSong(virtualSong);
    await playSong(virtualSong);
    useToastStore.getState().show(`Reproduciendo «${track.title}»`, 'success', 2200);
  };

  const handleQueueTrack = (track: ResolvedTrack) => {
    const virtualSong = toVirtualSong(track);
    useLibraryStore.getState().upsertSong(virtualSong);
    useQueueStore.getState().add(virtualSong);
    useToastStore.getState().show(`«${track.title}» agregada a la cola`, 'info', 1800);
  };

  const handleToggleLike = async (track: ResolvedTrack) => {
    const virtualSong = toVirtualSong(track);
    const currentlyLiked = isTrackLiked(virtualSong.id);
    const nextLiked = !currentlyLiked;

    // Actualiza en la tienda de la biblioteca inmediatamente
    useLibraryStore.getState().upsertSong(virtualSong);
    useLibraryStore.getState().toggleLikeLocal(virtualSong.id, nextLiked);

    const effectiveUsername = session?.username || localStorage.getItem('currentUserName');
    if (effectiveUsername) {
      try {
        if (nextLiked) {
          const registered = await songsService.registerSong({
            name: virtualSong.name,
            artist: virtualSong.artist,
            album: virtualSong.album,
            url: virtualSong.url,
            youtube_id: virtualSong.youtube_id,
            cover_url: virtualSong.cover_url,
            duration: virtualSong.duration,
            added_by: effectiveUsername,
            liked_by: effectiveUsername,
          });
          useLibraryStore.getState().upsertSong(registered);
          useLibraryStore.getState().toggleLikeLocal(registered.id, true);
          if (String(registered.id) !== String(virtualSong.id)) {
            useLibraryStore.getState().toggleLikeLocal(virtualSong.id, false);
          }
          cacheExternalLikedSong(registered);
        } else {
          await likesService.removeLike(effectiveUsername, virtualSong.id);
          if (virtualSong.youtube_id) {
            await likesService.removeLike(effectiveUsername, virtualSong.youtube_id).catch(() => {});
          }
          removeExternalLikedSong(virtualSong.id);
        }
      } catch (err) {
        console.warn('[LinkMusicModal] Error guardando like externo en BD:', err);
      }
    }

    useToastStore.getState().show(
      nextLiked
        ? `«${track.title}» agregada a tus Me Gusta ❤️`
        : `«${track.title}» eliminada de tus Me Gusta`,
      nextLiked ? 'success' : 'info',
      2000
    );
  };

  const handleSaveOffline = async (track: ResolvedTrack) => {
    const virtualSong = toVirtualSong(track);
    setSavingOffline(true);
    try {
      useLibraryStore.getState().upsertSong(virtualSong);
      await downloadSong(virtualSong, session?.username || 'usuario');
    } catch (err) {
      console.error('[LinkMusicModal] Error guardando offline:', err);
    } finally {
      setSavingOffline(false);
    }
  };

  const handleDownloadFile = (track: ResolvedTrack) => {
    const targetUrl = track.webpage_url || track.original_url || track.stream_url || track.download_url || '';
    const downloadUrl = linksService.getDownloadUrl(targetUrl, `${track.title}.mp3`);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${track.title}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    useToastStore.getState().show(`Iniciando descarga de «${track.title}.mp3»…`, 'info', 2200);
  };

  const handleSuggest = async (track: ResolvedTrack) => {
    setSuggesting(true);
    try {
      await linksService.suggestSong({
        url: track.original_url || track.webpage_url || '',
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: track.duration,
        thumbnail: track.thumbnail,
        stream_url: track.stream_url,
        youtube_id: track.youtube_id,
        notes: notes.trim() || undefined,
      });
      setSuggestedOk(true);
      useToastStore.getState().show('Sugerencia enviada a los administradores', 'success', 2500);
    } catch (err) {
      useToastStore.getState().show(
        err instanceof Error ? err.message : 'Error al enviar sugerencia',
        'error'
      );
    } finally {
      setSuggesting(false);
    }
  };

  const handleApprove = async (sugId: string) => {
    setApprovingId(sugId);
    try {
      const createdSong = await linksService.approveSuggestion(sugId);
      if (createdSong) {
        useLibraryStore.getState().upsertSong(createdSong);
      }
      setSuggestions((prev) =>
        prev.map((s) => (s.id === sugId ? { ...s, status: 'approved' } : s))
      );
      useToastStore.getState().show('Canción aprobada y guardada en la base de datos', 'success', 2800);
    } catch (err) {
      useToastStore.getState().show(
        err instanceof Error ? err.message : 'Error al aprobar sugerencia',
        'error'
      );
    } finally {
      setApprovingId(null);
    }
  };

  const handleDeleteSuggestion = async (sugId: string) => {
    try {
      await linksService.deleteSuggestion(sugId);
      setSuggestions((prev) => prev.filter((s) => s.id !== sugId));
      useToastStore.getState().show('Sugerencia eliminada', 'info', 1600);
    } catch {
      useToastStore.getState().show('No se pudo eliminar la sugerencia', 'error');
    }
  };

  return (
    <div className="jf-modal-backdrop" onClick={() => ui.close('linkMusic')}>
      <motion.div
        className="jf-modal jf-modal-card jf-link-music-modal"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(940px, 95vw)',
          maxWidth: '940px',
          height: resolved?.type === 'playlist' ? 'min(92vh, 880px)' : 'auto',
          maxHeight: '92vh',
        }}
      >
        <div className="jf-modal-header">
          <div className="jf-modal-header-icon jf-modal-header-icon--link">
            <LinkIcon size={20} weight="bold" />
          </div>
          <div>
            <h2 className="jf-modal-title">Buscador y Explorador de Enlaces</h2>
            <p className="jf-modal-subtitle">
              Pega cualquier link para reproducir, guardar en tus me gusta, descargar localmente o agregar a tu colección
            </p>
          </div>
          <button
            type="button"
            className="jf-modal-close"
            onClick={() => ui.close('linkMusic')}
            aria-label="Cerrar"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Pestañas: Buscar por Link / Sugerencias comunitarias (Solo dev o admin) */}
        {(isAdmin || isDev) && (
          <div className="jf-link-tabs">
            <button
              type="button"
              className={`jf-link-tab ${activeTab === 'search' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              <Globe size={16} weight="bold" /> Buscar por Enlace
            </button>
            <button
              type="button"
              className={`jf-link-tab ${activeTab === 'suggestions' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('suggestions')}
            >
              <ThumbsUp size={16} weight="bold" /> Panel de Sugerencias
              {suggestions.filter((s) => s.status === 'pending').length > 0 && (
                <span className="jf-link-tab-badge">
                  {suggestions.filter((s) => s.status === 'pending').length}
                </span>
              )}
            </button>
          </div>
        )}

        {activeTab === 'search' ? (
          <div className="jf-link-content">
            {/* Formulario de búsqueda con botón de pegar */}
            <form onSubmit={handleResolve} className="jf-link-form">
              <div className="jf-link-input-wrapper">
                <input
                  type="url"
                  className="jf-input jf-link-input"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Pega un enlace de YouTube, Spotify, SoundCloud, MP3 o playlist…"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  className="jf-btn-ghost jf-link-paste-btn"
                  onClick={handlePasteClipboard}
                  title="Pegar desde el portapapeles"
                >
                  <ClipboardText size={17} weight="bold" /> Pegar
                </button>
                <button
                  type="submit"
                  className="jf-btn jf-btn--primary jf-link-submit-btn"
                  disabled={isResolving || !url.trim()}
                >
                  {isResolving ? (
                    <>
                      <SpinnerGap size={17} weight="bold" className="jf-spin" /> Buscando…
                    </>
                  ) : (
                    <>
                      <Sparkle size={17} weight="fill" /> Explorar
                    </>
                  )}
                </button>
              </div>

              {/* Badges de compatibilidad rápida */}
              <div className="jf-link-compatibility-badges">
                <span className="jf-link-compat-pill jf-compat-yt">
                  <YoutubeLogo size={13} weight="fill" /> YouTube
                </span>
                <span className="jf-link-compat-pill jf-compat-sp">
                  <SpotifyLogo size={13} weight="fill" /> Spotify
                </span>
                <span className="jf-link-compat-pill jf-compat-sc">
                  <Globe size={13} weight="bold" /> SoundCloud
                </span>
                <span className="jf-link-compat-pill jf-compat-direct">
                  <MusicNotes size={13} weight="bold" /> Audio MP3 / WAV
                </span>
              </div>
            </form>

            {/* Animación de escaneo activo */}
            <AnimatePresence>
              {isResolving && (
                <motion.div
                  className="jf-link-scanning-state"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                >
                  <div className="jf-link-scanning-radar">
                    <span className="jf-radar-pulse" />
                    <SpinnerGap size={36} weight="bold" className="jf-spin jf-radar-icon" />
                  </div>
                  <p className="jf-link-scanning-text">
                    Decodificando metadatos y extrayendo flujo de audio en alta definición…
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <motion.div
                className="jf-link-error-card"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p>{error}</p>
              </motion.div>
            )}

            {/* Resultado de pista única */}
            {resolved?.type === 'track' && !isResolving && (
              <motion.div
                className="jf-link-card"
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="jf-link-card-media">
                  {resolved.thumbnail ? (
                    <img className="jf-link-cover" src={resolved.thumbnail} alt="" />
                  ) : (
                    <div className="jf-link-cover jf-link-cover--placeholder">
                      <MusicNotes size={36} weight="duotone" />
                    </div>
                  )}

                  <span
                    className={`jf-link-source-badge ${
                      resolved.source.includes('youtube')
                        ? 'is-youtube'
                        : resolved.source.includes('spotify')
                        ? 'is-spotify'
                        : 'is-web'
                    }`}
                  >
                    {resolved.source.includes('youtube') ? (
                      <YoutubeLogo size={14} weight="fill" />
                    ) : resolved.source.includes('spotify') ? (
                      <SpotifyLogo size={14} weight="fill" />
                    ) : (
                      <Globe size={14} weight="fill" />
                    )}
                    {resolved.source.toUpperCase()}
                  </span>

                  <span className="jf-link-quality-badge">320 KBPS HD</span>
                </div>

                <div className="jf-link-card-details">
                  <div className="jf-link-meta-head">
                    <h3 className="jf-link-title">{resolved.title}</h3>
                    <p className="jf-link-artist">{resolved.artist}</p>
                    <div className="jf-link-meta-tags">
                      {resolved.album && (
                        <span className="jf-link-album-tag">Álbum: {resolved.album}</span>
                      )}
                      {resolved.duration && (
                        <span className="jf-link-duration">
                          <Clock size={13} /> {formatTime(resolved.duration)}
                        </span>
                      )}
                      {isTrackDownloaded(toVirtualSong(resolved).id) && (
                        <span className="jf-link-offline-badge">
                          <CheckCircle size={13} weight="fill" /> Guardada Offline
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Acciones principales: Play, Cola, Like, Guardar Offline, Descargar MP3 */}
                  <div className="jf-link-actions-grid">
                    <button
                      type="button"
                      className={`jf-btn ${isTrackPlaying(resolved) ? 'jf-btn--secondary is-playing' : 'jf-btn--primary'} jf-link-action-play`}
                      onClick={() => handlePlayResolvedTrack(resolved)}
                    >
                      {isTrackPlaying(resolved) ? (
                        <>
                          <Pause size={16} weight="fill" /> Pausar
                        </>
                      ) : (
                        <>
                          <Play size={16} weight="fill" />{' '}
                          {currentSong &&
                          (String(currentSong.id) === String(toVirtualSong(resolved).id) ||
                            (Boolean(resolved.youtube_id) && currentSong.youtube_id === resolved.youtube_id))
                            ? 'Reanudar'
                            : 'Reproducir ahora'}
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className="jf-btn jf-btn--secondary"
                      onClick={() => handleQueueTrack(resolved)}
                      title="Agregar a la cola"
                    >
                      <Queue size={16} /> A la cola
                    </button>

                    {/* Botón de Like / Favoritos */}
                    <button
                      type="button"
                      className={`jf-btn jf-btn--secondary jf-link-like-btn ${
                        isTrackLiked(toVirtualSong(resolved).id) ? 'is-liked' : ''
                      }`}
                      onClick={() => handleToggleLike(resolved)}
                      title={
                        isTrackLiked(toVirtualSong(resolved).id)
                          ? 'En tus Me Gusta'
                          : 'Agregar a Me Gusta para escuchar siempre'
                      }
                    >
                      <Heart
                        size={17}
                        weight={
                          isTrackLiked(toVirtualSong(resolved).id) ? 'fill' : 'regular'
                        }
                      />
                      {isTrackLiked(toVirtualSong(resolved).id) ? 'Me Gusta' : 'Dar Like'}
                    </button>

                    {/* Botón de Guardar Offline (IndexedDB local) */}
                    <button
                      type="button"
                      className={`jf-btn jf-btn--secondary jf-link-offline-btn ${
                        isTrackDownloaded(toVirtualSong(resolved).id) ? 'is-downloaded' : ''
                      }`}
                      onClick={() => handleSaveOffline(resolved)}
                      disabled={savingOffline}
                      title="Guardar localmente para escuchar sin conexión en cualquier momento"
                    >
                      {savingOffline ? (
                        <SpinnerGap size={16} weight="bold" className="jf-spin" />
                      ) : (
                        <CloudArrowDown size={17} weight="bold" />
                      )}
                      {isTrackDownloaded(toVirtualSong(resolved).id)
                        ? 'En Offline'
                        : 'Guardar Offline'}
                    </button>

                    {/* Botón de Descargar MP3 directo al disco */}
                    <button
                      type="button"
                      className="jf-btn jf-btn--secondary"
                      onClick={() => handleDownloadFile(resolved)}
                      title="Descargar archivo .mp3 a tu dispositivo"
                    >
                      <Download size={16} /> Descargar .mp3
                    </button>
                  </div>

                  {/* Sección de Sugerencia / Añadir a la base de datos */}
                  <div className="jf-link-suggest-box">
                    <div className="jf-link-suggest-head">
                      <Sparkle size={15} weight="fill" />
                      <span>
                        {isAdmin || isDev
                          ? 'Panel de Control: Agregar a la nube de JodiFy'
                          : '¿Quieres que esta canción esté disponible para toda la comunidad?'}
                      </span>
                    </div>

                    {suggestedOk ? (
                      <div className="jf-link-suggest-success">
                        <CheckCircle size={18} weight="fill" />
                        <span>¡Sugerencia enviada! Un administrador la revisará para incorporarla.</span>
                      </div>
                    ) : (
                      <div className="jf-link-suggest-form">
                        <input
                          type="text"
                          className="jf-input jf-link-notes-input"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Nota opcional (género, comentarios, etc.)"
                        />
                        <button
                          type="button"
                          className="jf-btn jf-btn--secondary jf-link-suggest-btn"
                          disabled={suggesting}
                          onClick={() => handleSuggest(resolved)}
                        >
                          {suggesting ? (
                            <SpinnerGap size={14} className="jf-spin" />
                          ) : (
                            <PaperPlaneTilt size={14} weight="bold" />
                          )}
                          Sugerir a la Base de Datos
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Resultado de Playlist */}
            {resolved?.type === 'playlist' && !isResolving && (
              <motion.div
                className="jf-link-playlist-view"
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.35 }}
              >
                <div className="jf-link-playlist-head">
                  <div className="jf-link-playlist-cover-wrap">
                    {resolved.thumbnail || resolved.items[0]?.thumbnail ? (
                      <img
                        className="jf-link-playlist-cover"
                        src={resolved.thumbnail || resolved.items[0]?.thumbnail}
                        alt={resolved.title}
                      />
                    ) : (
                      <div className="jf-link-playlist-cover jf-link-playlist-cover--placeholder">
                        <MusicNotes size={40} weight="duotone" />
                      </div>
                    )}
                    <span
                      className={`jf-link-source-badge ${
                        resolved.source.includes('youtube')
                          ? 'is-youtube'
                          : resolved.source.includes('spotify')
                          ? 'is-spotify'
                          : 'is-web'
                      }`}
                    >
                      {resolved.source.includes('youtube') ? (
                        <YoutubeLogo size={13} weight="fill" />
                      ) : resolved.source.includes('spotify') ? (
                        <SpotifyLogo size={13} weight="fill" />
                      ) : (
                        <Globe size={13} weight="fill" />
                      )}
                      {resolved.source.toUpperCase()}
                    </span>
                  </div>

                  <div className="jf-link-playlist-meta">
                    <div className="jf-link-playlist-badges-row">
                      <span className="jf-link-playlist-badge">Playlist Completa</span>
                      <span className="jf-link-playlist-total-count">
                        <MusicNotes size={13} weight="bold" /> {resolved.items.length} canciones en total
                      </span>
                      {duplicateCountInPlaylist > 0 && (
                        <span className="jf-link-playlist-dup-badge">
                          <Warning size={13} weight="fill" /> {duplicateCountInPlaylist} en biblioteca
                        </span>
                      )}
                    </div>

                    <h3 className="jf-link-playlist-title">{resolved.title}</h3>
                    <p className="jf-link-playlist-sub">
                      Canal / Creador: <strong>{resolved.artist || 'Varios Artistas'}</strong>
                    </p>

                    {resolved.source.includes('spotify') && resolved.items.length >= 100 && (
                      <div
                        style={{
                          margin: '8px 0 12px 0',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: 'rgba(29, 185, 84, 0.1)',
                          border: '1px solid rgba(29, 185, 84, 0.3)',
                          color: '#d1d5db',
                          fontSize: '12px',
                          lineHeight: '1.4',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <SpotifyLogo size={18} weight="fill" style={{ color: '#1db954', flexShrink: 0 }} />
                        <span>
                          <strong>Nota de Spotify:</strong> La vista pública de Spotify muestra las primeras 100 canciones. Para importar playlists masivas de más de 100 temas (ej. 600 canciones), puedes pegar el enlace de la lista equivalente desde <strong>YouTube</strong> o <strong>YouTube Music</strong>.
                        </span>
                      </div>
                    )}

                    <div className="jf-link-playlist-actions">
                      <button
                        type="button"
                        className="jf-btn jf-btn--primary jf-btn--emerald"
                        disabled={isImporting || resolved.items.length === 0}
                        onClick={handleAddAllPlaylist}
                        title="Agregar todas las canciones de la playlist a la biblioteca de una sola vez"
                      >
                        {isImporting ? (
                          <>
                            <SpinnerGap size={16} weight="bold" className="jf-spin" /> Guardando…
                          </>
                        ) : (
                          <>
                            <PlusCircle size={16} weight="fill" /> Agregar a Biblioteca ({resolved.items.length})
                          </>
                        )}
                      </button>

                      {/* Guardar como Playlist personalizada de JodiFy con portada y canciones */}
                      <button
                        type="button"
                        className="jf-btn jf-btn--primary jf-btn-save-playlist"
                        disabled={isImporting || resolved.items.length === 0}
                        onClick={() => void handleSaveAsCustomPlaylist(resolved)}
                        title="Crear y guardar esta playlist con su portada y canciones en tus Playlists de JodiFy"
                      >
                        <FolderSimplePlus size={16} weight="bold" /> Guardar como Playlist ({selectedIndices.size > 0 && selectedIndices.size < resolved.items.length ? selectedIndices.size : resolved.items.length})
                      </button>

                      {/* Dar Like a Todas */}
                      <button
                        type="button"
                        className="jf-btn jf-btn--secondary jf-btn-like-all"
                        disabled={isImporting || resolved.items.length === 0}
                        onClick={() => void handleLikeAllSongs()}
                        title="Dar Me Gusta a todas las canciones de esta playlist"
                      >
                        <Heart size={16} weight="fill" color="#ff3366" /> Like a Todas ({selectedIndices.size > 0 && selectedIndices.size < resolved.items.length ? selectedIndices.size : resolved.items.length})
                      </button>

                      {selectedIndices.size > 0 && selectedIndices.size < resolved.items.length && (
                        <button
                          type="button"
                          className="jf-btn jf-btn--secondary"
                          disabled={isImporting}
                          onClick={handleStartImport}
                          title="Agregar solo las canciones seleccionadas"
                        >
                          <PlusCircle size={15} weight="bold" /> Agregar Seleccionadas ({selectedIndices.size})
                        </button>
                      )}

                      <button
                        type="button"
                        className="jf-btn jf-btn--secondary"
                        onClick={() => handlePlaySelectedPlaylist(resolved)}
                        title="Reproducir playlist ahora"
                      >
                        <Play size={15} weight="fill" /> Reproducir Playlist
                      </button>

                      <button
                        type="button"
                        className="jf-btn jf-btn--ghost"
                        onClick={() => handleQueueSelectedPlaylist(resolved)}
                        title="Añadir a la cola"
                      >
                        <Queue size={15} /> A la Cola
                      </button>
                    </div>
                  </div>
                </div>

                {/* Toolbar de selección */}
                <div className="jf-playlist-toolbar">
                  <div className="jf-playlist-toolbar-left">
                    <span className="jf-playlist-selection-count">
                      <strong>{selectedIndices.size}</strong> de {resolved.items.length} seleccionadas
                    </span>
                    {duplicateCountInPlaylist > 0 && (
                      <span className="jf-playlist-dup-summary">
                        ({duplicateCountInPlaylist} ya están en tu biblioteca)
                      </span>
                    )}
                  </div>
                  <div className="jf-playlist-toolbar-actions">
                    <button
                      type="button"
                      className="jf-toolbar-btn"
                      onClick={handleSelectAll}
                    >
                      <CheckSquare size={14} weight="bold" /> Seleccionar Todas
                    </button>
                    <button
                      type="button"
                      className="jf-toolbar-btn"
                      onClick={handleDeselectAll}
                    >
                      <Square size={14} /> Desmarcar Todas
                    </button>
                    {duplicateCountInPlaylist > 0 && (
                      <button
                        type="button"
                        className="jf-toolbar-btn is-highlight"
                        onClick={handleSelectOnlyNew}
                        title="Desmarca automáticamente las canciones que ya tienes agregadas"
                      >
                        <Sparkle size={14} weight="fill" /> Solo Nuevas ({resolved.items.length - duplicateCountInPlaylist})
                      </button>
                    )}
                    {selectedIndices.size > 0 && selectedIndices.size < resolved.items.length && (
                      <button
                        type="button"
                        className="jf-toolbar-btn is-highlight"
                        onClick={() => void handleLikeAllSongs()}
                        title="Dar Me Gusta a las canciones seleccionadas"
                      >
                        <Heart size={14} weight="fill" color="#ff3366" /> Like a Seleccionadas ({selectedIndices.size})
                      </button>
                    )}
                  </div>
                </div>

                {/* Lista de Todas las Canciones de la Playlist */}
                <div className="jf-link-playlist-items">
                  {resolved.items.map((item, idx) => {
                    const isSelected = selectedIndices.has(idx);
                    const isDup = checkDuplicate(item);
                    const vSong = toVirtualSong(item, resolved.thumbnail);
                    const liked = isTrackLiked(vSong.id);
                    const itemThumb =
                      (item.thumbnail && item.thumbnail !== resolved.thumbnail && !item.thumbnail.includes('ab67706c')
                        ? item.thumbnail
                        : undefined) ||
                      (item.youtube_id ? `https://i.ytimg.com/vi/${item.youtube_id}/hqdefault.jpg` : undefined);

                    return (
                      <div
                        key={item.id || `${item.title}-${idx}`}
                        className={`jf-link-playlist-item ${isSelected ? 'is-selected' : ''} ${isDup ? 'is-duplicate' : ''}`}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('.jf-link-item-actions')) return;
                          handleToggleSelect(idx);
                        }}
                      >
                        {/* Checkbox de Selección */}
                        <div
                          className="jf-link-item-checkbox"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSelect(idx);
                          }}
                          title={isSelected ? 'Desmarcar' : 'Marcar para acción múltiple'}
                        >
                          {isSelected ? (
                            <CheckSquare size={18} weight="fill" style={{ color: 'var(--accent, #00f0ff)' }} />
                          ) : (
                            <Square size={18} style={{ color: 'rgba(255,255,255,0.4)' }} />
                          )}
                        </div>

                        <span className="jf-link-item-num">{idx + 1}</span>

                        {itemThumb ? (
                          <img
                            className="jf-link-item-thumb"
                            src={itemThumb}
                            alt=""
                            style={{ width: 44, height: 44, minWidth: 44, minHeight: 44, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                          />
                        ) : (
                          <div
                            className="jf-link-item-thumb jf-link-item-thumb--placeholder"
                            style={{ width: 44, height: 44, minWidth: 44, minHeight: 44, borderRadius: 6, flexShrink: 0 }}
                          >
                            <MusicNotes size={16} />
                          </div>
                        )}

                        <div className="jf-link-item-meta">
                          <div className="jf-link-item-title-row">
                            <span className="jf-link-item-title" title={item.title}>{item.title}</span>
                            {isDup ? (
                              <span className="jf-playlist-dup-tag" title="Esta canción ya está en tu biblioteca">
                                ⚠️ En biblioteca
                              </span>
                            ) : (
                              <span className="jf-playlist-new-tag">✨ Nueva</span>
                            )}
                          </div>
                          <span className="jf-link-item-artist" title={item.artist || 'Artista Desconocido'}>
                            {item.artist || 'Artista Desconocido'}
                          </span>
                        </div>

                        {item.duration ? (
                          <span className="jf-link-item-dur">{formatTime(item.duration)}</span>
                        ) : null}

                        <div className="jf-link-item-actions" onClick={(e) => e.stopPropagation()}>
                          {/* Opción para agregar canciones 1 por 1 */}
                          <button
                            type="button"
                            className={`jf-btn-add-single ${isDup ? 'is-added' : ''}`}
                            disabled={isImporting}
                            onClick={() => void handleAddSingleSong(item)}
                            title={isDup ? 'Ya está en tu biblioteca. Haz clic para re-agregar.' : 'Agregar solo esta canción'}
                          >
                            {isDup ? (
                              <>
                                <CheckCircle size={13} weight="fill" /> Guardada
                              </>
                            ) : (
                              <>
                                <PlusCircle size={13} weight="bold" /> + Agregar
                              </>
                            )}
                          </button>

                          {/* Botón Play directo */}
                          <button
                            type="button"
                            className={`jf-btn-icon ${isTrackPlaying(item) ? 'is-active' : ''}`}
                            title={isTrackPlaying(item) ? 'Pausar' : 'Reproducir ahora'}
                            onClick={async () => {
                              if (isTrackPlaying(item)) {
                                usePlayerStore.getState().togglePlay();
                                return;
                              }
                              useLibraryStore.getState().upsertSong(vSong);
                              await playSong(vSong);
                              useToastStore.getState().show(`Reproduciendo «${item.title}»`, 'success', 2000);
                            }}
                          >
                            {isTrackPlaying(item) ? <Pause size={14} weight="fill" /> : <Play size={14} weight="fill" />}
                          </button>

                          {/* Botón Añadir a la cola */}
                          <button
                            type="button"
                            className="jf-btn-icon"
                            title="Añadir a la cola"
                            onClick={() => {
                              useLibraryStore.getState().upsertSong(vSong);
                              useQueueStore.getState().add(vSong);
                              useToastStore.getState().show(`«${item.title}» a la cola`, 'info', 1600);
                            }}
                          >
                            <Queue size={14} />
                          </button>

                          {/* Botón Like directo en playlist con persistencia */}
                          <button
                            type="button"
                            className={`jf-btn-icon jf-item-like-btn ${liked ? 'is-liked' : ''}`}
                            title={liked ? 'En tus Me Gusta (Haz clic para quitar)' : 'Dar Me Gusta ❤️'}
                            onClick={async (e) => {
                              e.stopPropagation();
                              const next = !liked;
                              useLibraryStore.getState().upsertSong(vSong);
                              useLibraryStore.getState().toggleLikeLocal(vSong.id, next);
                              if (next) {
                                cacheExternalLikedSong(vSong);
                              } else {
                                removeExternalLikedSong(vSong.id);
                              }
                              if (session?.username) {
                                try {
                                  if (next) {
                                    const reg = await songsService.registerSong({
                                      name: vSong.name,
                                      artist: vSong.artist,
                                      album: vSong.album,
                                      url: vSong.url,
                                      youtube_id: vSong.youtube_id,
                                      cover_url: vSong.cover_url,
                                      duration: vSong.duration,
                                      added_by: session.username,
                                      liked_by: session.username,
                                    });
                                    useLibraryStore.getState().upsertSong(reg);
                                    useLibraryStore.getState().toggleLikeLocal(reg.id, true);
                                    cacheExternalLikedSong(reg);
                                  } else {
                                    await likesService.removeLike(session.username, vSong.id);
                                  }
                                } catch {
                                  // local
                                }
                              }
                              useToastStore.getState().show(
                                next ? `«${item.title}» añadida a tus Me Gusta ❤️` : `«${item.title}» quitada de Me Gusta`,
                                next ? 'success' : 'info',
                                1800
                              );
                            }}
                          >
                            <Heart size={16} weight={liked ? 'fill' : 'regular'} color={liked ? '#ff3366' : 'currentColor'} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <div className="jf-link-playlist-footer-note">
                    <MusicNotes size={14} weight="bold" />
                    <span>Mostrando {resolved.items.length} canciones cargadas · Puedes reproducir, descargar, agregar individualmente o dar Me Gusta ❤️</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        ) : (
          /* Pestaña: Panel de Sugerencias (Solo dev o admin) */
          <div className="jf-suggestions-list-view">
            {/* Cabecera del panel de sugerencias */}
            <div className="jf-sug-panel-top">
              <div className="jf-sug-filter-pills">
                <button
                  type="button"
                  className={`jf-sug-pill ${sugStatusFilter === 'all' ? 'is-active' : ''}`}
                  onClick={() => setSugStatusFilter('all')}
                >
                  Todas ({suggestions.length})
                </button>
                <button
                  type="button"
                  className={`jf-sug-pill ${sugStatusFilter === 'pending' ? 'is-active' : ''}`}
                  onClick={() => setSugStatusFilter('pending')}
                >
                  Pendientes ({suggestions.filter((s) => s.status === 'pending').length})
                </button>
                <button
                  type="button"
                  className={`jf-sug-pill ${sugStatusFilter === 'approved' ? 'is-active' : ''}`}
                  onClick={() => setSugStatusFilter('approved')}
                >
                  Aprobadas ({suggestions.filter((s) => s.status === 'approved').length})
                </button>
              </div>

              <button
                type="button"
                className="jf-btn-ghost jf-suggestions-refresh"
                onClick={loadSuggestions}
                disabled={loadingSuggestions}
                title="Recargar sugerencias"
              >
                Actualizar
              </button>
            </div>

            {/* Buscador de sugerencias */}
            <div className="jf-sug-search-wrap">
              <input
                type="text"
                className="jf-input jf-sug-search-input"
                placeholder="Filtrar por canción, artista o usuario…"
                value={sugSearch}
                onChange={(e) => setSugSearch(e.target.value)}
              />
            </div>

            {loadingSuggestions ? (
              <div className="jf-suggestions-loading">
                <SpinnerGap size={26} className="jf-spin" />
                <p>Cargando sugerencias de la base de datos…</p>
              </div>
            ) : (() => {
              const q = sugSearch.trim().toLowerCase();
              const filtered = suggestions.filter((s) => {
                if (sugStatusFilter !== 'all' && s.status !== sugStatusFilter) return false;
                if (!q) return true;
                return (
                  String(s.title || '').toLowerCase().includes(q) ||
                  (s.artist && s.artist.toLowerCase().includes(q)) ||
                  (s.suggested_by && s.suggested_by.toLowerCase().includes(q)) ||
                  (s.notes && s.notes.toLowerCase().includes(q))
                );
              });

              if (filtered.length === 0) {
                return (
                  <div className="jf-suggestions-empty">
                    <MusicNotes size={42} weight="duotone" />
                    <p>No hay sugerencias en esta vista</p>
                    <span>
                      {sugSearch
                        ? 'Prueba con otro término de búsqueda'
                        : 'Las canciones sugeridas por la comunidad aparecerán aquí para revisión.'}
                    </span>
                  </div>
                );
              }

              return (
                <div className="jf-suggestions-list">
                  {filtered.map((sug) => (
                    <div
                      key={sug.id}
                      className={`jf-suggestion-card ${sug.status === 'pending' ? 'is-pending' : 'is-approved'}`}
                    >
                      <div className="jf-sug-card-media">
                        {sug.thumbnail ? (
                          <img className="jf-suggestion-thumb" src={sug.thumbnail} alt="" />
                        ) : (
                          <div className="jf-suggestion-thumb jf-suggestion-thumb--empty">
                            <MusicNotes size={22} weight="duotone" />
                          </div>
                        )}
                        <button
                          type="button"
                          className="jf-sug-play-overlay-btn"
                          title="Probar y reproducir enlace"
                          onClick={() => {
                            const vSong = toVirtualSong({
                              id: sug.id,
                              title: sug.title,
                              artist: sug.artist,
                              album: sug.album,
                              thumbnail: sug.thumbnail,
                              stream_url: sug.stream_url || sug.url,
                              duration: sug.duration,
                            });
                            useLibraryStore.getState().upsertSong(vSong);
                            const p = usePlayerStore.getState();
                            p.setCurrentSong(vSong);
                            p.setIsPlaying(true);
                            p.setSourceUrl(vSong.url);
                            useToastStore.getState().show(`Reproduciendo «${sug.title}»`, 'success', 2000);
                          }}
                        >
                          <Play size={14} weight="fill" />
                        </button>
                      </div>

                      <div className="jf-suggestion-meta">
                        <div className="jf-suggestion-title-row">
                          <span className="jf-suggestion-title" title={sug.title}>{sug.title}</span>
                          <span className={`jf-suggestion-status is-${sug.status}`}>
                            {sug.status === 'approved' ? (
                              <>
                                <CheckCircle size={12} weight="fill" /> Aprobada
                              </>
                            ) : sug.status === 'rejected' ? (
                              'Rechazada'
                            ) : (
                              <>
                                <Sparkle size={12} weight="fill" /> Pendiente
                              </>
                            )}
                          </span>
                        </div>

                        <div className="jf-sug-artist-row">
                          <span className="jf-suggestion-artist">{sug.artist || 'Artista desconocido'}</span>
                          {sug.duration ? (
                            <span className="jf-sug-duration-pill">{formatTime(sug.duration)}</span>
                          ) : null}
                        </div>

                        <span className="jf-suggestion-by">
                          Sugerida por <strong>@{sug.suggested_by}</strong>
                          {sug.created_at ? ` · ${new Date(sug.created_at).toLocaleDateString()}` : ''}
                        </span>

                        {sug.notes && (
                          <div className="jf-sug-note-quote">
                            <span>«{sug.notes}»</span>
                          </div>
                        )}
                      </div>

                      <div className="jf-suggestion-actions">
                        {sug.status === 'pending' && (
                          <button
                            type="button"
                            className="jf-btn jf-btn--primary jf-btn-approve"
                            title="Descargar audio y agregarlo permanentemente a MongoDB"
                            disabled={approvingId === sug.id}
                            onClick={() => handleApprove(sug.id)}
                          >
                            {approvingId === sug.id ? (
                              <SpinnerGap size={14} className="jf-spin" />
                            ) : (
                              <Lightning size={14} weight="bold" />
                            )}
                            <span>Aprobar</span>
                          </button>
                        )}

                        {sug.status === 'approved' && (
                          <span className="jf-sug-approved-tag" title="Ya está en la base de datos">
                            <CheckCircle size={14} weight="fill" /> En BD
                          </span>
                        )}

                        <button
                          type="button"
                          className="jf-btn-icon jf-btn-danger"
                          title="Eliminar sugerencia"
                          onClick={() => handleDeleteSuggestion(sug.id)}
                        >
                          <Trash size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* MODAL / AVISO DE DUPLICADOS DETECTADOS */}
        <AnimatePresence>
          {showDuplicateAlert && (
            <motion.div
              className="jf-dup-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDuplicateAlert(false)}
            >
              <motion.div
                className="jf-dup-modal-content"
                initial={{ scale: 0.94, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.94, y: 15 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="jf-dup-modal-header">
                  <div className="jf-dup-modal-icon">
                    <Warning size={28} weight="fill" />
                  </div>
                  <div>
                    <h3 className="jf-dup-modal-title">¡Atención! Canciones Duplicadas Detectadas</h3>
                    <p className="jf-dup-modal-sub">
                      Detectamos que <strong>{duplicateItemsInSelected.length}</strong> de las {selectedItems.length} canciones seleccionadas ya existen en tu biblioteca (mismo título y artista).
                    </p>
                  </div>
                </div>

                <div className="jf-dup-list-preview">
                  <span className="jf-dup-list-title">Canciones ya presentes en tu colección:</span>
                  <div className="jf-dup-chips-scroll">
                    {duplicateItemsInSelected.slice(0, 12).map((dup, i) => (
                      <div key={i} className="jf-dup-chip">
                        <span className="jf-dup-chip-title">{dup.title}</span>
                        <span className="jf-dup-chip-artist">• {dup.artist || 'Artista'}</span>
                      </div>
                    ))}
                    {duplicateItemsInSelected.length > 12 && (
                      <div className="jf-dup-chip is-more">
                        +{duplicateItemsInSelected.length - 12} canciones más...
                      </div>
                    )}
                  </div>
                </div>

                <p className="jf-dup-modal-advice">
                  ¿Cómo prefieres proceder? Te recomendamos <strong>saltar los duplicados</strong> para evitar canciones repetidas en tu biblioteca.
                </p>

                <div className="jf-dup-modal-actions">
                  <button
                    type="button"
                    className="jf-btn jf-btn--secondary"
                    onClick={() => setShowDuplicateAlert(false)}
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    className="jf-btn jf-btn--ghost jf-dup-btn-all"
                    onClick={() => void executeImport(selectedItems, false)}
                    title="Agregar todas de todos modos"
                  >
                    Agregar todas ({selectedItems.length})
                  </button>

                  <button
                    type="button"
                    className="jf-btn jf-btn--primary jf-dup-btn-skip"
                    onClick={() => {
                      const newOnly = selectedItems.filter((it) => !checkDuplicate(it));
                      void executeImport(newOnly, true);
                    }}
                  >
                    <CheckCircle size={16} weight="fill" />
                    Saltar Duplicados (Agregar {selectedItems.length - duplicateItemsInSelected.length} nuevas)
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
