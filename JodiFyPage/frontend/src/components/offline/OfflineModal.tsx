import { WifiSlash, ArrowClockwise } from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { enterOfflineMode } from '../../hooks/useOffline';

export function OfflineModal() {
  return (
    <Modal name="offline" title="Estás sin conexión" width={420}>
      <div className="jf-offline">
        <WifiSlash size={40} weight="light" className="jf-offline-icon" />
        <p>La conexión se perdió. Puedes escuchar tus canciones descargadas.</p>
        <Button variant="primary" size="sm" onClick={() => void enterOfflineMode()}>
          Modo offline
        </Button>
        <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
          <ArrowClockwise size={14} /> Reintentar conexión
        </Button>
      </div>
    </Modal>
  );
}
