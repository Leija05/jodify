import { useState } from 'react';
import {
  Keyboard,
  PlayCircle,
  MagnifyingGlass,
  SlidersHorizontal,
  Sparkle,
  X,
} from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';

interface ShortcutItem {
  keys: string[];
  action: string;
  badge?: string;
}

interface ShortcutCategory {
  title: string;
  icon: typeof Keyboard;
  color: string;
  items: ShortcutItem[];
}

const CATEGORIES: ShortcutCategory[] = [
  {
    title: 'Reproducción & Audio',
    icon: PlayCircle,
    color: '#00e5ff',
    items: [
      { keys: ['Espacio'], action: 'Reproducir / Pausar audio' },
      { keys: ['N', 'P'], action: 'Siguiente / Anterior canción' },
      { keys: ['↑', '↓'], action: 'Subir / Bajar volumen (±5%)' },
      { keys: ['L'], action: 'Guardar / Quitar de Me Gusta ❤️', badge: 'Favoritas' },
      { keys: ['M'], action: 'Silenciar / Restaurar volumen' },
      { keys: ['S'], action: 'Alternar modo aleatorio (Shuffle)' },
      { keys: ['R'], action: 'Alternar repetición (Loop)' },
    ],
  },
  {
    title: 'Búsqueda & Navegación',
    icon: MagnifyingGlass,
    color: '#a855f7',
    items: [
      { keys: ['Ctrl', 'K'], action: 'Enfocar buscador de música al instante', badge: 'Nuevo' },
      { keys: ['/'], action: 'Enfoque rápido de búsqueda' },
      { keys: ['Esc'], action: 'Limpiar buscador / Cerrar modales' },
      { keys: ['T'], action: 'Alternar vista Karaoke y Letras sincronizadas' },
    ],
  },
  {
    title: 'Paneles & Herramientas',
    icon: SlidersHorizontal,
    color: '#00ff88',
    items: [
      { keys: ['Q'], action: 'Abrir / Cerrar cola de reproducción' },
      { keys: ['E'], action: 'Abrir ecualizador de 8 bandas' },
      { keys: ['J'], action: 'Abrir sesión Jam compartida' },
      { keys: ['F'], action: 'Pantalla completa inmersiva' },
      { keys: ['?'], action: 'Abrir esta guía de atajos de teclado' },
      { keys: ['Ctrl', 'Shift', 'D'], action: 'Acceso a consola de desarrollo (Dev)', badge: 'Admin/Dev' },
    ],
  },
];

export function ShortcutsModal() {
  const [filter, setFilter] = useState('');

  const q = filter.trim().toLowerCase();

  const filteredCategories = CATEGORIES.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (item) =>
        !q ||
        item.action.toLowerCase().includes(q) ||
        item.keys.some((k) => k.toLowerCase().includes(q)) ||
        (item.badge && item.badge.toLowerCase().includes(q))
    ),
  })).filter((cat) => cat.items.length > 0);

  return (
    <Modal name="shortcuts" title="Atajos de Teclado" width={560}>
      <div className="jf-shortcuts-modal-container">
        {/* Barra superior con buscador de atajos */}
        <div className="jf-shortcuts-search-bar">
          <MagnifyingGlass size={16} className="jf-shortcuts-search-icon" />
          <input
            type="text"
            className="jf-shortcuts-search-input"
            placeholder="Filtrar atajos (ej. buscar, volumen, me gusta)…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            autoFocus
          />
          {filter && (
            <button
              type="button"
              className="jf-shortcuts-clear-btn"
              onClick={() => setFilter('')}
              title="Limpiar filtro"
            >
              <X size={13} weight="bold" />
            </button>
          )}
        </div>

        {/* Listado categorizado */}
        <div className="jf-shortcuts-scroll-area">
          {filteredCategories.length === 0 ? (
            <div className="jf-shortcuts-empty">
              <Keyboard size={36} weight="duotone" />
              <p>No se encontraron atajos para «{filter}»</p>
            </div>
          ) : (
            filteredCategories.map((category) => {
              const IconComp = category.icon;
              return (
                <div key={category.title} className="jf-shortcuts-category-section">
                  <div className="jf-shortcuts-category-header">
                    <div
                      className="jf-shortcuts-category-icon-wrap"
                      style={{ color: category.color, borderColor: `${category.color}33`, background: `${category.color}15` }}
                    >
                      <IconComp size={15} weight="bold" />
                    </div>
                    <span className="jf-shortcuts-category-title">{category.title}</span>
                  </div>

                  <div className="jf-shortcuts-grid">
                    {category.items.map((item, idx) => (
                      <div key={idx} className="jf-shortcuts-row-card">
                        <span className="jf-shortcuts-action-desc">
                          {item.action}
                          {item.badge && (
                            <span className="jf-shortcuts-pill-badge">{item.badge}</span>
                          )}
                        </span>
                        <div className="jf-shortcuts-keys-group">
                          {item.keys.map((k, kIdx) => (
                            <span key={kIdx} className="jf-shortcuts-key-wrap">
                              <kbd className="jf-shortcuts-kbd">{k}</kbd>
                              {kIdx < item.keys.length - 1 && <span className="jf-shortcuts-plus">+</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer con tip */}
        <div className="jf-shortcuts-footer-hint">
          <Sparkle size={14} weight="fill" />
          <span>Tip: Presiona <kbd className="jf-shortcuts-kbd-sm">?</kbd> en cualquier pantalla para abrir esta guía.</span>
        </div>
      </div>
    </Modal>
  );
}
