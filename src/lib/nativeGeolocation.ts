/**
 * Unified geolocation helper.
 * On native (Capacitor Android/iOS) it synchronously grabs the already-registered
 * Geolocation plugin from window.Capacitor.Plugins and explicitly requests
 * permission before reading position. On web it falls back to navigator.geolocation.
 *
 * The dynamic-import path was the source of an Android bug where the permission
 * dialog never appeared — keep this lookup synchronous.
 */

type CapPlugin = {
  getCurrentPosition: (opts?: any) => Promise<{ coords: GeolocationCoordinates; timestamp: number }>;
  watchPosition: (
    opts: any,
    cb: (pos: { coords: GeolocationCoordinates; timestamp: number } | null, err?: any) => void
  ) => Promise<string>;
  clearWatch: (opts: { id: string }) => Promise<void>;
  checkPermissions: () => Promise<{ location: string; coarseLocation?: string }>;
  requestPermissions: (opts?: { permissions: string[] }) => Promise<{ location: string; coarseLocation?: string }>;
};

function getCap(): CapPlugin | null {
  if (typeof window === 'undefined') return null;
  // Synchronous lookup — do NOT use dynamic import, it breaks Android permission flow.
  const plugins = (window as any).Capacitor?.Plugins;
  return plugins?.Geolocation ?? null;
}

export function isNative(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

export async function ensureLocationPermission(): Promise<boolean> {
  const cap = getCap();
  if (!cap) return true; // web — handled by browser prompt at call time
  try {
    const status = await cap.checkPermissions();
    if (status.location === 'granted' || status.coarseLocation === 'granted') return true;
    const req = await cap.requestPermissions({ permissions: ['location', 'coarseLocation'] });
    return req.location === 'granted' || req.coarseLocation === 'granted';
  } catch (e) {
    console.warn('Permission check failed', e);
    return false;
  }
}

export interface SimpleCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number | null;
  heading?: number | null;
}

export async function getCurrentPosition(opts: PositionOptions = { enableHighAccuracy: true, timeout: 15000 }): Promise<SimpleCoords> {
  const cap = getCap();
  if (cap) {
    const ok = await ensureLocationPermission();
    if (!ok) throw new Error('Location permission denied');
    const pos = await cap.getCurrentPosition(opts);
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      speed: pos.coords.speed,
      heading: pos.coords.heading,
    };
  }
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({
        latitude: p.coords.latitude,
        longitude: p.coords.longitude,
        accuracy: p.coords.accuracy,
        speed: p.coords.speed,
        heading: p.coords.heading,
      }),
      (err) => reject(err),
      opts
    );
  });
}

export interface WatchHandle {
  clear: () => void;
}

export async function watchPosition(
  cb: (coords: SimpleCoords) => void,
  onError?: (e: any) => void,
  opts: PositionOptions = { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
): Promise<WatchHandle> {
  const cap = getCap();
  if (cap) {
    const ok = await ensureLocationPermission();
    if (!ok) {
      onError?.(new Error('Location permission denied'));
      return { clear: () => {} };
    }
    const id = await cap.watchPosition(opts, (pos, err) => {
      if (err) return onError?.(err);
      if (!pos) return;
      cb({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        speed: pos.coords.speed,
        heading: pos.coords.heading,
      });
    });
    return { clear: () => { cap.clearWatch({ id }).catch(() => {}); } };
  }
  if (!navigator.geolocation) {
    onError?.(new Error('Geolocation not supported'));
    return { clear: () => {} };
  }
  const id = navigator.geolocation.watchPosition(
    (p) => cb({
      latitude: p.coords.latitude,
      longitude: p.coords.longitude,
      accuracy: p.coords.accuracy,
      speed: p.coords.speed,
      heading: p.coords.heading,
    }),
    (err) => onError?.(err),
    opts
  );
  return { clear: () => navigator.geolocation.clearWatch(id) };
}