import React, { useCallback, useEffect, useRef, useState } from 'react';
import { OvenAnimation } from './components/OvenAnimation';
import { PotAnimation } from './components/PotAnimation';
import { CookingPot, BookOpen, Timer as TimerIcon, Microwave, Home, PlusCircle } from 'lucide-react';
// Removed direct usage of @google/genai.  All AI functionality is handled
// server-side via services/aiService.  The RECIPE_SCHEMA constant below
// served as a reference for AI prompts but is no longer used in the
// client.  See server.ts for schema details.
import {
  adjustRecipe as aiAdjustRecipe,
  generateSteps as aiGenerateSteps,
  fillRest as aiFillRest,
  generateTips as aiGenerateTips,
  estimateRecipeNutrition as aiEstimateRecipeNutrition,
  applyPrefix as aiApplyPrefix,
  importRecipe as aiImportRecipe,
} from './services/aiService';
import { trackEvent } from './services/analyticsService';
import { normalizeAuthError } from './services/authErrorMessageService';
import { normalizeAiActionError, normalizeImportError, normalizeSyncError } from './services/errorMessageService';
import { removeFolderShare, setFolderPermissionState, upsertFolderShare } from './services/folderPermissionService';
import {
  cacheActiveRecipeForCookMode,
  cacheSavedRecipesForCookMode,
  loadCachedActiveRecipeForCookMode,
  loadCachedSavedRecipesForCookMode,
} from './services/recipeCacheService';
import { Recipe, ViewState, Timer, Folder } from './types';
import { DEFAULT_USER_LEVEL, type UserLevel } from './config/cookingLevels';
import { COOK_FONT_META, DEFAULT_COOK_FONT_SIZE, type CookFontSize } from './config/cookDisplay';
import { DEFAULT_IMPORT_PREFERENCE, type ImportPreference } from './config/importPreferences';
import { DEFAULT_SEASONAL_THEME, SEASONAL_THEME_IDS } from './config/seasonalThemes';
import { STORAGE_KEYS } from './config/storageKeys';
import { APP_BUILD_VERSION } from './generated/buildInfo';
import { buildRecipeFromImport } from './services/recipeImportService';
import { createCloudSyncStatusHelpers } from './services/cloudSyncStatusService';
import {
  createCanonicalDefaultFolder,
  DEFAULT_FOLDER_NAME,
  findDefaultFolder,
  getCanonicalDefaultFolderId,
  reconcileDefaultFolderState,
} from './services/defaultFolderService';
import { normalizeRecipeForCookMode, normalizeRecipesForCookMode } from './services/recipeStepNormalization';
import { hasRecipeBeenRemoved } from './services/recipeStateCleanup';
import { createBackupPayload, downloadBackupFile, parseBackupPayload } from './services/backupService';
import { mergeAutoImportEnhancement } from './services/importEnhancementService';
import {
  ensureLocalDefaultFolder,
  loadLocalActiveRecipe,
  loadLocalFolders,
  loadLocalRecipes,
  mergeMissingFoldersFromRecipes,
  saveLocalActiveRecipe,
  saveLocalFolders,
  saveLocalRecipes,
} from './services/localDataService';
import {
  deleteFolder as deleteFolderInCloud,
  deleteRecipe as deleteRecipeInCloud,
  listenToAccessibleFolders,
  listenToSharedRecipes,
  listenToUserRecipes,
  saveFolder as saveFolderInCloud,
  saveRecipe as saveRecipeInCloud,
} from './services/firestoreDataService';
import { HomeView } from './components/HomeView';
import { ActiveView } from './components/ActiveView';
import { ImportView } from './components/ImportView';
import { LibraryView } from './components/LibraryView';
import { RecipeView } from './components/RecipeView';
import { CookView } from './components/CookView';
import { SettingsView } from './components/SettingsView';
import { UndoToast } from './components/UndoToast';
import { AppUpdateToast } from './components/AppUpdateToast';
import { PendingQueueToast } from './components/PendingQueueToast';
import { SeasonalScene } from './components/SeasonalScene';
import { auth, onAuthStateChanged, signInWithPopup, googleProvider, signOut } from './firebase';
import { motion } from 'framer-motion';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { useServiceWorkerUpdate } from './hooks/useServiceWorkerUpdate';
import { usePendingQueue } from './hooks/usePendingQueue';
import { useOfflineQueueProcessor } from './hooks/useOfflineQueueProcessor';
import type { OfflineQueueItem } from './services/offlineQueueService';

// Remove direct instantiation of GoogleGenAI on the client.  All AI work
// is delegated to the server via services/aiService.


const getTimerIcon = (description: string) => {
  if (!description) return TimerIcon;
  const desc = description.toLowerCase();
  if (desc.includes('ovn') || desc.includes('bage') || desc.includes('stegeso')) {
    return Microwave;
  }
  if (desc.includes('simre') || desc.includes('koge') || desc.includes('gryde') || desc.includes('pande')) {
    return CookingPot;
  }
  return TimerIcon;
};

const parseAIError = (err: any, defaultMsg: string) => {
  return normalizeAiActionError(err).message || defaultMsg;
};

const getPersistentAIDisabledReason = (err: unknown): string | null => {
  const normalized = normalizeAiActionError(err);
  if (normalized.category === 'invalid_model') {
    return 'AI er ikke tilgaengelig lige nu. Grundimport, manuel oprettelse og cook mode virker stadig.';
  }

  const msg = err instanceof Error ? err.message : String(err ?? '');

  if (msg.includes('GEMINI_API_KEY is not configured') || msg.includes('API_KEY_INVALID')) {
    return 'AI er ikke tilgængelig lige nu. Grundimport, manuel oprettelse og cook mode virker stadig.';
  }

  return null;
};

const blobToBase64Data = (blob: Blob) =>
  new Promise<{ data: string; mimeType: string }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const match = result.match(/^data:(.+);base64,(.+)$/);
      if (!match) {
        reject(new Error('Offline-billedet kunne ikke konverteres til importformat.'));
        return;
      }

      resolve({
        mimeType: match[1],
        data: match[2],
      });
    };
    reader.onerror = () => reject(reader.error ?? new Error('Offline-billedet kunne ikke læses.'));
    reader.readAsDataURL(blob);
  });

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [viewHistory, setViewHistory] = useState<ViewState[]>(['home']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [cookProgress, setCookProgress] = useState<Record<string, number>>({});
  const [theme, setTheme] = useState<string>(() => localStorage.getItem(STORAGE_KEYS.theme) || DEFAULT_SEASONAL_THEME);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => localStorage.getItem(STORAGE_KEYS.darkMode) === 'true');
  const [userLevel, setUserLevel] = useState<UserLevel>(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.userLevel);
    return raw === 'Begynder' || raw === 'Hverdags kok' || raw === 'Erfaren amatør' || raw === 'Professionel'
      ? raw
      : DEFAULT_USER_LEVEL;
  });
  const [importPreference, setImportPreference] = useState<ImportPreference>(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.importPreference);
    return raw === 'ai_auto' || raw === 'ask_first' || raw === 'basic_only'
      ? raw
      : DEFAULT_IMPORT_PREFERENCE;
  });
  const [autoAiImportEnhancement, setAutoAiImportEnhancement] = useState<boolean>(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.autoAiImportEnhancement);
    return raw === null ? true : raw === 'true';
  });
  const [activeTimerPopup, setActiveTimerPopup] = useState<string | null>(null);
  const [includePrep, setIncludePrep] = useState<boolean>(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.cookModeIncludePrep);
    return raw === null ? true : raw === 'true';
  });
  const [cookFontSize, setCookFontSize] = useState<CookFontSize>(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.cookFontSize);
    return raw === 'small' || raw === 'normal' || raw === 'large' || raw === 'xlarge' ? raw : DEFAULT_COOK_FONT_SIZE;
  });
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(() => localStorage.getItem(STORAGE_KEYS.lastBackupAt));
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'syncing' | 'saved' | 'error'>('idle');
  const [cloudSyncMessage, setCloudSyncMessage] = useState<string | null>('Kun lokal lagring aktiv');
  const [cloudLastSyncAt, setCloudLastSyncAt] = useState<string | null>(() => localStorage.getItem(STORAGE_KEYS.lastCloudSyncAt));
  const [aiUnavailableMessage, setAiUnavailableMessage] = useState<string | null>(null);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const [undoDeleteRecipe, setUndoDeleteRecipe] = useState<{ recipe: Recipe; index: number; timeoutId: any } | null>(null);
  const [undoDeleteFolder, setUndoDeleteFolder] = useState<{ folder: Folder; prevFolders: Folder[]; prevRecipes: Recipe[]; movedRecipes: Recipe[]; timeoutId: any } | null>(null);
  const backupImportRef = useRef<HTMLInputElement | null>(null);
  const { isOnline } = useNetworkStatus();
  const { updateAvailable, applyUpdate, dismiss } = useServiceWorkerUpdate();
  const { retryableCount, refreshPendingCount } = usePendingQueue();
  const aiDisabledReason = !isOnline
    ? 'Du er offline. AI-funktioner kræver internetforbindelse.'
    : aiUnavailableMessage;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
    document.body.classList.remove(...SEASONAL_THEME_IDS);
    document.body.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.darkMode, String(isDarkMode));
    if (isDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.userLevel, userLevel);
  }, [userLevel]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.importPreference, importPreference);
  }, [importPreference]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.autoAiImportEnhancement, String(autoAiImportEnhancement));
  }, [autoAiImportEnhancement]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.cookModeIncludePrep, String(includePrep));
  }, [includePrep]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.cookFontSize, cookFontSize);
  }, [cookFontSize]);

  useEffect(() => {
    if (user) {
      setCloudSyncStatus('saved');
      setCloudSyncMessage('Cloud tilsluttet');
    } else {
      setCloudSyncStatus('idle');
      setCloudSyncMessage('Kun lokal lagring aktiv');
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (activeTimerPopup && !(e.target as Element).closest('.timer-widget')) {
        setActiveTimerPopup(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeTimerPopup]);

  const navigateTo = useCallback((view: ViewState) => {
    setActiveTimerPopup(null);
    const newHistory = viewHistory.slice(0, historyIndex + 1);
    newHistory.push(view);
    setViewHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCurrentView(view);
  }, [historyIndex, viewHistory]);

  const {
    markCloudSyncing,
    markCloudSaved,
    markCloudError,
  } = createCloudSyncStatusHelpers({
    setStatus: setCloudSyncStatus,
    setMessage: setCloudSyncMessage,
    setLastSyncAt: setCloudLastSyncAt,
  });

  const appVersion = APP_BUILD_VERSION;

  const finalizeRecipeDeletion = async (recipeId: string) => {
    if (!user) return;
    try {
      markCloudSyncing('Sletter opskrift i cloud...');
      await deleteRecipeInCloud(recipeId);
      markCloudSaved('Opskrift slettet i cloud');
    } catch (error) {
      markCloudError(normalizeSyncError(error, 'Sletning i cloud mislykkedes.'));
    }
  };

  const finalizeFolderDeletion = async (folderId: string, movedRecipes: Recipe[]) => {
    if (!user) return;
    try {
      markCloudSyncing('Sletter mappe i cloud...');
      await deleteFolderInCloud(folderId);
      for (const r of movedRecipes) {
        await saveRecipeInCloud(r);
      }
      markCloudSaved('Mappe slettet og opskrifter flyttet');
    } catch (error) {
      markCloudError(normalizeSyncError(error, 'Sletning af mappe mislykkedes.'));
    }
  };

  const goBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setCurrentView(viewHistory[historyIndex - 1]);
    } else {
      setCurrentView('home');
    }
  };

  const goForward = () => {
    if (historyIndex < viewHistory.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setCurrentView(viewHistory[historyIndex + 1]);
    }
  };
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const savedRecipesRef = useRef<Recipe[]>(savedRecipes);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timers, setTimers] = useState<Timer[]>([]);
  const timersRef = useRef<Timer[]>(timers);
  const [isSavedRecipeCacheReady, setIsSavedRecipeCacheReady] = useState(false);
  const [isActiveRecipeCacheReady, setIsActiveRecipeCacheReady] = useState(false);
  timersRef.current = timers;
  savedRecipesRef.current = savedRecipes;
  const hasActiveTimers = timers.some((timer) => timer.active && timer.remaining > 0);

  const commitSavedRecipes = useCallback((nextRecipes: Recipe[]) => {
    savedRecipesRef.current = nextRecipes;
    setSavedRecipes(nextRecipes);
  }, []);

  const getAnalyticsContext = useCallback(() => ({
    userState: user ? 'authenticated' : 'guest',
    view: currentView,
  }), [currentView, user]);

  const handleDarkModeChange = (nextIsDarkMode: boolean) => {
    if (nextIsDarkMode === isDarkMode) return;

    setIsDarkMode(nextIsDarkMode);
    trackEvent(nextIsDarkMode ? 'module_enabled' : 'module_disabled', {
      ...getAnalyticsContext(),
      module: 'dark_mode',
    });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setAuthErrorMessage(null);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;

    let cancelled = false;

    if (user) {
      let unsubSharedRecipes: (() => void) | null = null;
      let hasReceivedCloudRecipes = false;
      const handleSyncListenerError = (syncError: unknown) => {
        markCloudError(normalizeSyncError(syncError, 'Cloud-sync kunne ikke opdateres lige nu.'));
      };

      void loadCachedSavedRecipesForCookMode().then((cachedRecipes) => {
        if (cancelled || hasReceivedCloudRecipes || !cachedRecipes?.length) {
          return;
        }

        const normalizedCachedRecipes = normalizeRecipesForCookMode(cachedRecipes);
        const nextRecipes = savedRecipesRef.current.length > 0 ? savedRecipesRef.current : normalizedCachedRecipes;
        commitSavedRecipes(nextRecipes);
        setIsSavedRecipeCacheReady(true);
      });

      const unsubRecipes = listenToUserRecipes(user.uid, (recipes) => {
        hasReceivedCloudRecipes = true;
        setIsSavedRecipeCacheReady(true);
        const shared = savedRecipesRef.current.filter((recipe) => recipe.authorUID !== user.uid);
        commitSavedRecipes([...recipes, ...shared]);
      }, handleSyncListenerError);

      const unsubFoldersSync = listenToAccessibleFolders(user.uid, (snapshotFolders) => {
        const allFolders: Folder[] = [];
        const sharedFolderIds: string[] = [];

        snapshotFolders.forEach((data) => {
          if (data.ownerUID !== user.uid) {
            sharedFolderIds.push(data.id);
          }

          const isShared = data.sharedWith?.some(s => s.email === user.email && (!s.uid || s.uid.startsWith('pending_')));
          if (isShared) {
            const updatedSharedWith = data.sharedWith?.map(s => s.email === user.email ? { ...s, uid: user.uid } : s);
            const editorUids = new Set(data.editorUids || []);
            const viewerUids = new Set(data.viewerUids || []);

            updatedSharedWith?.forEach(s => {
              if (s.uid === user.uid) {
                if (s.role === 'editor') editorUids.add(user.uid);
                if (s.role === 'viewer') viewerUids.add(user.uid);
              }
            });

            saveFolderInCloud({
              ...data,
              sharedWith: updatedSharedWith,
              editorUids: Array.from(editorUids),
              viewerUids: Array.from(viewerUids),
            }).catch((error) => {
              markCloudError(normalizeSyncError(error, 'Cloud-sync af delte mapper fejlede.'));
            });
          }

          allFolders.push(data);
        });

        const reconciled = reconcileDefaultFolderState(allFolders, savedRecipesRef.current, user.uid);
        const hadCanonicalDefault = allFolders.some((folder) => folder.id === getCanonicalDefaultFolderId(user.uid));

        if (!hadCanonicalDefault) {
          saveFolderInCloud(reconciled.defaultFolder).catch((error) => {
            markCloudError(normalizeSyncError(error, 'Standardmappen kunne ikke synkroniseres.'));
          });
        }

        setFolders(reconciled.folders);
        const myRecipes = reconciled.recipes.filter((recipe) => recipe.authorUID === user.uid);
        const shared = savedRecipesRef.current.filter((recipe) => recipe.authorUID !== user.uid);
        commitSavedRecipes([...myRecipes, ...shared]);

        if (unsubSharedRecipes) {
          unsubSharedRecipes();
          unsubSharedRecipes = null;
        }

        if (sharedFolderIds.length > 0) {
          unsubSharedRecipes = listenToSharedRecipes(sharedFolderIds, (sharedRecipes) => {
            const myRecipes = savedRecipesRef.current.filter((recipe) => recipe.authorUID === user.uid);
            commitSavedRecipes([...myRecipes, ...sharedRecipes]);
          }, handleSyncListenerError);
        }
      }, handleSyncListenerError);

      return () => {
        cancelled = true;
        unsubRecipes();
        unsubFoldersSync();
        if (unsubSharedRecipes) unsubSharedRecipes();
      };
    } else {
      void (async () => {
        const localRecipes = loadLocalRecipes();
        const cachedRecipes = localRecipes.length > 0 ? null : await loadCachedSavedRecipesForCookMode();
        const nextRecipes = localRecipes.length > 0 ? localRecipes : normalizeRecipesForCookMode(cachedRecipes || []);

        if (cancelled) return;

        commitSavedRecipes(nextRecipes);
        setIsSavedRecipeCacheReady(true);
      })();
      setFolders(loadLocalFolders());
    }

    return () => {
      cancelled = true;
    };
  }, [user, isAuthReady]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const localActiveRecipe = loadLocalActiveRecipe();
      const cachedActiveRecipe = localActiveRecipe ? null : await loadCachedActiveRecipeForCookMode();

      if (cancelled) return;

      setActiveRecipe(localActiveRecipe || (cachedActiveRecipe ? normalizeRecipeForCookMode(cachedActiveRecipe) : null));
      setIsActiveRecipeCacheReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isSavedRecipeCacheReady) return;
    void cacheSavedRecipesForCookMode(savedRecipes);
  }, [isSavedRecipeCacheReady, savedRecipes]);

  useEffect(() => {
    if (!isActiveRecipeCacheReady) return;
    void cacheActiveRecipeForCookMode(activeRecipe);
  }, [activeRecipe, isActiveRecipeCacheReady]);

  useEffect(() => {
    if (hasRecipeBeenRemoved(viewingRecipe, savedRecipes)) {
      setViewingRecipe(null);
      if (currentView === 'recipe') {
        setCurrentView('home');
      }
    }

    if (hasRecipeBeenRemoved(activeRecipe, savedRecipes)) {
      saveActiveRecipe(null);
      if (currentView === 'cook' || currentView === 'active') {
        setCurrentView('home');
      }
    }
  }, [activeRecipe, currentView, savedRecipes, viewingRecipe]);

  useEffect(() => {
    let interval: number;
    if (hasActiveTimers) {
      interval = window.setInterval(() => {
        setTimers(() => {
          const nextTimers = timersRef.current.map((t) => {
            if (t.active && t.remaining > 0) {
              const newRemaining = t.remaining - 1;
              if (newRemaining === 0) {
                if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);
                return { ...t, remaining: 0, active: false };
              }
              return { ...t, remaining: newRemaining };
            }
            return t;
          });
          timersRef.current = nextTimers;
          return nextTimers;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [hasActiveTimers]);

  useEffect(() => {
    if (!isAuthReady) return;

    if (!user) {
      const nextFolders = ensureLocalDefaultFolder(folders, 'local');
      if (nextFolders !== folders) {
        setFolders(nextFolders);
        saveLocalFolders(nextFolders);
      }
      return;
    }

    const hasDefault = folders.some(f => f.id === getCanonicalDefaultFolderId(user.uid));
    if (!hasDefault) {
      saveFolderInCloud(createCanonicalDefaultFolder(user.uid)).catch((error) => {
        markCloudError(normalizeSyncError(error, 'Standardmappen kunne ikke synkroniseres.'));
      });
    }
  }, [folders, user, isAuthReady]);

  const saveToLocalStorage = (newRecipes: Recipe[]) => {
    const normalizedRecipes = normalizeRecipesForCookMode(newRecipes);
    saveLocalRecipes(normalizedRecipes);
    setSavedRecipes(normalizedRecipes);
    
    if (!user) {
      const updatedFolders = mergeMissingFoldersFromRecipes(normalizedRecipes, folders);
      if (updatedFolders !== folders) {
        setFolders(updatedFolders);
        saveLocalFolders(updatedFolders);
      }
    }
  };

  const handleExportBackup = () => {
    const payload = createBackupPayload({
      recipes: savedRecipes,
      folders,
      activeRecipe,
      preferences: {
        userLevel,
        importPreference,
        theme,
        isDarkMode,
        cookFontSize,
      },
    });

    downloadBackupFile(payload);
    localStorage.setItem(STORAGE_KEYS.lastBackupAt, payload.exportedAt);
    setLastBackupAt(payload.exportedAt);
    trackEvent('backup_exported', {
      ...getAnalyticsContext(),
      recipeCount: savedRecipes.length,
      folderCount: folders.length,
    });
  };

  const handleBackupImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const raw = await file.text();
      const backup = parseBackupPayload(raw);

      const normalizedRecipes = normalizeRecipesForCookMode(backup.recipes);
      const normalizedActiveRecipe = backup.activeRecipe ? normalizeRecipeForCookMode(backup.activeRecipe) : null;

      saveLocalRecipes(normalizedRecipes);
      saveLocalFolders(backup.folders);
      saveLocalActiveRecipe(normalizedActiveRecipe);

      localStorage.setItem(STORAGE_KEYS.theme, backup.preferences.theme);
      localStorage.setItem(STORAGE_KEYS.darkMode, String(backup.preferences.isDarkMode));
      localStorage.setItem(STORAGE_KEYS.userLevel, backup.preferences.userLevel);
      if (backup.preferences.importPreference) {
        localStorage.setItem(STORAGE_KEYS.importPreference, backup.preferences.importPreference);
      }

      setSavedRecipes(normalizedRecipes);
      setFolders(backup.folders);
      setActiveRecipe(normalizedActiveRecipe);
      setTheme(backup.preferences.theme);
      setIsDarkMode(backup.preferences.isDarkMode);
      setUserLevel(backup.preferences.userLevel);
      if (backup.preferences.importPreference) {
        setImportPreference(backup.preferences.importPreference);
      }
      if (backup.preferences.cookFontSize) {
        localStorage.setItem(STORAGE_KEYS.cookFontSize, backup.preferences.cookFontSize);
        setCookFontSize(backup.preferences.cookFontSize);
      }
      setError(null);

      if (user) {
        markCloudSyncing('Gendanner backup til cloud...');
        try {
          await Promise.all([
            ...backup.folders.map(folder => saveFolderInCloud(folder)),
            ...normalizedRecipes.map(recipe => saveRecipeInCloud({ ...recipe, authorUID: user.uid })),
          ]);
          markCloudSaved('Backup gendannet og synkroniseret');
        } catch (error) {
          const syncMessage = normalizeSyncError(error, 'Backup blev gendannet lokalt, men cloud-sync fejlede.');
          markCloudError(syncMessage);
          setError(syncMessage);
          return;
        }
      }

      trackEvent('backup_restored', {
        ...getAnalyticsContext(),
        recipeCount: backup.recipes.length,
        folderCount: backup.folders.length,
      });
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke gendanne backupfilen.');
    } finally {
      event.target.value = '';
    }
  };

  const handleCreateFolder = async (folderName: string) => {
    const newFolder: Folder = {
      id: Date.now().toString(),
      name: folderName,
      ownerUID: user?.uid || 'local',
      sharedWith: [],
      editorUids: [],
      viewerUids: []
    };

    if (user) {
      try {
        markCloudSyncing('Opretter mappe i cloud...');
        await saveFolderInCloud(newFolder);
        markCloudSaved('Mappe gemt i cloud');
      } catch (error) {
        const syncMessage = normalizeSyncError(error, 'Mappen kunne ikke gemmes i cloud.');
        markCloudError(syncMessage);
        setError(syncMessage);
      }
    } else {
      const newFolders = [...folders, newFolder].sort((a, b) => a.name.localeCompare(b.name));
      setFolders(newFolders);
      saveLocalFolders(newFolders);
    }
  };

  const handleRenameFolder = async (folderId: string, newName: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    const updatedFolder = { ...folder, name: newName };

    if (user) {
      try {
        markCloudSyncing('Opdaterer mappe i cloud...');
        await saveFolderInCloud(updatedFolder);
        markCloudSaved('Mappe opdateret i cloud');
      } catch (error) {
        const syncMessage = normalizeSyncError(error, 'Mappen kunne ikke opdateres i cloud.');
        markCloudError(syncMessage);
        setError(syncMessage);
      }
    } else {
      const newFolders = folders.map(f => f.id === folderId ? updatedFolder : f);
      setFolders(newFolders);
      saveLocalFolders(newFolders);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (user && !isOnline) {
      setError('Du er offline. Mappesletning i cloud kræver internetforbindelse.');
      return;
    }

    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    // Hvis der allerede ligger en pending mappesletning, så finaliser den først
    if (undoDeleteFolder) {
      clearTimeout(undoDeleteFolder.timeoutId);
      if (user) {
        await finalizeFolderDeletion(undoDeleteFolder.folder.id, undoDeleteFolder.movedRecipes);
      }
      setUndoDeleteFolder(null);
    }

    const prevFolders = [...folders];
    const prevRecipes = [...savedRecipes];

    const now = new Date().toISOString();
    const movedRecipes = savedRecipes
      .filter(r => r.folderId === folderId)
      .map(r => {
        const { folderId: _oldFolderId, ...rest } = r;
        return { ...rest, folder: 'Opskrifter', updatedAt: now } as Recipe;
      });

    const movedById = new Map(movedRecipes.map(r => [r.id, r]));

    const newFolders = folders.filter(f => f.id !== folderId);
    const newRecipes = savedRecipes.map(r => movedById.get(r.id) || r);

    // Optimistisk UI: fjern mappe + flyt opskrifter med det samme
    setFolders(newFolders);
    saveLocalFolders(newFolders);
    setSavedRecipes(newRecipes);
    saveLocalRecipes(newRecipes);

    const timeoutId = setTimeout(() => {
      if (user) finalizeFolderDeletion(folderId, movedRecipes);
      setUndoDeleteFolder(null);
    }, 8000);

    setUndoDeleteFolder({ folder, prevFolders, prevRecipes, movedRecipes, timeoutId });
  };

  const handleShareFolder = async (folderId: string, email: string) => {
    if (!user) return;
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    const updatedFolder = upsertFolderShare(folder, email);

    try {
      markCloudSyncing('Deler mappe via cloud...');
      await saveFolderInCloud(updatedFolder);
      setFolders(prev => prev.map(f => f.id === folderId ? updatedFolder : f));
      markCloudSaved('Mappedeling gemt i cloud');
      trackEvent('folder_shared', {
        ...getAnalyticsContext(),
        folderId,
        role: 'viewer',
      });
    } catch (error) {
      const syncMessage = normalizeSyncError(error, 'Mappedeling kunne ikke gemmes.');
      markCloudError(syncMessage);
      setError(syncMessage);
    }
  };

  const handleRemoveFolderShare = async (folderId: string, email: string) => {
    if (!user) return;
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    const updatedFolder = removeFolderShare(folder, email);

    try {
      markCloudSyncing('Fjerner adgang til mappe...');
      await saveFolderInCloud(updatedFolder);
      setFolders(prev => prev.map(f => f.id === folderId ? updatedFolder : f));
      markCloudSaved('Adgang fjernet');
    } catch (error) {
      const syncMessage = normalizeSyncError(error, 'Adgang kunne ikke fjernes.');
      markCloudError(syncMessage);
      setError(syncMessage);
    }
  };

  const handleSetFolderPermissionState = async (folderId: string, state: 'private' | 'shared_view') => {
    if (!user) return;
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    const updatedFolder = setFolderPermissionState(folder, state);

    try {
      markCloudSyncing('Opdaterer permission-mode...');
      await saveFolderInCloud(updatedFolder);
      setFolders(prev => prev.map(f => f.id === folderId ? updatedFolder : f));
      markCloudSaved('Permission-mode opdateret');
    } catch (error) {
      const syncMessage = normalizeSyncError(error, 'Permission-mode kunne ikke opdateres.');
      markCloudError(syncMessage);
      setError(syncMessage);
    }
  };

  const saveActiveRecipe = (recipe: Recipe | null) => {
    const normalizedRecipe = recipe ? normalizeRecipeForCookMode(recipe) : null;
    saveLocalActiveRecipe(normalizedRecipe);
    setActiveRecipe(normalizedRecipe);
  };

  const hydrateDirectImportRecipe = (directRecipe: Recipe, sourceUrl: string): Recipe => {
    const defaultFolder = findDefaultFolder(folders, user?.uid || 'local') || folders[0];
    const now = new Date().toISOString();

    return normalizeRecipeForCookMode({
      ...directRecipe,
      id: Date.now().toString(),
      folder: defaultFolder?.name || DEFAULT_FOLDER_NAME,
      folderId: defaultFolder?.id || getCanonicalDefaultFolderId(user?.uid || 'local'),
      isSaved: false,
      sourceUrl,
      authorUID: user?.uid,
      lastUsed: now,
      createdAt: now,
      updatedAt: now,
    });
  };

  const requestDirectImport = async (url: string): Promise<Recipe> => {
    const response = await fetch('/api/parse-direct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.error || 'Direkte grundimport fejlede.');
    }
    return data.recipe as Recipe;
  };

  const rememberAIDisabledState = (err: unknown) => {
    const message = getPersistentAIDisabledReason(err);
    if (message) {
      setAiUnavailableMessage(message);
    }
  };

  const executeImportFlow = useCallback(async (
    content: string | { data: string, mimeType: string },
    type: 'url' | 'text' | 'file' | 'image',
    options?: { showLoading?: boolean; navigateOnSuccess?: boolean; surfaceErrors?: boolean },
  ) => {
    const showLoading = options?.showLoading ?? true;
    const navigateOnSuccess = options?.navigateOnSuccess ?? true;
    const surfaceErrors = options?.surfaceErrors ?? true;

    if (showLoading) {
      setLoading(true);
    }
    if (surfaceErrors) {
      setError(null);
    }

    trackEvent('recipe_import_started', {
      ...getAnalyticsContext(),
      sourceType: type,
    });

    try {
      let newRecipe: Recipe | null = null;
      let usedDirectImport = false;

      if (type === 'url') {
        try {
          const directRecipe = await requestDirectImport(content as string);
          newRecipe = hydrateDirectImportRecipe(directRecipe, content as string);
          usedDirectImport = true;
        } catch (directError) {
          if (importPreference === 'basic_only') {
            throw directError;
          }

          if (importPreference === 'ask_first') {
            const shouldUseAI = window.confirm('Grundimport kunne ikke klare denne side alene. Vil du prøve AI-import i stedet?');
            if (!shouldUseAI) {
              throw new Error('Importen blev afbrudt, fordi AI-import ikke blev godkendt.');
            }
          }
        }
      }

      if (!newRecipe) {
        if (type === 'url' && aiDisabledReason) {
          throw new Error(`${aiDisabledReason} Prøv et andet link med struktureret opskriftdata eller opret opskriften manuelt.`);
        }

        if (importPreference === 'basic_only' && type !== 'url') {
          throw new Error('Grundimport virker lige nu kun for links med struktureret opskriftdata.');
        }

        if (type !== 'url' && aiDisabledReason) {
          throw new Error(`${aiDisabledReason} Brug linkimport eller opret opskriften manuelt.`);
        }

        if (importPreference === 'ask_first' && type !== 'url') {
          const shouldUseAI = window.confirm('Denne type import kræver AI. Vil du fortsætte med AI-import?');
          if (!shouldUseAI) {
            throw new Error('Importen blev afbrudt, fordi AI-import ikke blev godkendt.');
          }
        }

        let parsedData: any;

        if (type === 'url' || type === 'text') {
          let textToParse = content as string;
          let isJson = false;

          if (type === 'url') {
            const response = await fetch(`/api/fetch-url?url=${encodeURIComponent(content as string)}`);
            const data = await response.json().catch(() => null);
            if (!response.ok) {
              throw new Error(data?.error || 'Failed to fetch URL content');
            }

            if (data.json) {
              textToParse = JSON.stringify(data.json);
              isJson = true;
            } else {
              textToParse = data.html;
            }
          }

          parsedData = await aiImportRecipe({
            sourceType: type,
            textContent: textToParse,
            isStructuredData: isJson,
            level: userLevel,
          });
        } else if (type === 'file' || type === 'image') {
          const fileContent = content as { data: string, mimeType: string };
          parsedData = await aiImportRecipe({
            sourceType: type,
            fileData: fileContent,
            level: userLevel,
          });
        }

        newRecipe = buildRecipeFromImport({
          parsedData,
          sourceType: type,
          originalContent: typeof content === 'string' ? content : undefined,
          folders,
          userId: user?.uid,
        });
        newRecipe = normalizeRecipeForCookMode(newRecipe);
        setAiUnavailableMessage(null);
      }

      if (newRecipe && usedDirectImport && autoAiImportEnhancement) {
        if (aiDisabledReason) {
          throw new Error(`${aiDisabledReason} AI-tilpasning efter linkimport er slået til.`);
        }

        const enhancedRecipe = await aiFillRest(newRecipe, userLevel);
        setAiUnavailableMessage(null);
        newRecipe = normalizeRecipeForCookMode(mergeAutoImportEnhancement(newRecipe, enhancedRecipe));
        trackEvent('ai_adjust_used', {
          ...getAnalyticsContext(),
          recipeId: newRecipe.id,
          action: 'auto_fill_rest_import',
        });
      }

      if (user) {
        markCloudSyncing('Gemmer importeret opskrift i cloud...');
        await saveRecipeInCloud(newRecipe);
        markCloudSaved('Importeret opskrift gemt i cloud');
      } else {
        setSavedRecipes(prev => {
          const newSaved = [newRecipe, ...prev];
          saveLocalRecipes(newSaved);

          const updatedFolders = mergeMissingFoldersFromRecipes(newSaved, folders);
          if (updatedFolders !== folders) {
            setFolders(updatedFolders);
            saveLocalFolders(updatedFolders);
          }

          return newSaved;
        });
      }

      if (navigateOnSuccess) {
        setViewingRecipe(newRecipe);
        navigateTo('recipe');
      }

      trackEvent('recipe_import_succeeded', {
        ...getAnalyticsContext(),
        sourceType: type,
        recipeId: newRecipe.id,
      });
      return newRecipe;
    } catch (err: any) {
      console.error('AI Error:', err);
      rememberAIDisabledState(err);
      const { category, message } = normalizeImportError(err);
      if (surfaceErrors) {
        setError(message);
      }
      trackEvent('recipe_import_failed', {
        ...getAnalyticsContext(),
        sourceType: type,
        errorCategory: category,
        errorMessage: message,
      });
      throw err;
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [aiDisabledReason, autoAiImportEnhancement, folders, getAnalyticsContext, importPreference, navigateTo, requestDirectImport, savedRecipes, trackEvent, user, userLevel]);

  const handleImport = async (content: string | { data: string, mimeType: string }, type: 'url' | 'text' | 'file' | 'image') => {
    await executeImportFlow(content, type);
  };

  const processQueuedItem = useCallback(async (item: OfflineQueueItem) => {
    if (item.type === 'url') {
      await executeImportFlow(item.payloadText, 'url', {
        showLoading: false,
        navigateOnSuccess: false,
        surfaceErrors: false,
      });
      return;
    }

    if (item.type === 'text') {
      await executeImportFlow(item.payloadText, 'text', {
        showLoading: false,
        navigateOnSuccess: false,
        surfaceErrors: false,
      });
      return;
    }

    if (item.type === 'image') {
      const fileData = await blobToBase64Data(item.payloadBlob);
      await executeImportFlow(fileData, 'image', {
        showLoading: false,
        navigateOnSuccess: false,
        surfaceErrors: false,
      });
      return;
    }

    throw new Error('Denne queue-type kan ikke behandles endnu.');
  }, [executeImportFlow]);

  const {
    isProcessingQueue,
    queueProcessMessage,
    clearQueueProcessMessage,
    processPendingQueue,
  } = useOfflineQueueProcessor({
    isOnline,
    canProcess: !loading && !adjusting,
    onProcessItem: processQueuedItem,
    onQueueChanged: refreshPendingCount,
  });

  const handleSaveRecipe = async (recipe: Recipe) => {
    if (!user) {
      const updatedRecipe: Recipe = normalizeRecipeForCookMode({
        ...recipe,
        isSaved: true,
        createdAt: recipe.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setSavedRecipes(prev => {
        const index = prev.findIndex(r => r.id === recipe.id);
        const next = index >= 0
          ? prev.map(r => r.id === recipe.id ? updatedRecipe : r)
          : [updatedRecipe, ...prev];
        saveLocalRecipes(next);

        const updatedFolders = mergeMissingFoldersFromRecipes(next, folders);
        if (updatedFolders !== folders) {
          setFolders(updatedFolders);
          saveLocalFolders(updatedFolders);
        }

        return next;
      });

      if (viewingRecipe?.id === recipe.id) {
        setViewingRecipe(updatedRecipe);
      }
      if (activeRecipe?.id === recipe.id) {
        saveActiveRecipe(updatedRecipe);
      }

      trackEvent('recipe_saved', {
        ...getAnalyticsContext(),
        recipeId: updatedRecipe.id,
        folderId: updatedRecipe.folderId || null,
      });
      return;
    }

    try {
      let finalFolderId = recipe.folderId;
      let finalFolderName = recipe.folder;

      if (finalFolderName === DEFAULT_FOLDER_NAME) {
        finalFolderName = 'Opskrifter';
        finalFolderId = undefined;
      }

      if (finalFolderName && !finalFolderId) {
        const existingFolder = folders.find(f => f.name === finalFolderName);
        if (existingFolder) {
          finalFolderId = existingFolder.id;
        } else {
          // Create the missing folder
          const newFolder: Folder = {
            id: Date.now().toString() + Math.random().toString(36).substring(7),
            name: finalFolderName,
            ownerUID: user.uid,
            sharedWith: [],
            editorUids: [],
            viewerUids: []
          };
          markCloudSyncing('Opretter manglende mappe i cloud...');
          await saveFolderInCloud(newFolder);
          markCloudSaved('Mappe oprettet i cloud');
          finalFolderId = newFolder.id;
          setFolders(prev => [...prev, newFolder].sort((a, b) => a.name.localeCompare(b.name)));
        }
      }

      const updatedRecipe: Recipe = normalizeRecipeForCookMode({ 
        ...recipe, 
        isSaved: true,
        folder: finalFolderName,
        folderId: finalFolderId,
        authorUID: user.uid,
        createdAt: recipe.createdAt || new Date().toISOString()
      });
      
      markCloudSyncing('Gemmer opskrift i cloud...');
      await saveRecipeInCloud(updatedRecipe);
      markCloudSaved('Opskrift gemt i cloud');
      
      setSavedRecipes(prev => {
        const index = prev.findIndex(r => r.id === recipe.id);
        if (index >= 0) {
          const newRecipes = [...prev];
          newRecipes[index] = updatedRecipe;
          return newRecipes;
        }
        return [updatedRecipe, ...prev];
      });
      
      if (viewingRecipe?.id === recipe.id) {
        setViewingRecipe(updatedRecipe);
      }
      if (activeRecipe?.id === recipe.id) {
        saveActiveRecipe(updatedRecipe);
      }

      trackEvent('recipe_saved', {
        ...getAnalyticsContext(),
        recipeId: updatedRecipe.id,
        folderId: updatedRecipe.folderId || null,
      });
    } catch (err: any) {
      const syncMessage = normalizeSyncError(err, 'Opskriften kunne ikke gemmes i cloud.');
      markCloudError(syncMessage);
      setError(syncMessage);
    }
  };

  const handleDeleteRecipe = (recipeId: string) => {
    if (user && !isOnline) {
      setError('Du er offline. Sletning i cloud kræver internetforbindelse.');
      return;
    }

    const idx = savedRecipes.findIndex(r => r.id === recipeId);
    if (idx < 0) return;

    // Hvis der allerede ligger en pending sletning, så finaliser den først
    if (undoDeleteRecipe) {
      clearTimeout(undoDeleteRecipe.timeoutId);
      if (user) finalizeRecipeDeletion(undoDeleteRecipe.recipe.id);
      setUndoDeleteRecipe(null);
    }

    const recipe = savedRecipes[idx];

    const newSaved = savedRecipes.filter(r => r.id !== recipeId);
    saveToLocalStorage(newSaved);

    if (viewingRecipe?.id === recipeId) {
      setViewingRecipe(null);
      navigateTo('home');
    }

    if (activeRecipe?.id === recipeId) {
      saveActiveRecipe(null);
    }

    const timeoutId = setTimeout(() => {
      // Cloud-sletning udføres først efter undo-vinduet
      if (user) finalizeRecipeDeletion(recipeId);
      setUndoDeleteRecipe(null);
    }, 8000);

    setUndoDeleteRecipe({ recipe, index: idx, timeoutId });
    trackEvent('recipe_deleted', {
      ...getAnalyticsContext(),
      recipeId,
    });
  };

  const handleToggleFavorite = (recipe: Recipe) => {
    const updatedRecipe = normalizeRecipeForCookMode({ ...recipe, isFavorite: !recipe.isFavorite, updatedAt: new Date().toISOString() });
    setViewingRecipe(updatedRecipe);
    
    const newSaved = savedRecipes.map(r => r.id === recipe.id ? updatedRecipe : r);
    saveToLocalStorage(newSaved);
    if (user) {
      markCloudSyncing('Opdaterer favorit i cloud...');
      saveRecipeInCloud(updatedRecipe)
        .then(() => markCloudSaved('Favoritstatus synkroniseret'))
        .catch((error) => markCloudError(normalizeSyncError(error, 'Favoritstatus kunne ikke synkroniseres.')));
    }
    
    if (activeRecipe?.id === recipe.id) {
      saveActiveRecipe(updatedRecipe);
    }
  };

  const handleLogin = async () => {
    try {
      setAuthErrorMessage(null);
      markCloudSyncing('Logger ind...');
      const credential = await signInWithPopup(auth, googleProvider);
      setUser(credential.user);
      markCloudSaved('Cloud tilsluttet');
    } catch (error) {
      console.error("Login failed", error);
      const message = normalizeAuthError(error);
      setAuthErrorMessage(message);
      markCloudError(message);
      setError(message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setAuthErrorMessage(null);
      setSavedRecipes([]);
      setFolders([]);
      setActiveRecipe(null);
      setViewingRecipe(null);
      navigateTo('home');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleSmartAdjust = async (recipe: Recipe, instruction: string) => {
    setAdjusting(true);
    setError(null);
    try {
      const updated = await aiAdjustRecipe(recipe, instruction);
      setAiUnavailableMessage(null);
      setViewingRecipe(normalizeRecipeForCookMode({
        ...updated,
        id: recipe.id,
        lastUsed: new Date().toISOString(),
      }));
      trackEvent('ai_adjust_used', {
        ...getAnalyticsContext(),
        recipeId: recipe.id,
        action: 'smart_adjust',
      });
    } catch (err: any) {
      console.error('AI Adjust Error:', err);
      rememberAIDisabledState(err);
      setError(parseAIError(err, 'Kunne ikke tilpasse opskriften'));
    } finally {
      setAdjusting(false);
    }
  };

  const handleGenerateSteps = async (recipe: Recipe) => {
    setAdjusting(true);
    setError(null);
    try {
      const updated = await aiGenerateSteps(recipe, userLevel);
      setAiUnavailableMessage(null);
      setViewingRecipe(normalizeRecipeForCookMode({
        ...updated,
        id: recipe.id,
        lastUsed: new Date().toISOString(),
      }));
      trackEvent('ai_adjust_used', {
        ...getAnalyticsContext(),
        recipeId: recipe.id,
        action: 'generate_steps',
      });
    } catch (err: any) {
      console.error('AI Generate Error:', err);
      rememberAIDisabledState(err);
      setError(parseAIError(err, 'Kunne ikke generere fremgangsmåde'));
    } finally {
      setAdjusting(false);
    }
  };

  const handleFillRest = async (recipe: Recipe) => {
    setAdjusting(true);
    setError(null);
    try {
      const updated = await aiFillRest(recipe, userLevel);
      setAiUnavailableMessage(null);
      setViewingRecipe(normalizeRecipeForCookMode({
        ...updated,
        title: recipe.title,
        id: recipe.id,
        lastUsed: new Date().toISOString(),
      }));
      trackEvent('ai_adjust_used', {
        ...getAnalyticsContext(),
        recipeId: recipe.id,
        action: 'fill_rest',
      });
    } catch (err: any) {
      console.error('AI Fill Rest Error:', err);
      rememberAIDisabledState(err);
      setError(parseAIError(err, 'Kunne ikke udfylde resten'));
    } finally {
      setAdjusting(false);
    }
  };

  const handleGenerateTips = async (recipe: Recipe) => {
    setAdjusting(true);
    setError(null);
    try {
      const tipsAndTricks = await aiGenerateTips(recipe);
      setAiUnavailableMessage(null);
      const updatedRecipe: Recipe = normalizeRecipeForCookMode({ ...recipe, tipsAndTricks });
      setViewingRecipe(updatedRecipe);
      await handleSaveRecipe(updatedRecipe);
      trackEvent('ai_adjust_used', {
        ...getAnalyticsContext(),
        recipeId: recipe.id,
        action: 'generate_tips',
      });
    } catch (err: any) {
      console.error('AI Tips Error:', err);
      rememberAIDisabledState(err);
      setError(parseAIError(err, 'Kunne ikke generere tips'));
    } finally {
      setAdjusting(false);
    }
  };

  const handleEstimateNutrition = async (recipe: Recipe) => {
    setAdjusting(true);
    setError(null);
    try {
      const nutritionEstimate = await aiEstimateRecipeNutrition(recipe, userLevel);
      setAiUnavailableMessage(null);
      const updatedRecipe: Recipe = normalizeRecipeForCookMode({
        ...recipe,
        nutritionEstimate,
      });
      setViewingRecipe(updatedRecipe);
      await handleSaveRecipe(updatedRecipe);
      trackEvent('ai_adjust_used', {
        ...getAnalyticsContext(),
        recipeId: recipe.id,
        action: 'estimate_nutrition',
      });
    } catch (err: any) {
      console.error('AI Nutrition Estimate Error:', err);
      rememberAIDisabledState(err);
      setError(parseAIError(err, 'Kunne ikke estimere macro og kcal'));
    } finally {
      setAdjusting(false);
    }
  };

  const handleApplyPrefix = async (recipe: Recipe, prefix: string) => {
    setAdjusting(true);
    setError(null);
    try {
      const updated = await aiApplyPrefix(recipe, prefix);
      setAiUnavailableMessage(null);
      const newRecipe: Recipe = normalizeRecipeForCookMode({
        ...updated,
        id: Date.now().toString(),
        originalRecipeId: recipe.originalRecipeId || recipe.id,
        lastUsed: new Date().toISOString(),
      });
      setViewingRecipe(newRecipe);
      trackEvent('ai_adjust_used', {
        ...getAnalyticsContext(),
        recipeId: recipe.id,
        action: 'apply_prefix',
      });
    } catch (err: any) {
      console.error('AI Prefix Error:', err);
      rememberAIDisabledState(err);
      setError(parseAIError(err, 'Kunne ikke tilpasse opskriften'));
    } finally {
      setAdjusting(false);
    }
  };

  const handleStartCook = (recipe: Recipe, scale: number) => {
    const updatedRecipe = { ...recipe, lastUsed: new Date().toISOString(), scale };
    saveActiveRecipe(updatedRecipe);
    
    const newSaved = savedRecipes.map(r => r.id === recipe.id ? updatedRecipe : r);
    saveToLocalStorage(newSaved);
    
    trackEvent('cook_mode_started', {
      ...getAnalyticsContext(),
          recipeId: recipe.id,
          includePrep,
          scale,
    });
    navigateTo('cook');
  };

  const NavItem = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-16 h-16 transition-all duration-300 ${active ? 'text-forest-dark dark:text-white scale-105' : 'text-forest-mid dark:text-white/70 opacity-60 hover:opacity-100'}`}
    >
      <div className={`mb-1 ${active ? 'drop-shadow-[0_0_8px_rgba(44,53,49,0.3)]' : ''}`}>{icon}</div>
      <span className={`text-[11px] font-bold tracking-widest uppercase transition-all ${active ? 'opacity-100' : 'opacity-80'}`}>{label}</span>
    </button>
  );

  return (
    <SeasonalScene theme={theme} isCookMode={currentView === 'cook'}>
    <div className="h-screen flex flex-col font-sans text-forest-dark dark:text-white selection:bg-forest-mid/20 overflow-hidden">
      <PendingQueueToast
        pendingCount={isOnline ? retryableCount : 0}
        isProcessing={isProcessingQueue}
        message={queueProcessMessage}
        onProcessNow={() => { void processPendingQueue('manual'); }}
        onDismissMessage={clearQueueProcessMessage}
      />
      {updateAvailable && (
        <AppUpdateToast onUpdate={applyUpdate} onDismiss={dismiss} />
      )}
      
      <main className="flex-1 overflow-y-auto relative custom-scrollbar">
      {!isOnline && currentView !== 'cook' && (
        <div className="mb-4 rounded-2xl border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-amber-900 shadow-sm">
          <p className="text-sm font-serif italic">Du er offline. Cloud-sync og AI kræver internetforbindelse.</p>
        </div>
      )}


        {currentView === 'home' && (
        <HomeView 
          activeRecipe={activeRecipe} 
          recentRecipes={savedRecipes.filter(r => r.lastUsed).sort((a, b) => new Date(b.lastUsed!).getTime() - new Date(a.lastUsed!).getTime())}
          totalRecipes={savedRecipes.length}
          currentUser={user}
          isOnline={isOnline}
          onNavigate={navigateTo}
          onOpenRecipe={(r) => { setViewingRecipe(r); navigateTo('recipe'); }}
        />
      )}

      {currentView === 'active' && (
        <ActiveView 
          activeRecipe={activeRecipe}
          onNavigate={navigateTo}
          onSave={handleSaveRecipe}
          onOpenRecipe={(r) => { setViewingRecipe(r); navigateTo('recipe'); }}
        />
      )}

      {currentView === 'import' && (
        <ImportView 
          onImport={handleImport}
          onCreateManual={() => {
            const defaultFolder = findDefaultFolder(folders, user?.uid || 'local');
            const baseId = Date.now().toString();
            const newRecipe: Recipe = {
              id: baseId,
              title: '',
              summary: '',
              recipeType: '',
              categories: [],
              folder: defaultFolder?.name || DEFAULT_FOLDER_NAME,
              folderId: defaultFolder?.id,
              notes: '',
              servings: 4,
              ingredients: [{ id: `${baseId}-ingredient`, name: '', amount: null, unit: '', group: 'Andre' }],
              steps: [{ id: `${baseId}-step`, text: '', heat: '', timer: undefined, relevantIngredients: [] }],
              kitchenTimeline: [],
              lastUsed: new Date().toISOString()
            };
            setViewingRecipe(newRecipe);
            navigateTo('recipe');
          }}
          loading={loading}
          error={error}
          importPreference={importPreference}
          aiDisabledReason={aiDisabledReason}
        />
      )}

      {currentView === 'library' && (
        <LibraryView 
          savedRecipes={savedRecipes}
          allFolders={folders}
          onOpenRecipe={(r) => { setViewingRecipe(r); navigateTo('recipe'); }}
          onCreateFolder={handleCreateFolder}
          onCreateInFolder={(folder) => {
            const baseId = Date.now().toString();
            const newRecipe: Recipe = {
              id: baseId,
              title: '',
              summary: '',
              recipeType: '',
              categories: [],
              folder: folder.name,
              folderId: folder.id,
              notes: '',
              servings: 4,
              ingredients: [{ id: `${baseId}-ingredient`, name: '', amount: null, unit: '', group: 'Andre' }],
              steps: [{ id: `${baseId}-step`, text: '', heat: '', timer: undefined, relevantIngredients: [] }],
              kitchenTimeline: [],
              lastUsed: new Date().toISOString()
            };
            setViewingRecipe(newRecipe);
            navigateTo('recipe');
          }}
          onDeleteFolder={handleDeleteFolder}
          onRenameFolder={handleRenameFolder}
          onShareFolder={handleShareFolder}
          onRemoveFolderShare={handleRemoveFolderShare}
          onSetFolderPermissionState={handleSetFolderPermissionState}
          currentUser={user}
        />
      )}

      {currentView === 'recipe' && viewingRecipe && (
        <RecipeView 
          recipe={viewingRecipe}
          allCategories={Array.from(new Set(savedRecipes.flatMap(r => r.categories || [])))}
          allFolders={folders}
          currentUser={user}
          onFolderCreate={handleCreateFolder}
          onBack={goBack}
          onForward={goForward}
          hasForward={historyIndex < viewHistory.length - 1}
          onStartCook={handleStartCook}
          onSave={handleSaveRecipe}
          onDelete={() => handleDeleteRecipe(viewingRecipe.id)}
          onToggleFavorite={handleToggleFavorite}
          onSmartAdjust={handleSmartAdjust}
          onGenerateSteps={handleGenerateSteps}
          onFillRest={handleFillRest}
          onGenerateTips={handleGenerateTips}
          onEstimateNutrition={handleEstimateNutrition}
          onApplyPrefix={handleApplyPrefix}
          onUndoAI={(originalId) => {
            const original = savedRecipes.find(r => r.id === originalId);
            if (original) setViewingRecipe(original);
          }}
          isAdjusting={adjusting}
          error={error}
          aiDisabledReason={aiDisabledReason}
          initialEditMode={viewingRecipe.title === ''}
        />
      )}

      {currentView === 'cook' && (
        <CookView 
          recipe={activeRecipe}
          userLevel={userLevel}
          fontSize={cookFontSize}
          setFontSize={setCookFontSize}
          initialStep={activeRecipe ? (cookProgress[activeRecipe.id] || 0) : 0}
          includePrep={includePrep}
          onStepChange={(step) => {
            if (activeRecipe) {
              setCookProgress(prev => ({ ...prev, [activeRecipe.id]: step }));
            }
          }}
          onExit={() => navigateTo('active')}
          onCompleteCooking={() => {
            if (activeRecipe) {
              trackEvent('cook_mode_completed', {
                ...getAnalyticsContext(),
                recipeId: activeRecipe.id,
                completionMethod: 'final_step_confirmed',
              });
            }
            navigateTo('active');
          }}
          onStopCooking={() => {
            if (activeRecipe) {
              trackEvent('cook_mode_completed', {
                ...getAnalyticsContext(),
                recipeId: activeRecipe.id,
                completionMethod: 'explicit_stop',
              });
              setCookProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[activeRecipe.id];
                return newProgress;
              });
            }
            saveActiveRecipe(null);
            navigateTo('home');
          }}
          timers={timers}
          setTimers={setTimers}
        />
      )}

      {currentView === 'settings' && (
        <SettingsView 
          onBack={() => navigateTo('home')}
          user={user}
          onLogin={handleLogin}
          onLogout={handleLogout}
          theme={theme}
          setTheme={setTheme}
          isDarkMode={isDarkMode}
          onDarkModeChange={handleDarkModeChange}
          userLevel={userLevel}
          setUserLevel={setUserLevel}
          importPreference={importPreference}
          setImportPreference={setImportPreference}
          autoAiImportEnhancement={autoAiImportEnhancement}
          setAutoAiImportEnhancement={setAutoAiImportEnhancement}
          includePrep={includePrep}
          setIncludePrep={setIncludePrep}
          cookFontSize={cookFontSize}
          setCookFontSize={setCookFontSize}
          onExportBackup={handleExportBackup}
          onImportBackup={() => backupImportRef.current?.click()}
          lastBackupAt={lastBackupAt}
          cloudSyncStatus={cloudSyncStatus}
          cloudSyncMessage={cloudSyncMessage}
          cloudLastSyncAt={cloudLastSyncAt}
          authErrorMessage={authErrorMessage}
          appVersion={appVersion}
          isOnline={isOnline}
          aiDisabledReason={aiDisabledReason}
        />
      )}
      </main>


      {undoDeleteRecipe && (
        <UndoToast
          title="Opskrift slettet"
          description="Du kan fortryde i et øjeblik."
          onUndo={() => {
            clearTimeout(undoDeleteRecipe.timeoutId);
            const restored = [...savedRecipes];
            restored.splice(Math.min(undoDeleteRecipe.index, restored.length), 0, undoDeleteRecipe.recipe);
            saveToLocalStorage(restored);
            setUndoDeleteRecipe(null);
            if (user) {
              markCloudSaved('Sletning fortrudt');
            }
          }}
          onDismiss={() => {
            clearTimeout(undoDeleteRecipe.timeoutId);
            if (user) finalizeRecipeDeletion(undoDeleteRecipe.recipe.id);
            setUndoDeleteRecipe(null);
          }}
        />
      )}

      {undoDeleteFolder && (
        <UndoToast
          title="Mappe slettet"
          description={undoDeleteFolder.movedRecipes.length > 0
            ? `Du kan fortryde i et øjeblik. ${undoDeleteFolder.movedRecipes.length} opskrift${undoDeleteFolder.movedRecipes.length === 1 ? '' : 'er'} blev flyttet til Opskrifter.`
            : 'Du kan fortryde i et øjeblik.'}
          onUndo={() => {
            clearTimeout(undoDeleteFolder.timeoutId);
            setFolders(undoDeleteFolder.prevFolders);
            saveLocalFolders(undoDeleteFolder.prevFolders);
            setSavedRecipes(undoDeleteFolder.prevRecipes);
            saveLocalRecipes(undoDeleteFolder.prevRecipes);

            if (viewingRecipe) {
              const restoredViewing = undoDeleteFolder.prevRecipes.find(r => r.id === viewingRecipe.id) || null;
              setViewingRecipe(restoredViewing);
            }
            if (activeRecipe) {
              const restoredActive = undoDeleteFolder.prevRecipes.find(r => r.id === activeRecipe.id) || null;
              saveActiveRecipe(restoredActive);
            }

            setUndoDeleteFolder(null);
            if (user) markCloudSaved('Sletning fortrudt');
            trackEvent('folder_deleted_undone', {
              ...getAnalyticsContext(),
              folderId: undoDeleteFolder.folder.id,
              movedRecipesCount: undoDeleteFolder.movedRecipes.length,
            });
          }}
          onDismiss={() => {
            clearTimeout(undoDeleteFolder.timeoutId);
            if (user) finalizeFolderDeletion(undoDeleteFolder.folder.id, undoDeleteFolder.movedRecipes);
            setUndoDeleteFolder(null);
          }}
        />
      )}

      <input
        ref={backupImportRef}
        type="file"
        accept="application/json,.json"
        onChange={handleBackupImport}
        className="hidden"
      />

      {/* Global Timers */}
      {currentView !== 'cook' && timers.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {timers.map((t, index) => {
            const Icon = getTimerIcon(t.description);
            return (
              <div 
                key={t.id} 
                className="absolute pointer-events-auto timer-widget transition-all duration-300"
                style={{ 
                  right: 16,
                  bottom: 100 + (index * 80)
                }}
              >
                <div className="relative group">
                  <div 
                    className={`glass-brushed border border-white/20 dark:border-white/10 rounded-full w-16 h-16 shadow-xl flex flex-col items-center justify-center cursor-pointer bg-white/40 dark:bg-black/40 backdrop-blur-md hover:scale-105 transition-all ${t.remaining === 0 ? 'animate-pulse bg-red-500/20 border-red-500/30' : ''}`}
                    onClick={() => {
                      setActiveTimerPopup(activeTimerPopup === t.id ? null : t.id);
                    }}
                  >
                    <Icon size={20} className={t.remaining === 0 ? 'text-red-500' : 'text-forest-dark dark:text-white'} />
                    <span className={`text-[11px] font-mono font-bold mt-0.5 ${t.remaining === 0 ? 'text-red-500' : 'text-forest-dark dark:text-white'}`}>
                      {Math.floor(t.remaining / 60)}:{(t.remaining % 60).toString().padStart(2, '0')}
                    </span>
                    {t.remaining === 0 && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                    )}
                  </div>
                  
                  {/* Popup */}
                  {activeTimerPopup === t.id && (
                    <div 
                      className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 glass-brushed bg-white/95 dark:bg-black/95 p-6 rounded-3xl shadow-2xl border border-white/40 dark:border-white/10 w-[90%] max-w-sm animate-in zoom-in-95 duration-200 z-[60]"
                    >
                      <div className="flex items-center justify-center mb-4">
                        {Icon === Microwave ? (
                          <div className={`p-4 rounded-full ${t.remaining === 0 ? 'bg-red-500/20 text-red-500' : 'bg-forest-dark/10 dark:bg-white/10 text-forest-dark dark:text-white'}`}>
                            <OvenAnimation />
                          </div>
                        ) : Icon === CookingPot ? (
                          <div className={`p-4 rounded-full ${t.remaining === 0 ? 'bg-red-500/20 text-red-500' : 'bg-forest-dark/10 dark:bg-white/10 text-forest-dark dark:text-white'}`}>
                            <PotAnimation />
                          </div>
                        ) : (
                          <div className={`p-4 rounded-full ${t.remaining === 0 ? 'bg-red-500/20 text-red-500' : 'bg-forest-dark/10 dark:bg-white/10 text-forest-dark dark:text-white'}`}>
                            <Icon size={40} />
                          </div>
                        )}
                      </div>
                      <div className="text-sm font-bold text-forest-mid dark:text-white/70 uppercase tracking-widest mb-2 text-center">
                        {t.description}
                      </div>
                      <div className={`text-5xl font-mono tracking-tighter mb-8 text-center ${t.remaining === 0 ? 'text-red-500' : 'text-forest-dark dark:text-white'}`}>
                        {Math.floor(t.remaining / 60)}:{(t.remaining % 60).toString().padStart(2, '0')}
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setTimers(timers.map(timer => timer.id === t.id ? { ...timer, active: !timer.active } : timer));
                          }}
                          className="flex-1 py-4 bg-forest-dark text-white rounded-2xl text-sm font-bold uppercase tracking-widest hover:bg-forest-mid transition-colors shadow-md"
                        >
                          {t.active && t.remaining > 0 ? 'Pause' : 'Start'}
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setTimers(timers.filter(timer => timer.id !== t.id));
                            setActiveTimerPopup(null);
                          }}
                          className="flex-1 py-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl text-sm font-bold uppercase tracking-widest hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors shadow-md"
                        >
                          Stop
                        </button>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTimerPopup(null);
                        }}
                        className="w-full mt-3 py-3 text-forest-mid dark:text-white/50 text-xs font-bold uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
                      >
                        Skjul
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Navigation */}
      {currentView !== 'cook' && currentView !== 'settings' && (
        <nav className="relative w-full glass-brushed bg-white/70 dark:bg-black/70 border-t border-white/20 pb-[env(safe-area-inset-bottom)] z-50 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] print:hidden">
          <div className="flex justify-around items-center h-20 px-2 sm:px-4 max-w-md mx-auto">
            <NavItem icon={<Home size={22} />} label="Hjem" active={currentView === 'home'} onClick={() => navigateTo('home')} />
            <NavItem icon={<CookingPot size={22} />} label="I gang" active={currentView === 'active'} onClick={() => navigateTo('active')} />
            <NavItem icon={<PlusCircle size={22} />} label="Tilføj" active={currentView === 'import'} onClick={() => navigateTo('import')} />
            <NavItem icon={<BookOpen size={22} />} label="Arkiv" active={currentView === 'library'} onClick={() => navigateTo('library')} />
          </div>
        </nav>
      )}
    </div>
    </SeasonalScene>
  );
}

