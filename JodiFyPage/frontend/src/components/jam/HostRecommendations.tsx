import { Queue, Play, X } from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { useJamStore } from '../../store/jam.store';
import { resolveHostRecommendation } from '../../services/jam.service';

export function HostRecommendations() {
  const pending = useJamStore((s) => s.pendingRecommendations);

  return (
    <Modal name="jamHostRecommendations" title="Recomendaciones" width={440}>
      {pending.length === 0 ? (
        <EmptyState title="Sin recomendaciones" description="Los miembros te enviarán canciones para que las agregues o reproduzcas." />
      ) : (
        <div className="jf-host-recs">
          {pending.map((rec, index) => (
            <div key={`${rec.timestamp}-${rec.songId}`} className="jf-host-rec">
              <div className="jf-host-rec-info">
                <p className="jf-host-rec-name">{rec.songName}</p>
                <p className="jf-host-rec-user">recomendada por {rec.username}</p>
              </div>
              <div className="jf-host-rec-actions">
                <Button variant="glass" size="sm" onClick={() => void resolveHostRecommendation(index, 'queue')}>
                  <Queue size={14} /> Cola
                </Button>
                <Button variant="primary" size="sm" onClick={() => void resolveHostRecommendation(index, 'play')}>
                  <Play size={14} weight="fill" /> Reproducir
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void resolveHostRecommendation(index, 'reject')}>
                  <X size={14} /> Descartar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
