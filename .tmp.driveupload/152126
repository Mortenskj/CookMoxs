export type ImportPreference = 'ai_auto' | 'ask_first' | 'basic_only';

export const DEFAULT_IMPORT_PREFERENCE: ImportPreference = 'ai_auto';

export const IMPORT_PREFERENCE_OPTIONS: Array<{
  value: ImportPreference;
  label: string;
  description: string;
}> = [
  {
    value: 'ai_auto',
    label: 'Brug AI automatisk',
    description: 'Prøv grundimport først, og brug AI automatisk hvis siden kræver det.',
  },
  {
    value: 'ask_first',
    label: 'Spørg mig først',
    description: 'Prøv grundimport først, og spørg før AI bruges.',
  },
  {
    value: 'basic_only',
    label: 'Kun grundimport',
    description: 'Brug kun grundimport, og spring AI over.',
  },
];
