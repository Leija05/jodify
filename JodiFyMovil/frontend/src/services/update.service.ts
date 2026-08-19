import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REPO = 'Leija05/jodify';
const SKIPPED_KEY = 'jodify:skipped-version';
const LATEST_API = `https://api.github.com/repos/${REPO}/releases/latest`;

export interface ReleaseInfo {
  version: string;
  notes: string;
  apkUrl: string | null;
}

export interface UpdateCheckResult {
  available: boolean;
  current: string;
  latest: string;
  apkUrl: string | null;
  notes: string;
}

export function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/i, '').split('.').map(Number);
  const pb = b.replace(/^v/i, '').split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

export function currentAppVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}

async function fetchLatestRelease(): Promise<ReleaseInfo | null> {
  const res = await fetch(LATEST_API, { headers: { Accept: 'application/vnd.github+json' } });
  if (!res.ok) return null;
  const json = await res.json();
  const asset = (json.assets ?? []).find((a: { name: string }) => a.name.endsWith('.apk'));
  return {
    version: String(json.tag_name ?? '').replace(/^v/i, ''),
    notes: String(json.body ?? ''),
    apkUrl: asset ? (asset.browser_download_url as string) : null,
  };
}

export async function checkForUpdate(): Promise<UpdateCheckResult | null> {
  try {
    const release = await fetchLatestRelease();
    if (!release) return null;
    const current = currentAppVersion();
    return {
      available: compareVersions(release.version, current) > 0,
      current,
      latest: release.version,
      apkUrl: release.apkUrl,
      notes: release.notes,
    };
  } catch {
    return null;
  }
}

export async function getSkippedVersion(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(SKIPPED_KEY);
  } catch {
    return null;
  }
}

export async function skipVersion(version: string): Promise<void> {
  try {
    await AsyncStorage.setItem(SKIPPED_KEY, version);
  } catch {
    // sin almacenamiento: se vuelve a preguntar en el próximo arranque
  }
}

export async function installUpdate(apkUrl: string): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') return false;
    const file = new File(Paths.cache, 'jodify-update.apk');
    if (file.exists) file.delete();
    await File.downloadFileAsync(apkUrl, file);
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: file.uri,
      type: 'application/vnd.android.package-archive',
      flags: 1,
    });
    return true;
  } catch {
    return false;
  }
}