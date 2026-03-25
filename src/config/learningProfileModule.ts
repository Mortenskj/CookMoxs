export const LEARNING_PROFILE_MODULE = {
  id: 'learning_profile',
  available: true,
  defaultFeedbackEnabled: false,
  storageBoundary: 'separate_module_store',
  persistenceMode: 'local_storage_profile_only',
  recordNamespace: 'learning_profile',
  recordVersion: 1,
} as const;

export function isLearningProfileModuleAvailable() {
  return LEARNING_PROFILE_MODULE.available;
}

export function getLearningProfileModuleStatus() {
  return {
    id: LEARNING_PROFILE_MODULE.id,
    available: LEARNING_PROFILE_MODULE.available,
    defaultFeedbackEnabled: LEARNING_PROFILE_MODULE.defaultFeedbackEnabled,
    storageBoundary: LEARNING_PROFILE_MODULE.storageBoundary,
    persistenceMode: LEARNING_PROFILE_MODULE.persistenceMode,
    recordNamespace: LEARNING_PROFILE_MODULE.recordNamespace,
    recordVersion: LEARNING_PROFILE_MODULE.recordVersion,
  };
}
