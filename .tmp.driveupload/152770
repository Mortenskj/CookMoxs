export type ImportPreference = 'ai_auto' | 'ask_first' | 'basic_only';

export const DEFAULT_IMPORT_PREFERENCE: ImportPreference = 'ai_auto';

export const IMPORT_PREFERENCE_OPTIONS: Array<{
  value: ImportPreference;
  label: string;
  description: string;
}> = [
  {
    value: 'ai_auto',
    label: 'Improve automatically with AI',
    description: 'Prøv grundimport først og brug automatisk AI-fallback, når siden kræver det.',
  },
  {
    value: 'ask_first',
    label: 'Ask me first',
    description: 'Brug grundimport først og spørg, hvis AI bliver nødvendigt.',
  },
  {
    value: 'basic_only',
    label: 'Use basic import only',
    description: 'Brug kun direct parse og spring AI over.',
  },
];
