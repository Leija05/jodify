import { NativeModules, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import { apiFetch } from './api';
import { API_BASE } from '../lib/constants';

export interface UpdateCheckResult {
  update_available: boolean;
  id?: string;
  version?: string;
  build_number?: number;
  current_version?: string;
  release_notes?: string;
  size_bytes?: number;
  sha256?: string;
  mandatory?: boolean;
  download_url?: string;
  filename?: string;
  uploaded_at?: string;
  message?: string;
}

export interface DownloadProgressData {
  percent: number;
  downloadedBytes: number;
  totalBytes: number;
  speedMBps: number;
  remainingSeconds: number;
}

export function currentAppVersion(): string {
  return (
    Constants.nativeAppVersion ||
    Constants.expoConfig?.version ||
    '1.0.1'
  );
}

export function currentBuildNumber(): number {
  const raw = Constants.nativeBuildVersion || Constants.expoConfig?.android?.versionCode;
  return raw ? parseInt(String(raw), 10) : 2;
}

export function resolveAbsoluteDownloadUrl(relativeOrAbsolute: string): string {
  if (relativeOrAbsolute.startsWith('http://') || relativeOrAbsolute.startsWith('https://')) {
    return relativeOrAbsolute;
  }
  const base = (API_BASE || 'https://jodify-backend.onrender.com').replace(/\/+$/, '');
  const cleanPath = relativeOrAbsolute.startsWith('/') ? relativeOrAbsolute : `/${relativeOrAbsolute}`;
  return `${base}${cleanPath}`;
}

export async function checkForAppUpdate(): Promise<UpdateCheckResult> {
  const version = currentAppVersion();
  const build = currentBuildNumber();
  const platform = Platform.OS === 'android' ? 'android' : 'ios';

  return apiFetch<UpdateCheckResult>(
    `/api/updates/check?platform=${platform}&current_version=${encodeURIComponent(version)}&build_number=${build}`,
    { timeoutMs: 12000 }
  );
}

export async function downloadApkWithProgress(
  downloadUrl: string,
  targetFilename: string,
  onProgress: (progress: DownloadProgressData) => void,
  cancelRef?: { current: (() => void) | null }
): Promise<string> {
  const absoluteUrl = resolveAbsoluteDownloadUrl(downloadUrl);
  const updatesDir = `${FileSystem.cacheDirectory}updates/`;

  const dirInfo = await FileSystem.getInfoAsync(updatesDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(updatesDir, { intermediates: true });
  }

  const destinationUri = `${updatesDir}${targetFilename}`;

  // Check if this exact file was already downloaded
  const existing = await FileSystem.getInfoAsync(destinationUri);
  if (existing.exists && existing.size && existing.size > 1000000) {
    // If already downloaded and valid, report 100%
    onProgress({
      percent: 100,
      downloadedBytes: existing.size,
      totalBytes: existing.size,
      speedMBps: 0,
      remainingSeconds: 0,
    });
    return destinationUri;
  }

  const startTime = Date.now();

  const downloadResumable = FileSystem.createDownloadResumable(
    absoluteUrl,
    destinationUri,
    {},
    (progress) => {
      const { totalBytesWritten, totalBytesExpectedToWrite } = progress;
      const total = totalBytesExpectedToWrite > 0 ? totalBytesExpectedToWrite : 50 * 1024 * 1024;
      const percent = Math.min(100, Math.max(1, Math.round((totalBytesWritten / total) * 100)));

      const now = Date.now();
      const elapsedSeconds = Math.max(0.2, (now - startTime) / 1000);
      const bytesPerSec = totalBytesWritten / elapsedSeconds;
      const speedMBps = parseFloat((bytesPerSec / (1024 * 1024)).toFixed(2));

      const remainingBytes = Math.max(0, total - totalBytesWritten);
      const remainingSeconds = speedMBps > 0 ? Math.ceil(remainingBytes / (bytesPerSec || 1)) : 0;

      onProgress({
        percent,
        downloadedBytes: totalBytesWritten,
        totalBytes: total,
        speedMBps: Math.max(0.1, speedMBps),
        remainingSeconds,
      });
    }
  );

  if (cancelRef) {
    cancelRef.current = () => {
      void downloadResumable.cancelAsync();
    };
  }

  const result = await downloadResumable.downloadAsync();
  if (!result || !result.uri) {
    throw new Error('La descarga del archivo APK no se completó');
  }

  return result.uri;
}

export async function installDownloadedApk(fileUri: string): Promise<boolean> {
  if (Platform.OS !== 'android') {
    throw new Error('La instalación de archivos APK solo está disponible en dispositivos Android.');
  }

  const installer = NativeModules.JodifyInstaller;
  if (!installer || typeof installer.installApk !== 'function') {
    throw new Error('Módulo nativo de instalación no disponible');
  }

  return installer.installApk(fileUri);
}