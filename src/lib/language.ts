import i18n from '@/i18n';

const LANG_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi (हिंदी)',
  mr: 'Marathi (मराठी)',
  te: 'Telugu (తెలుగు)',
};

/** Current i18n language code (e.g. 'en', 'hi'). */
export function getCurrentLangCode(): string {
  return (i18n.language || 'en').split('-')[0];
}

/** Human-readable language name for AI prompts. */
export function getCurrentLangName(): string {
  return LANG_NAMES[getCurrentLangCode()] || 'English';
}

/**
 * Headers to forward the user's preferred language to edge functions.
 * Edge functions read `x-language` and instruct the AI / external APIs
 * to respond in that language.
 */
export function langHeaders(): Record<string, string> {
  return {
    'x-language': getCurrentLangCode(),
    'x-language-name': getCurrentLangName(),
  };
}