import { useCallback, useState } from 'react';
import type { ViewState } from '../types';

export function useAppNavigation() {
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [viewHistory, setViewHistory] = useState<ViewState[]>(['home']);
  const [historyIndex, setHistoryIndex] = useState(0);

  const navigateTo = useCallback((view: ViewState) => {
    const newHistory = viewHistory.slice(0, historyIndex + 1);
    newHistory.push(view);
    setViewHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCurrentView(view);
  }, [historyIndex, viewHistory]);

  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setCurrentView(viewHistory[historyIndex - 1]);
    } else {
      setCurrentView('home');
    }
  }, [historyIndex, viewHistory]);

  const goForward = useCallback(() => {
    if (historyIndex < viewHistory.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setCurrentView(viewHistory[historyIndex + 1]);
    }
  }, [historyIndex, viewHistory]);

  const hasForward = historyIndex < viewHistory.length - 1;

  return {
    currentView,
    setCurrentView,
    navigateTo,
    goBack,
    goForward,
    hasForward,
  };
}
