import type { ReactNode } from 'react';
import { DEFAULT_SEASONAL_THEME, type SeasonalThemeId } from '../config/seasonalThemes';
import '../theme/seasonal-backgrounds.css';

type Season = 'spring' | 'summer' | 'autumn' | 'winter';

const THEME_TO_SEASON: Record<SeasonalThemeId, Season> = {
  'theme-spring': 'spring',
  'theme-summer': 'summer',
  'theme-autumn': 'autumn',
  'theme-winter': 'winter',
};

function getSeasonFromTheme(theme: string): Season {
  return THEME_TO_SEASON[theme as SeasonalThemeId] ?? THEME_TO_SEASON[DEFAULT_SEASONAL_THEME];
}

interface SeasonalSceneProps {
  theme: string;
  isCookMode?: boolean;
  className?: string;
  children: ReactNode;
}

export function SeasonalScene({ theme, isCookMode = false, className = '', children }: SeasonalSceneProps) {
  const season = getSeasonFromTheme(theme);
  const sceneClassName = ['cm-seasonal-scene', isCookMode ? 'cm-cook-mode' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={sceneClassName} data-season={season}>
      <div className="cm-seasonal-haze" aria-hidden="true" />
      <div className="cm-seasonal-noise" aria-hidden="true" />
      <div className="cm-seasonal-content">{children}</div>
    </div>
  );
}
