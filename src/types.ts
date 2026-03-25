export type ShareRole = 'viewer' | 'editor';
export type HouseholdRole = 'owner' | 'admin' | 'member';
export type HouseholdMemberStatus = 'invited' | 'active';
export type OwnershipType = 'private' | 'shared' | 'household';

export interface SharedUser {
  uid: string;
  email: string;
  role: ShareRole;
}

export interface OwnershipMetadata {
  type: OwnershipType;
  ownerUserId?: string;
  householdId?: string;
  inheritedFromFolderId?: string;
}

export interface HouseholdMember {
  uid?: string;
  email?: string | null;
  displayName?: string | null;
  role: HouseholdRole;
  status: HouseholdMemberStatus;
  invitedAt?: string;
  joinedAt?: string;
}

export interface Household {
  id: string;
  name: string;
  ownerUID: string;
  adminUids?: string[];
  memberUids?: string[];
  members?: HouseholdMember[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Ingredient {
  id: string;
  name: string;
  amount: number | null;
  unit: string;
  group?: string;
  locked?: boolean;
}

export interface StepIngredient {
  name: string;
  amount: number | string | null;
  unit: string;
}

export interface StepTimer {
  duration: number;
  description: string;
}

export interface Step {
  id: string;
  text: string;
  heat?: string;
  relevantIngredients?: StepIngredient[];
  timer?: StepTimer;
  reminder?: string;
}

export interface TimelineEvent {
  at: string;
  text: string;
}

export interface BetterModes {
  smag?: string;
  enkel?: string;
  boernevenlig?: string;
}

export type NutritionConfidence = 'high' | 'medium' | 'low';

export interface RecipeNutritionFacts {
  energyKcalPer100g?: number | null;
  fatPer100g?: number | null;
  carbsPer100g?: number | null;
  proteinPer100g?: number | null;
}

export interface RecipeNutritionProvenance {
  providerId: string;
  providerLabel: string;
  sourceUrl?: string;
  fetchedAt: string;
  confidence: NutritionConfidence;
  isFallback: boolean;
  notes?: string;
}

export interface RecipeNutritionAttachment {
  productId: string;
  title: string;
  brand?: string;
  barcode?: string;
  mode: 'barcode' | 'text_search';
  query: string;
  attachedAt: string;
  nutrition?: RecipeNutritionFacts;
  provenance: RecipeNutritionProvenance;
}

export interface Timer {
  id: string;
  duration: number;
  remaining: number;
  description: string;
  active: boolean;
}

export interface Folder {
  id: string;
  name: string;
  ownerUID: string;
  householdId?: string;
  ownership?: OwnershipMetadata;
  sharedWith?: SharedUser[];
  editorUids?: string[];
  viewerUids?: string[];
  isDefault?: boolean;
}

export interface Recipe {
  id: string;
  title: string;
  summary?: string;
  recipeType?: string;
  categories?: string[];
  folder?: string;
  folderId?: string;
  isSaved?: boolean;
  notes?: string;
  servings: number;
  servingsUnit?: string;
  ingredients: Ingredient[];
  steps: Step[];
  flavorBoosts?: string[];
  pitfalls?: string[];
  hints?: string[];
  substitutions?: string[];
  heatGuide?: string[];
  ovenGuide?: string[];
  betterModes?: BetterModes;
  kitchenTimeline?: TimelineEvent[];
  isFavorite?: boolean;
  lastUsed?: string;
  sourceUrl?: string;
  scale?: number;
  aiRationale?: string;
  tipsAndTricks?: string[];
  originalRecipeId?: string;
  authorUID?: string;
  householdId?: string;
  ownership?: OwnershipMetadata;
  nutritionAttachment?: RecipeNutritionAttachment;
  createdAt?: string;
  updatedAt?: string;
}

export type ViewState = 'home' | 'active' | 'import' | 'cook' | 'library' | 'recipe' | 'settings';
