import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { SEASONAL_SCENE_ASSETS, detectSeasonalSceneVariant, type Season, type SeasonalSceneVariant } from '../config/seasonalSceneAssets';
import { DEFAULT_SEASONAL_THEME, type SeasonalThemeId } from '../config/seasonalThemes';
import '../theme/seasonal-backgrounds.css';

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
  const [sceneVariant, setSceneVariant] = useState<SeasonalSceneVariant>(() => detectSeasonalSceneVariant());
  const sceneClassName = ['cm-seasonal-scene', isCookMode ? 'cm-cook-mode' : '', className]
    .filter(Boolean)
    .join(' ');
  const sceneAsset = SEASONAL_SCENE_ASSETS[season][sceneVariant];
  const sceneStyle = {
    '--cm-scene-image': `url('${sceneAsset.path}')`,
    '--cm-scene-position': sceneAsset.position,
    '--cm-scene-scale': String(sceneAsset.scale),
  } as CSSProperties;

  useEffect(() => {
    const syncSceneVariant = () => {
      setSceneVariant((currentVariant) => {
        const nextVariant = detectSeasonalSceneVariant();
        return currentVariant === nextVariant ? currentVariant : nextVariant;
      });
    };

    syncSceneVariant();
    window.addEventListener('resize', syncSceneVariant);

    return () => {
      window.removeEventListener('resize', syncSceneVariant);
    };
  }, []);

  useEffect(() => {
    const assetsToPreload = Object.values(SEASONAL_SCENE_ASSETS[season]);
    assetsToPreload.forEach((asset) => {
      const image = new Image();
      image.src = asset.path;
    });
  }, [season]);

  return (
    <div className={sceneClassName} data-scene-variant={sceneVariant} data-season={season} style={isCookMode ? undefined : sceneStyle}>
      <div className="cm-seasonal-haze" aria-hidden="true" />
      <div className="cm-seasonal-noise" aria-hidden="true" />
      <div className="cm-seasonal-content">{children}</div>
    </div>
  );
}
