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
    description: 'Proev grundimport foerst og brug automatisk AI-fallback, naar siden kraever det.',
  },
  {
    value: 'ask_first',
    label: 'Ask me first',
    description: 'Brug grundimport foerst og spoerg, hvis AI bliver noedvendigt.',
  },
  {
    value: 'basic_only',
    label: 'Use basic import only',
    description: 'Brug kun direct parse og spring AI over.',
  },
];
