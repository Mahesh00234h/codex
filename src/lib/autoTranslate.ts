import { supabase } from '@/integrations/supabase/client';
import { DEMO_DATA_MODE } from '@/lib/backendMode';
import { safeLocalStorage } from '@/lib/safeStorage';

/**
 * Lightweight runtime translator: batches unique English strings,
 * caches results in localStorage, and asks the `translate-text`
 * edge function to translate the rest.
 */

const LS_PREFIX = 'fl_tr_';
const inflight = new Map<string, Promise<Record<string, string>>>();

function loadCache(lang: string): Record<string, string> {
  try {
    return JSON.parse(safeLocalStorage.getItem(LS_PREFIX + lang) || '{}');
  } catch {
    return {};
  }
}
function saveCache(lang: string, cache: Record<string, string>) {
  try {
    safeLocalStorage.setItem(LS_PREFIX + lang, JSON.stringify(cache));
  } catch {}
}

export async function translateBatch(
  texts: string[],
  lang: string,
): Promise<Record<string, string>> {
  if (DEMO_DATA_MODE || lang === 'en' || !texts.length) {
    return Object.fromEntries(texts.map((t) => [t, t]));
  }
  const cache = loadCache(lang);
  const missing = Array.from(new Set(texts.filter((t) => !(t in cache))));
  if (!missing.length) return cache;

  const key = lang + '::' + missing.slice(0, 5).join('|') + '::' + missing.length;
  if (inflight.has(key)) return inflight.get(key)!;

  const p = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke('translate-text', {
        body: { texts: missing, targetLang: lang },
      });
      if (error) throw error;
      const translations: string[] = data?.translations || missing;
      missing.forEach((src, i) => {
        cache[src] = translations[i] || src;
      });
      saveCache(lang, cache);
      return cache;
    } catch (e) {
      console.warn('translateBatch failed', e);
      return cache;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

export function getCachedTranslation(text: string, lang: string): string | null {
  if (DEMO_DATA_MODE || lang === 'en') return text;
  const cache = loadCache(lang);
  return cache[text] ?? null;
}
