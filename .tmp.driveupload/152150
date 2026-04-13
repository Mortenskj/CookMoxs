import {
  getLearningProfileModuleStatus,
  isLearningProfileModuleAvailable,
  LEARNING_PROFILE_MODULE,
} from '../config/learningProfileModule';
import { STORAGE_KEYS } from '../config/storageKeys';
import type {
  AllowedLearningSignalCategory,
  LearningSignalEventName,
} from '../config/learningSignalContract';

export type LearningFeedbackValue = 'positive' | 'negative' | 'neutral';
export type LearningFeedbackArea = 'general' | 'import' | 'cook_mode' | 'library';

export interface LearningProfileFeedbackEntry {
  area: LearningFeedbackArea;
  eventName: LearningSignalEventName;
  value: LearningFeedbackValue;
  createdAt: string;
  note?: string;
}

export interface LearningProfileRecord {
  namespace: typeof LEARNING_PROFILE_MODULE.recordNamespace;
  version: typeof LEARNING_PROFILE_MODULE.recordVersion;
  updatedAt: string;
  signalSources: AllowedLearningSignalCategory[];
  explicitPreferences: Record<string, string | number | boolean | null>;
  explicitFeedback: LearningProfileFeedbackEntry[];
}

export interface LearningProfileStoreStatus {
  available: boolean;
  feedbackEnabled: boolean;
  persistenceMode: 'local_storage_profile_only';
  storageBoundary: 'separate_module_store';
}

export interface LearningProfileTransparencySnapshot {
  status: LearningProfileStoreStatus;
  record: LearningProfileRecord | null;
  feedbackEntryCount: number;
  lastFeedbackAt: string | null;
  recentFeedback: LearningProfileFeedbackEntry[];
}

type RawLearningProfileRecord = LearningProfileRecord | null;
export const LEARNING_PROFILE_CHANGED_EVENT = 'cookmoxs:learning-profile-changed';

function readLocalStorage(key: string) {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage.getItem(key);
}

function emitLearningProfileChanged() {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent(LEARNING_PROFILE_CHANGED_EVENT));
}

function writeLocalStorage(key: string, value: string) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(key, value);
}

function removeLocalStorage(key: string) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(key);
}

function parseLearningProfileRecord(raw: string | null): RawLearningProfileRecord {
  if (!raw) {
    return null;
  }

  try {
    const data = JSON.parse(raw) as Partial<LearningProfileRecord>;
    if (
      data?.namespace !== LEARNING_PROFILE_MODULE.recordNamespace ||
      data?.version !== LEARNING_PROFILE_MODULE.recordVersion ||
      !Array.isArray(data.explicitFeedback) ||
      !Array.isArray(data.signalSources) ||
      !data.explicitPreferences ||
      typeof data.explicitPreferences !== 'object'
    ) {
      return null;
    }

    return data as LearningProfileRecord;
  } catch {
    return null;
  }
}

export function createEmptyLearningProfileRecord(): LearningProfileRecord {
  return {
    namespace: LEARNING_PROFILE_MODULE.recordNamespace,
    version: LEARNING_PROFILE_MODULE.recordVersion,
    updatedAt: new Date().toISOString(),
    signalSources: [],
    explicitPreferences: {},
    explicitFeedback: [],
  };
}

export function getLearningProfileStoreStatus(): LearningProfileStoreStatus {
  const status = getLearningProfileModuleStatus();
  return {
    available: status.available,
    feedbackEnabled: isLearningProfileFeedbackEnabled(),
    persistenceMode: status.persistenceMode,
    storageBoundary: status.storageBoundary,
  };
}

export function isLearningProfileFeedbackEnabled() {
  if (!isLearningProfileModuleAvailable()) {
    return false;
  }

  const raw = readLocalStorage(STORAGE_KEYS.learningFeedbackEnabled);
  if (raw === null) {
    return LEARNING_PROFILE_MODULE.defaultFeedbackEnabled;
  }

  return raw === 'true';
}

export function setLearningProfileFeedbackEnabled(enabled: boolean) {
  if (!isLearningProfileModuleAvailable()) {
    return;
  }

  writeLocalStorage(STORAGE_KEYS.learningFeedbackEnabled, String(enabled));
  emitLearningProfileChanged();
}

export async function loadLearningProfileRecord(): Promise<LearningProfileRecord | null> {
  if (!isLearningProfileFeedbackEnabled()) {
    return null;
  }

  return parseLearningProfileRecord(readLocalStorage(STORAGE_KEYS.learningProfile)) || createEmptyLearningProfileRecord();
}

export async function saveLearningProfileRecord(record: LearningProfileRecord): Promise<LearningProfileRecord | null> {
  if (!isLearningProfileFeedbackEnabled()) {
    return null;
  }

  const nextRecord = {
    ...record,
    updatedAt: new Date().toISOString(),
  };

  writeLocalStorage(STORAGE_KEYS.learningProfile, JSON.stringify(nextRecord));
  emitLearningProfileChanged();
  return nextRecord;
}

export async function appendLearningFeedbackEntry(
  entry: Omit<LearningProfileFeedbackEntry, 'createdAt'>,
): Promise<LearningProfileRecord | null> {
  if (!isLearningProfileFeedbackEnabled()) {
    return null;
  }

  const currentRecord = await loadLearningProfileRecord() || createEmptyLearningProfileRecord();
  const feedbackSignalSource: AllowedLearningSignalCategory = 'explicit_user_feedback';
  const signalSources = currentRecord.signalSources.includes(feedbackSignalSource)
    ? currentRecord.signalSources
    : [...currentRecord.signalSources, feedbackSignalSource];

  return saveLearningProfileRecord({
    ...currentRecord,
    signalSources,
    explicitFeedback: [
      {
        ...entry,
        createdAt: new Date().toISOString(),
      },
      ...currentRecord.explicitFeedback,
    ].slice(0, 20),
  });
}

export async function clearLearningProfileRecord(): Promise<void> {
  if (!isLearningProfileModuleAvailable()) {
    return;
  }

  removeLocalStorage(STORAGE_KEYS.learningProfile);
  removeLocalStorage(STORAGE_KEYS.learningFeedbackEnabled);
  emitLearningProfileChanged();
}

export async function getLearningProfileTransparencySnapshot(): Promise<LearningProfileTransparencySnapshot> {
  const status = getLearningProfileStoreStatus();
  const record = await loadLearningProfileRecord();
  const recentFeedback = record?.explicitFeedback.slice(0, 5) || [];

  return {
    status,
    record,
    feedbackEntryCount: record?.explicitFeedback.length || 0,
    lastFeedbackAt: recentFeedback[0]?.createdAt || null,
    recentFeedback,
  };
}
