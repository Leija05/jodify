import { useCallback, useEffect, useState, useRef } from 'react';
import {
  CloudArrowUp,
  CheckCircle,
  Trash,
  ArrowClockwise,
  DownloadSimple,
  Sparkle,
  FileArchive,
  Info,
} from '@phosphor-icons/react';
import { Button } from '../ui/Button';
import { devService } from '../../services/dev.service';
import { useToastStore } from '../../store/toast.store';
import { API_BASE } from '../../lib/api';
import { confirmDialog } from '../../store/confirm.store';
import type { AppUpdateItem } from '../../lib/types';

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 MB';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function DevUpdates() {
  const [updates, setUpdates] = useState<AppUpdateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Form fields
  const [uploadMode, setUploadMode] = useState<'url' | 'file'>('url');
  const [externalUrl, setExternalUrl] = useState('');
  const [sizeMB, setSizeMB] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [version, setVersion] = useState('');
  const [buildNumber, setBuildNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [mandatory, setMandatory] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadUpdates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await devService.listAppUpdates();
      setUpdates(data);
    } catch (err) {
      useToastStore.getState().show(
        err instanceof Error ? err.message : 'Error al cargar lista de actualizaciones',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUpdates();
  }, [loadUpdates]);

  const handleFileSelect = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.apk')) {
      useToastStore.getState().show('Solo se permiten archivos binarios .apk', 'warning');
      return;
    }
    setSelectedFile(file);

    // Try to auto-infer version from filename like JodiFy-v2.0.1.apk or app-release.apk
    const match = file.name.match(/v?(\d+\.\d+(\.\d+)?)/i);
    if (match && match[1] && !version) {
      setVersion(match[1]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadMode === 'file') {
      if (!selectedFile) {
        useToastStore.getState().show('Selecciona un archivo APK primero', 'warning');
        return;
      }
    } else {
      if (!externalUrl.trim()) {
        useToastStore.getState().show('Ingresa la URL directa de descarga del APK', 'warning');
        return;
      }
      if (!externalUrl.trim().startsWith('http://') && !externalUrl.trim().startsWith('https://')) {
        useToastStore.getState().show('La URL de descarga debe comenzar con http:// o https://', 'warning');
        return;
      }
    }

    if (!version.trim()) {
      useToastStore.getState().show('Especifica el número de versión (ej: 1.0.1)', 'warning');
      return;
    }

    const formData = new FormData();
    if (uploadMode === 'file' && selectedFile) {
      formData.append('file', selectedFile);
    } else {
      formData.append('download_url', externalUrl.trim());
      if (sizeMB.trim()) {
        const bytes = Math.round(parseFloat(sizeMB.trim()) * 1024 * 1024);
        if (bytes > 0) formData.append('size_bytes', String(bytes));
      }
    }
    formData.append('version', version.trim());
    if (buildNumber.trim()) {
      formData.append('build_number', buildNumber.trim());
    }
    formData.append('release_notes', notes.trim());
    formData.append('mandatory', mandatory ? 'true' : 'false');
    formData.append('platform', 'android');

    setUploading(true);
    setUploadProgress(0);

    try {
      const res = await devService.uploadAppUpdate(formData, (percent) => {
        setUploadProgress(percent);
      });
      useToastStore.getState().show(res.message || 'Actualización publicada con éxito', 'success');

      // Reset form
      setSelectedFile(null);
      setExternalUrl('');
      setSizeMB('');
      setVersion('');
      setBuildNumber('');
      setNotes('');
      setMandatory(false);
      if (fileInputRef.current) fileInputRef.current.value = '';

      void loadUpdates();
    } catch (err) {
      useToastStore.getState().show(
        err instanceof Error ? err.message : 'Error al publicar la actualización',
        'error'
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleActivate = async (updateId: string) => {
    setBusyId(updateId);
    try {
      const res = await devService.activateAppUpdate(updateId);
      useToastStore.getState().show(res.message, 'success');
      void loadUpdates();
    } catch (err) {
      useToastStore.getState().show(
        err instanceof Error ? err.message : 'Error al activar versión',
        'error'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (updateId: string, ver: string) => {
    const ok = await confirmDialog({
      title: `Eliminar versión v${ver}`,
      message: `¿Estás seguro de que deseas eliminar la versión v${ver} de la base de datos? Esta acción es irreversible.`,
      confirmLabel: 'Eliminar',
      tone: 'danger',
      icon: 'trash',
    });
    if (!ok) return;
    setBusyId(updateId);
    try {
      const res = await devService.deleteAppUpdate(updateId);
      useToastStore.getState().show(res.message, 'success');
      void loadUpdates();
    } catch (err) {
      useToastStore.getState().show(
        err instanceof Error ? err.message : 'Error al eliminar versión',
        'error'
      );
    } finally {
      setBusyId(null);
    }
  };

  const activeRelease = updates.find((u) => u.is_active);

  return (
    <div className="dev-updates-panel" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Info Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(127,0,255,0.15), rgba(0,229,255,0.08))',
          border: '1px solid rgba(127,0,255,0.3)',
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CloudArrowUp size={22} color="#00e5ff" />
            <h3 style={{ margin: 0, fontSize: 16, color: '#fff', fontWeight: 600 }}>
              Gestión de Actualizaciones Móviles (APKs)
            </h3>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted, #8e8e93)' }}>
            Los APKs se almacenan directamente en MongoDB (GridFS). Las apps de JodiFy detectan y descargan automáticamente la versión activa.
          </p>
        </div>

        <Button
          variant="glass"
          size="sm"
          onClick={() => void loadUpdates()}
          disabled={loading}
        >
          <ArrowClockwise size={16} className={loading ? 'spin' : ''} style={{ marginRight: 6 }} />
          Refrescar
        </Button>
      </div>

      {/* Active Release Card */}
      <div
        style={{
          background: 'var(--surface, #141416)',
          border: activeRelease ? '1px solid rgba(0,230,118,0.35)' : '1px solid var(--border, #26262a)',
          borderRadius: 12,
          padding: 18,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.8,
                padding: '2px 8px',
                borderRadius: 99,
                background: activeRelease ? 'rgba(0,230,118,0.2)' : 'rgba(255,255,255,0.1)',
                color: activeRelease ? '#00e676' : '#888',
                border: activeRelease ? '1px solid #00e676' : '1px solid #444',
              }}
            >
              {activeRelease ? 'VERSIÓN ACTIVA EN PRODUCCIÓN' : 'SIN VERSIÓN ACTIVA'}
            </span>
            {activeRelease && (
              <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>
                v{activeRelease.version} (Build #{activeRelease.build_number})
              </span>
            )}
          </div>
          {activeRelease ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted, #aaa)', lineHeight: 1.5 }}>
              Archivo: <strong style={{ color: '#fff' }}>{activeRelease.filename}</strong> · Tamaño: {formatBytes(activeRelease.size_bytes)} · Subida: {formatDate(activeRelease.created_at)} por @{activeRelease.uploaded_by || 'dev'}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#888' }}>
              No hay ninguna actualización activa configurada. Sube un APK abajo para comenzar.
            </div>
          )}
        </div>

        {activeRelease && (
          <a
            href={`${API_BASE}${activeRelease.download_url}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              background: 'rgba(0,229,255,0.15)',
              color: '#00e5ff',
              border: '1px solid rgba(0,229,255,0.3)',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <DownloadSimple size={16} /> Descargar APK Activo
          </a>
        )}
      </div>

      {/* Upload Form Box */}
      <div
        style={{
          background: 'var(--surface, #141416)',
          border: '1px solid var(--border, #26262a)',
          borderRadius: 12,
          padding: 20,
        }}
      >
        <h4 style={{ margin: '0 0 16px', fontSize: 15, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkle size={18} color="#7f00ff" /> Publicar Nueva Actualización (.apk)
        </h4>

        {/* Mode Selector */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => setUploadMode('url')}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 8,
              border: uploadMode === 'url' ? '1px solid #00e5ff' : '1px solid rgba(255,255,255,0.1)',
              background: uploadMode === 'url' ? 'rgba(0,229,255,0.12)' : 'rgba(255,255,255,0.03)',
              color: uploadMode === 'url' ? '#00e5ff' : '#888',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
            }}
          >
            <CloudArrowUp size={16} /> URL de Descarga Directa (Recomendado)
          </button>
          <button
            type="button"
            onClick={() => setUploadMode('file')}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 8,
              border: uploadMode === 'file' ? '1px solid #7f00ff' : '1px solid rgba(255,255,255,0.1)',
              background: uploadMode === 'file' ? 'rgba(127,0,255,0.15)' : 'rgba(255,255,255,0.03)',
              color: uploadMode === 'file' ? '#c084fc' : '#888',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
            }}
          >
            <FileArchive size={16} /> Subir archivo .apk a MongoDB
          </button>
        </div>

        <form onSubmit={(e) => void handleUpload(e)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {uploadMode === 'url' ? (
            <div style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 10, padding: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#00e5ff', marginBottom: 6, fontWeight: 600 }}>
                URL Directa de Descarga del APK (GitHub Releases, CDN, Google Drive directo, etc.) *
              </label>
              <input
                type="url"
                placeholder="https://github.com/Leija05/jodify/releases/download/v1.0.1/Jodify-Release.apk"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                required={uploadMode === 'url'}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff',
                  fontSize: 14,
                }}
              />
              <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--text-muted, #888)', lineHeight: 1.5 }}>
                💡 <strong>Sin consumir los 512 MB de MongoDB Atlas:</strong> Aloja el APK en GitHub Releases u otro hosting gratuito. La base de datos solo almacena los metadatos de versión (menos de 1 KB). La app móvil descargará e instalará la actualización con la misma barra de progreso y velocidad en vivo.
              </div>
            </div>
          ) : (
            <>
              <div style={{ background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#ffb74d' }}>
                ⚠️ <strong>Aviso de cuota:</strong> MongoDB Atlas Free Tier tiene un límite de 512 MB para toda la base de datos. Subir un APK de ~55 MB puede exceder la cuota si tienes muchas canciones subidas.
              </div>
              {/* Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed rgba(127,0,255,0.4)',
                  borderRadius: 10,
                  padding: 24,
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: selectedFile ? 'rgba(127,0,255,0.08)' : 'rgba(255,255,255,0.02)',
                  transition: 'all 0.2s ease',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".apk"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
                {selectedFile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <FileArchive size={36} color="#00e5ff" />
                    <div style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>{selectedFile.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #888)' }}>
                      {formatBytes(selectedFile.size)} · Clic para cambiar archivo
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <CloudArrowUp size={36} color="#7f00ff" />
                    <div style={{ fontSize: 14, color: '#fff', fontWeight: 500 }}>
                      Arrastra aquí el archivo <strong style={{ color: '#00e5ff' }}>.apk</strong> o haz clic para examinar
                    </div>
                    <div style={{ fontSize: 12, color: '#777' }}>
                      El binario se almacenará fragmentado en GridFS para descargas rápidas y seguras
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Form Fields Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#aaa', marginBottom: 6, fontWeight: 600 }}>
                Versión Semver *
              </label>
              <input
                type="text"
                placeholder="ej: 2.0.1"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff',
                  fontSize: 14,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#aaa', marginBottom: 6, fontWeight: 600 }}>
                Número de Build (Opcional)
              </label>
              <input
                type="number"
                placeholder="ej: 21"
                value={buildNumber}
                onChange={(e) => setBuildNumber(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff',
                  fontSize: 14,
                }}
              />
            </div>

            {uploadMode === 'url' && (
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#aaa', marginBottom: 6, fontWeight: 600 }}>
                  Peso aproximado en MB (Opcional)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="ej: 54.5"
                  value={sizeMB}
                  onChange={(e) => setSizeMB(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff',
                    fontSize: 14,
                  }}
                />
              </div>
            )}
          </div>

          {/* Release Notes */}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#aaa', marginBottom: 6, fontWeight: 600 }}>
              Novedades / Changelog de la versión
            </label>
            <textarea
              placeholder="Escribe cada novedad en una línea separada, ej:&#10;- Nuevo ecualizador analógico con BassBoost&#10;- Letras sincronizadas en tiempo real&#10;- Corrección de bug de favoritos"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff',
                fontSize: 13,
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Mandatory Checkbox */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#ddd' }}>
            <input
              type="checkbox"
              checked={mandatory}
              onChange={(e) => setMandatory(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: '#7f00ff' }}
            />
            <span>Actualización obligatoria (bloquea el uso de versiones obsoletas)</span>
          </label>

          {/* Upload Progress Bar */}
          {uploading && (
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#fff', marginBottom: 6 }}>
                <span>Subiendo archivo a la base de datos...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${uploadProgress}%`,
                    background: 'linear-gradient(90deg, #7f00ff, #00e5ff)',
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="primary"
              disabled={uploading || !selectedFile}
            >
              <CloudArrowUp size={18} style={{ marginRight: 6 }} />
              {uploading ? `Subiendo (${uploadProgress}%)…` : 'Publicar y Activar Actualización'}
            </Button>
          </div>
        </form>
      </div>

      {/* Releases History Table */}
      <div
        style={{
          background: 'var(--surface, #141416)',
          border: '1px solid var(--border, #26262a)',
          borderRadius: 12,
          padding: 20,
        }}
      >
        <h4 style={{ margin: '0 0 16px', fontSize: 15, color: '#fff' }}>
          Historial de Versiones en Base de Datos ({updates.length})
        </h4>

        {updates.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: '#777', fontSize: 14 }}>
            <Info size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }} />
            No hay versiones registradas aún en la base de datos.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {updates.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: 10,
                  background: item.is_active ? 'rgba(0,230,118,0.06)' : 'rgba(255,255,255,0.02)',
                  border: item.is_active ? '1px solid rgba(0,230,118,0.3)' : '1px solid rgba(255,255,255,0.06)',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: item.is_active ? 'rgba(0,230,118,0.15)' : 'rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FileArchive size={22} color={item.is_active ? '#00e676' : '#aaa'} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <strong style={{ color: '#fff', fontSize: 14 }}>v{item.version}</strong>
                      {item.build_number > 0 && (
                        <span style={{ fontSize: 11, color: '#888' }}>Build #{item.build_number}</span>
                      )}
                      {item.is_active && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: '#00e676',
                            color: '#000',
                          }}
                        >
                          ACTIVA
                        </span>
                      )}
                      {item.mandatory && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: '#ff3d5c',
                            color: '#fff',
                          }}
                        >
                          OBLIGATORIA
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #888)', marginTop: 2 }}>
                      {item.filename} · {formatBytes(item.size_bytes)} · {formatDate(item.created_at)}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <a
                    href={`${API_BASE}${item.download_url}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 10px',
                      borderRadius: 6,
                      background: 'rgba(255,255,255,0.06)',
                      color: '#ddd',
                      textDecoration: 'none',
                      fontSize: 12,
                    }}
                  >
                    <DownloadSimple size={14} /> Descargar
                  </a>

                  {!item.is_active && (
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={() => void handleActivate(item.id)}
                      disabled={busyId === item.id}
                    >
                      <CheckCircle size={14} style={{ marginRight: 4 }} />
                      Activar
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleDelete(item.id, item.version)}
                    disabled={busyId === item.id}
                  >
                    <Trash size={14} color="#ff3d5c" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
