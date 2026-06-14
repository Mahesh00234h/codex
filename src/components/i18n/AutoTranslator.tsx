import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { translateBatch, getCachedTranslation } from '@/lib/autoTranslate';

/**
 * Walks the DOM and replaces ASCII/Latin text nodes with translations
 * for the active language. Re-runs on language change and on DOM mutations.
 * Designed to translate dynamic / hard-coded English strings (server data,
 * un-i18n'd UI labels, AI output already rendered in markdown, etc.).
 */

const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA', 'INPUT',
  'SVG', 'PATH', 'CANVAS', 'IFRAME',
]);

// Heuristic: looks like English (has at least 2 latin letters, no Devanagari/Telugu)
const NON_LATIN = /[\u0900-\u097F\u0C00-\u0C7F\u0980-\u09FF\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0D00-\u0D7F]/;
const LATIN_WORD = /[A-Za-z]{2,}/;

function isTranslatable(text: string): boolean {
  const t = text.trim();
  if (t.length < 2 || t.length > 400) return false;
  if (NON_LATIN.test(t)) return false;
  if (!LATIN_WORD.test(t)) return false;
  // Pure numbers/symbols
  if (/^[\d\s₹.,%/+\-:]+$/.test(t)) return false;
  return true;
}

export default function AutoTranslator() {
  const { i18n } = useTranslation();
  const observerRef = useRef<MutationObserver | null>(null);
  const pendingRef = useRef<Set<Text>>(new Set());
  const scheduledRef = useRef(false);
  const originalsRef = useRef<WeakMap<Text, string>>(new WeakMap());

  useEffect(() => {
    const lang = (i18n.language || 'en').split('-')[0];

    const collect = (root: Node) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
          const parent = (node as Text).parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
          if (parent.closest('[data-no-translate]')) return NodeFilter.FILTER_REJECT;
          if (parent.isContentEditable) return NodeFilter.FILTER_REJECT;
          const text = (node as Text).nodeValue || '';
          if (!isTranslatable(text)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      let n: Node | null;
      while ((n = walker.nextNode())) pendingRef.current.add(n as Text);
    };

    const flush = async () => {
      scheduledRef.current = false;
      const nodes = Array.from(pendingRef.current);
      pendingRef.current.clear();
      if (!nodes.length || lang === 'en') {
        // restore originals if switching back to English
        if (lang === 'en') {
          nodes.forEach((node) => {
            const orig = originalsRef.current.get(node);
            if (orig != null && node.nodeValue !== orig) node.nodeValue = orig;
          });
        }
        return;
      }

      // Save originals once
      const sources: string[] = [];
      nodes.forEach((node) => {
        const orig = originalsRef.current.get(node) ?? (node.nodeValue || '');
        if (!originalsRef.current.has(node)) originalsRef.current.set(node, orig);
        sources.push(orig.trim());
      });

      // Apply cached translations immediately
      nodes.forEach((node, i) => {
        const cached = getCachedTranslation(sources[i], lang);
        if (cached && cached !== sources[i]) {
          // Preserve surrounding whitespace
          const orig = node.nodeValue || '';
          node.nodeValue = orig.replace(orig.trim(), cached);
        }
      });

      const uncached = sources.filter((s) => !getCachedTranslation(s, lang));
      if (!uncached.length) return;

      const map = await translateBatch(uncached, lang);
      nodes.forEach((node, i) => {
        const src = sources[i];
        const tr = map[src];
        if (tr && tr !== src) {
          const orig = node.nodeValue || '';
          node.nodeValue = orig.replace(orig.trim(), tr);
        }
      });
    };

    const schedule = () => {
      if (scheduledRef.current) return;
      scheduledRef.current = true;
      // batch a tick of DOM updates
      setTimeout(flush, 250);
    };

    // Initial pass
    collect(document.body);
    schedule();

    // Observe future DOM changes
    observerRef.current?.disconnect();
    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = (node as Text).nodeValue || '';
            if (isTranslatable(text)) pendingRef.current.add(node as Text);
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            collect(node);
          }
        });
        if (m.type === 'characterData' && m.target.nodeType === Node.TEXT_NODE) {
          const t = m.target as Text;
          const text = t.nodeValue || '';
          if (isTranslatable(text)) {
            // New content -> reset original
            originalsRef.current.delete(t);
            pendingRef.current.add(t);
          }
        }
      }
      schedule();
    });
    obs.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    observerRef.current = obs;

    return () => {
      obs.disconnect();
      observerRef.current = null;
    };
  }, [i18n.language]);

  return null;
}