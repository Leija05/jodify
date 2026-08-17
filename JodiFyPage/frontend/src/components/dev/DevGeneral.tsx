import { useState } from 'react';
import {
  ArrowClockwise,
  Broadcast,
  Crown,
  DownloadSimple,
  Gauge,
  HardDrives,
  Heart,
  MusicNotes,
  ShieldCheck,
  TerminalWindow,
  Users,
  UsersThree,
} from '@phosphor-icons/react';
import { Button } from '../ui/Button';
import { Sparkline, StatTile, formatBytes, nf, timeAgo } from './devBits';
import { useToastStore } from '../../store/toast.store';
import { useLibraryStore } from '../../store/library.store';
import { logsService } from '../../services/social.service';
import { songsService } from '../../services/songs.service';
import type { DevOverview } from '../../lib/types';

export function DevGeneral({
  overview,
  plays,
}: {
  overview: DevOverview | null;
  plays: Array<{ date: string; count: number }>;
}) {
  const songCount = useLibraryStore((s) => s.songs.length);
  const [syncing, setSyncing] = useState(false);

  const sync = async () => {
    setSyncing(true);
    try {
      const { created } = await songsService.syncSeedSongs();
      const songs = await songsService.fetchAll();
      useLibraryStore.getState().setSongs(songs);
      useToastStore.getState().show(
        created > 0 ? `${created} canciones sincronizadas` : 'Biblioteca al día',
        created > 0 ? 'success' : 'info',
      );
      void logsService.add('sync', `Sincronización desde seed_audio: ${created} nueva(s)`);
    } catch {
      useToastStore.getState().show('No se pudo sincronizar', 'error');
    } finally {
      setSyncing(false);
    }
  };

  if (!overview) {
    return (
      <div className="jf-dev-panel">
        <div className="jf-dev-grid jf-dev-grid--stats">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="jf-dev-stat jf-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  const maintenance = overview.maintenance?.enabled;
  const topMax = Math.max(1, ...overview.top_songs.map((s) => s.count));

  return (
    <div className="jf-dev-panel">
      <div className="jf-dev-section-head">
        <h3 className="jf-dev-section-title">Pulso del servicio</h3>
        <span className="jf-dev-section-meta">
          <Broadcast size={12} weight="fill" /> actualizado {timeAgo(overview.server_time)}
        </span>
      </div>

      <div className="jf-dev-grid jf-dev-grid--stats">
        <StatTile icon={Users} label="usuarios" value={overview.users} />
        <StatTile icon={ShieldCheck} label="en línea" value={overview.online} tone="live" />
        <StatTile icon={MusicNotes} label="canciones" value={overview.songs} />
        <StatTile icon={Gauge} label="plays 24 h" value={overview.plays_24h} />
        <StatTile icon={TerminalWindow} label="plays totales" value={overview.plays_total} />
        <StatTile icon={Heart} label="likes" value={overview.likes} />
        <StatTile icon={DownloadSimple} label="descargas" value={overview.downloads} />
        <StatTile
          icon={HardDrives}
          label="almacenamiento"
          value={formatBytes(overview.storage?.fs_used ?? overview.storage?.data_size ?? 0)}
        />
        <StatTile icon={UsersThree} label="jam activas" value={overview.jams_active} />
        <StatTile icon={Crown} label="tokens activos" value={overview.tokens_active} tone={maintenance ? 'warn' : undefined} />
      </div>

      <div className="jf-dev-cols">
        <div className="jf-dev-card">
          <div className="jf-dev-card-head">
            <span>Actividad · {plays.length} días</span>
            <span className="jf-dev-card-sub">{nf.format(overview.plays_7d)} plays en 7 días</span>
          </div>
          <Sparkline data={plays} />
        </div>

        <div className="jf-dev-card">
          <div className="jf-dev-card-head">
            <span>Top reproducciones</span>
            <span className="jf-dev-card-sub">historial global</span>
          </div>
          {overview.top_songs.length === 0 ? (
            <p className="jf-dev-empty">Todavía no hay reproducciones. Dale play a algo.</p>
          ) : (
            <ol className="jf-dev-toplist">
              {overview.top_songs.map((song, index) => (
                <li key={`${song.song_name}-${index}`} className="jf-dev-toprow">
                  <span className={`jf-dev-rank ${index < 3 ? 'is-top' : ''}`}>{index + 1}</span>
                  <span className="jf-dev-topname">{song.song_name}</span>
                  <span className="jf-dev-topbar">
                    <span style={{ width: `${Math.max(8, Math.round((song.count / topMax) * 100))}%` }} />
                  </span>
                  <span className="jf-dev-topcount">{nf.format(song.count)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="jf-dev-card jf-dev-card--sync">
        <div>
          <span className="jf-dev-card-title">Biblioteca local</span>
          <span className="jf-dev-card-sub">
            {songCount} canciones en esta app · importa pendientes de seed_audio
          </span>
        </div>
        <Button variant="primary" size="sm" onClick={() => void sync()} disabled={syncing}>
          <ArrowClockwise size={14} className={syncing ? 'jf-spin' : ''} />
          {syncing ? 'Sincronizando…' : 'Sincronizar'}
        </Button>
      </div>
    </div>
  );
}
