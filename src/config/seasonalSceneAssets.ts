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
      path: '/backgrounds/seasonal/approved/autumn-master.png',
      position: 'center center',
      scale: 1,
    },
    mobile: {
      path: '/backgrounds/seasonal/approved/autumn-master.png',
      position: 'center center',
      scale: 1,
    },
  },
  spring: {
    desktop: {
      path: '/backgrounds/seasonal/approved/spring-master.png',
      position: 'center center',
      scale: 1,
    },
    mobile: {
      path: '/backgrounds/seasonal/approved/spring-master.png',
      position: 'center center',
      scale: 1,
    },
  },
  summer: {
    desktop: {
      path: '/backgrounds/seasonal/approved/summer-master.png',
      position: 'center center',
      scale: 1,
    },
    mobile: {
      path: '/backgrounds/seasonal/approved/summer-master.png',
      position: 'center center',
      scale: 1,
    },
  },
  winter: {
    desktop: {
      path: '/backgrounds/seasonal/approved/winter-master.png',
      position: 'center center',
      scale: 1,
    },
    mobile: {
      path: '/backgrounds/seasonal/approved/winter-master.png',
      position: 'center center',
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
