export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type SeasonalSceneVariant = 'desktop' | 'mobile';

interface SeasonalSceneAsset {
  path: string;
  position: string;
  scale: number;
}

type SeasonalSceneAssetMap = Record<Season, Record<SeasonalSceneVariant, SeasonalSceneAsset>>;

export const SEASONAL_SCENE_ASSETS: SeasonalSceneAssetMap = {
  autumn: {
    desktop: {
      path: '/backgrounds/seasonal/autumn-hero-1600x900.jpg',
      position: 'center 18%',
      scale: 1.02,
    },
    mobile: {
      path: '/backgrounds/seasonal/autumn-mobile-1080x1920.jpg',
      position: 'center 12%',
      scale: 1,
    },
  },
  spring: {
    desktop: {
      path: '/backgrounds/seasonal/spring-hero-1600x900.jpg',
      position: 'center 20%',
      scale: 1.01,
    },
    mobile: {
      path: '/backgrounds/seasonal/spring-mobile-1080x1920.jpg',
      position: 'center 10%',
      scale: 1,
    },
  },
  summer: {
    desktop: {
      path: '/backgrounds/seasonal/summer-hero-1600x900.jpg',
      position: 'center 22%',
      scale: 1.01,
    },
    mobile: {
      path: '/backgrounds/seasonal/summer-mobile-1080x1920.jpg',
      position: 'center 14%',
      scale: 1,
    },
  },
  winter: {
    desktop: {
      path: '/backgrounds/seasonal/winter-hero-1600x900.jpg',
      position: 'center 20%',
      scale: 1.01,
    },
    mobile: {
      path: '/backgrounds/seasonal/winter-mobile-1080x1920.jpg',
      position: 'center 10%',
      scale: 1,
    },
  },
};

export function detectSeasonalSceneVariant(): SeasonalSceneVariant {
  if (typeof window === 'undefined') {
    return 'desktop';
  }

  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const noHover = window.matchMedia?.('(hover: none)').matches ?? false;
  const screenWidth = window.screen.width || window.innerWidth;
  const screenHeight = window.screen.height || window.innerHeight;
  const shortestScreenSide = Math.min(screenWidth, screenHeight);

  return shortestScreenSide <= 1024 && (coarsePointer || noHover) ? 'mobile' : 'desktop';
}
