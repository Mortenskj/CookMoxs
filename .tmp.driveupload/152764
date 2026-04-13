export const ALLOWED_LEARNING_SIGNAL_CATEGORIES = [
  'explicit_first_party_events',
  'explicit_user_feedback',
  'explicit_module_preferences',
  'separate_learning_profile_records',
] as const;

export const DISALLOWED_LEARNING_SIGNAL_CATEGORIES = [
  'opaque_behavioral_scoring',
  'cross_user_or_household_blending',
  'sensitive_inference',
  'passive_tracking',
  'silent_content_or_permission_changes',
  'growth_or_monetization_expansion',
] as const;

export type AllowedLearningSignalCategory = typeof ALLOWED_LEARNING_SIGNAL_CATEGORIES[number];
export type DisallowedLearningSignalCategory = typeof DISALLOWED_LEARNING_SIGNAL_CATEGORIES[number];

export type LearningSignalEventName =
  | 'recipe_import_started'
  | 'recipe_import_succeeded'
  | 'recipe_import_failed'
  | 'recipe_saved'
  | 'recipe_deleted'
  | 'cook_mode_started'
  | 'cook_mode_completed'
  | 'ai_adjust_used'
  | 'backup_exported'
  | 'backup_restored'
  | 'folder_shared'
  | 'folder_deleted_undone'
  | 'module_enabled'
  | 'module_disabled';

export interface LearningProfileBoundary {
  recipeCoreDataEmbeddingAllowed: false;
  backupEmbeddingAllowed: false;
  localStorageShapeChangeAllowedInStep: false;
  firestoreStructureChangeAllowedInStep: false;
  userFacingSuggestionBehaviorAllowedInStep: false;
}

export interface LearningProfileRecordContract {
  namespace: 'learning_profile';
  storageBoundary: 'separate_from_recipe_core_data';
  allowedSignalCategories: readonly AllowedLearningSignalCategory[];
  disallowedSignalCategories: readonly DisallowedLearningSignalCategory[];
  allowedEventNames: readonly LearningSignalEventName[];
}

export const LEARNING_PROFILE_BOUNDARY: LearningProfileBoundary = {
  recipeCoreDataEmbeddingAllowed: false,
  backupEmbeddingAllowed: false,
  localStorageShapeChangeAllowedInStep: false,
  firestoreStructureChangeAllowedInStep: false,
  userFacingSuggestionBehaviorAllowedInStep: false,
};

export const LEARNING_PROFILE_RECORD_CONTRACT: LearningProfileRecordContract = {
  namespace: 'learning_profile',
  storageBoundary: 'separate_from_recipe_core_data',
  allowedSignalCategories: ALLOWED_LEARNING_SIGNAL_CATEGORIES,
  disallowedSignalCategories: DISALLOWED_LEARNING_SIGNAL_CATEGORIES,
  allowedEventNames: [
    'recipe_import_started',
    'recipe_import_succeeded',
    'recipe_import_failed',
    'recipe_saved',
    'recipe_deleted',
    'cook_mode_started',
    'cook_mode_completed',
    'ai_adjust_used',
    'backup_exported',
    'backup_restored',
    'folder_shared',
    'folder_deleted_undone',
    'module_enabled',
    'module_disabled',
  ],
};
