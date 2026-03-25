export const SEASONAL_THEME_IDS = ['theme-spring', 'theme-summer', 'theme-autumn', 'theme-winter'] as const;

export type SeasonalThemeId = (typeof SEASONAL_THEME_IDS)[number];

export const DEFAULT_SEASONAL_THEME: SeasonalThemeId = 'theme-autumn';

export const SEASONAL_THEME_OPTIONS: Array<{
  id: SeasonalThemeId;
  label: string;
  swatch: string;
}> = [
  { id: 'theme-spring', label: 'Forår', swatch: '#A3B899' },
  { id: 'theme-summer', label: 'Sommer', swatch: '#E9C46A' },
  { id: 'theme-autumn', label: 'Efterår', swatch: '#8C9A8E' },
  { id: 'theme-winter', label: 'Vinter', swatch: '#A2B5C6' },
];
