type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const memoryStorage = new Map<string, string>();

function getStorage(kind: 'localStorage' | 'sessionStorage'): StorageLike | null {
  if (typeof window === 'undefined') return null;

  try {
    const storage = window[kind];
    const probeKey = `farmaline:${kind}:probe`;
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return null;
  }
}

export const safeLocalStorage: StorageLike = {
  getItem(key: string) {
    const storage = getStorage('localStorage');
    if (!storage) return memoryStorage.get(key) ?? null;

    try {
      return storage.getItem(key);
    } catch {
      return memoryStorage.get(key) ?? null;
    }
  },
  setItem(key: string, value: string) {
    const storage = getStorage('localStorage');
    memoryStorage.set(key, value);

    if (!storage) return;
    try {
      storage.setItem(key, value);
    } catch {
      // Keep the in-memory fallback updated.
    }
  },
  removeItem(key: string) {
    const storage = getStorage('localStorage');
    memoryStorage.delete(key);

    if (!storage) return;
    try {
      storage.removeItem(key);
    } catch {
      // In-memory fallback has already been cleared.
    }
  },
};

