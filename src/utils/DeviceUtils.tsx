import { getVersion, getTauriVersion } from '@tauri-apps/api/app';

// 设备信息与设备唯一 ID 工具
// - deviceId：首次生成并存入 localStorage，后续复用
// - collectDeviceInfo：采集基础设备与应用信息（平台、UA、语言、屏幕、版本等）

const DEVICE_UID_KEY = 'device.uid';

function generateUid(): string {
  try {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    // Fallback: 时间戳 + 随机数
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

export function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_UID_KEY);
    if (existing) return existing;
    const uid = generateUid();
    localStorage.setItem(DEVICE_UID_KEY, uid);
    return uid;
  } catch {
    return generateUid();
  }
}

export async function collectDeviceInfo(): Promise<Record<string, unknown>> {
  const deviceId = getOrCreateDeviceId();
  const platform =
    typeof navigator !== 'undefined' ? navigator.platform : undefined;
  const userAgent =
    typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
  const language =
    typeof navigator !== 'undefined' ? navigator.language : undefined;
  const screenInfo =
    typeof screen !== 'undefined'
      ? { width: screen.width, height: screen.height }
      : undefined;
  const pixelRatio =
    typeof window !== 'undefined' ? window.devicePixelRatio : undefined;

  let appVersion: string | null = null;
  let tauriVersion: string | null = null;
  try {
    appVersion = await getVersion();
  } catch {}
  try {
    tauriVersion = await getTauriVersion();
  } catch {}

  return {
    deviceId,
    platform,
    userAgent,
    language,
    screen: screenInfo,
    pixelRatio,
    appVersion,
    tauriVersion,
  };
}
