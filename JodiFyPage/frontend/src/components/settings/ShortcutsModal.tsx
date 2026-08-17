import { Keyboard } from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';

const SHORTCUTS: Array<[string, string]> = [
  ['Espacio', 'Reproducir / Pausar'],
  ['N / P', 'Siguiente / Anterior'],
  ['↑ ↓', 'Volumen'],
  ['← →', 'Adelantar / Retroceder'],
  ['L', 'Me gusta'],
  ['M', 'Silenciar'],
  ['S', 'Aleatorio'],
  ['R', 'Repetir'],
  ['T', 'Cambiar tema'],
  ['Q', 'Cola'],
  ['E', 'Ecualizador'],
  ['J', 'Jam'],
  ['F', 'Pantalla grande'],
  ['?', 'Atajos'],
  ['Esc', 'Cerrar todo'],
];

export function ShortcutsModal() {
  return (
    <Modal name="shortcuts" title="Atajos de teclado" width={400}>
      <div className="jf-shortcuts">
        <Keyboard size={22} className="jf-shortcuts-icon" />
        <ul className="jf-shortcut-list">
          {SHORTCUTS.map(([key, action]) => (
            <li key={key} className="jf-shortcut-row">
              <kbd className="jf-shortcut-key">{key}</kbd>
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
