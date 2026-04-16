import { Recipe, Ingredient, Step, Folder as FolderType } from '../types';
import { ChefHat, Heart, Printer, Save, ArrowLeft, ArrowRight, Clock, Flame, Info, AlertTriangle, Lightbulb, Edit3, Trash2, Plus, Minus, X, Lock, Unlock, Wand2, Loader2, Check, Folder, AlertCircle, Share2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DEFAULT_RECIPE_CATEGORIES, COMMON_INGREDIENT_SUGGESTIONS, COMMON_RECIPE_UNITS } from '../config/recipeEditorOptions';
import { RECIPE_PRINT_STYLES } from '../config/recipePrintStyles';
import { OwnershipBadge } from './OwnershipBadge';
import { FolderVisibilityNotice } from './FolderVisibilityNotice';
import { RecipeImportedNotice } from './RecipeImportedNotice';
import { RecipeNutritionAttachmentCard } from './RecipeNutritionAttachmentCard';
import { useFlavorBoostsVisible } from '../hooks/useFlavorBoostsVisible';
import { formatHeatGuideEntry, formatStepHeatDisplay } from '../services/cookModeHeuristics';
import { DEFAULT_FOLDER_NAME } from '../services/defaultFolderService';
import {
  canConvertIngredientBetweenGramsAndDeciliters,
  convertIngredientBetweenGramsAndDeciliters,
} from '../services/ingredientUnitConversionService';
import { findFolderForRecipe, getFolderOwnershipDisplay, getRecipeOwnershipDisplay } from '../services/ownershipLabelService';

interface RecipeViewProps {
  recipe: Recipe;
  allCategories: string[];
  allFolders: FolderType[];
  onFolderCreate?: (folderName: string) => void;
  onBack: () => void;
  onForward?: () => void;
  hasForward?: boolean;
  onStartCook: (recipe: Recipe, scale: number) => void;
  onSave: (recipe: Recipe) => void;
  onDelete: () => void;
  onToggleFavorite: (recipe: Recipe) => void;
  onSmartAdjust: (recipe: Recipe, instruction: string) => void;
  onGenerateSteps?: (recipe: Recipe) => void;
  onFillRest?: (recipe: Recipe) => void;
  onPolishIngredients?: (recipe: Recipe) => void;
  onPolishSteps?: (recipe: Recipe) => void;
  onSuggestTags?: (recipe: Recipe) => void;
  onGenerateTips?: (recipe: Recipe) => void;
  onEstimateNutrition?: (recipe: Recipe) => void;
  onApplyPrefix?: (recipe: Recipe, prefix: string) => void;
  onUndoAI?: (originalId: string) => void;
  isAdjusting?: boolean;
  activeAiAction?: 'smart_adjust' | 'generate_steps' | 'fill_rest' | 'polish_ingredients' | 'polish_steps' | 'suggest_tags' | 'generate_tips' | 'estimate_nutrition' | 'apply_prefix' | null;
  error?: string | null;
  aiDisabledReason?: string | null;
  initialEditMode?: boolean;
  currentUser?: any;
}

export function RecipeView({ recipe, allCategories, allFolders, onFolderCreate, onBack, onForward, hasForward, onStartCook, onSave, onDelete, onToggleFavorite, onSmartAdjust, onGenerateSteps, onFillRest, onPolishIngredients, onPolishSteps, onSuggestTags, onGenerateTips, onEstimateNutrition, onApplyPrefix, onUndoAI, isAdjusting, activeAiAction, error, aiDisabledReason, initialEditMode = false, currentUser }: RecipeViewProps) {
  const [scale, setScale] = useState(1);
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [editData, setEditData] = useState<Recipe>(recipe);
  const [history, setHistory] = useState<Recipe[]>([recipe]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const updateEditData = (newData: Recipe) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newData);
    // Limit history to 20 steps
    if (newHistory.length > 20) newHistory.splice(1, 1);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setEditData(newData);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setEditData(prev);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setEditData(next);
    }
  };
  const [showSmartModal, setShowSmartModal] = useState(false);
  const [showAddIngredientModal, setShowAddIngredientModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newIngredient, setNewIngredient] = useState<Ingredient>({ id: '', name: '', amount: null, unit: '', group: 'Andre' });
  const [smartInstruction, setSmartInstruction] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [activeIngredientIndex, setActiveIngredientIndex] = useState<number | null>(null);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showTipsModal, setShowTipsModal] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [editPermissionConfirmed, setEditPermissionConfirmed] = useState(false);
  const [folderConfirmationError, setFolderConfirmationError] = useState<string | null>(null);
  const [conversionMessage, setConversionMessage] = useState<string | null>(null);
  const [pendingFolderSaveId, setPendingFolderSaveId] = useState<string | null>(null);
  const [confirmedIngredients, setConfirmedIngredients] = useState<Record<string, boolean>>({});
  const aiDisabled = Boolean(aiDisabledReason);
  const ownership = getRecipeOwnershipDisplay(recipe, allFolders, currentUser);
  const currentFolder = findFolderForRecipe(recipe, allFolders);
  const selectedEditFolder = findFolderForRecipe(editData, allFolders);
  const activeFolderLabel = recipe.folder === DEFAULT_FOLDER_NAME ? 'HJEM' : recipe.folder;
  const pendingFolderSave = pendingFolderSaveId ? allFolders.find((folder) => folder.id === pendingFolderSaveId) || null : null;
  const recipeIngredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const recipeSteps = Array.isArray(recipe.steps) ? recipe.steps : [];
  const recipeCategories = Array.isArray(recipe.categories) ? recipe.categories : [];
  const recipeTips = Array.isArray(recipe.tipsAndTricks) ? recipe.tipsAndTricks : [];
  const recipeHeatGuide = Array.isArray(recipe.heatGuide) ? recipe.heatGuide : [];
  const { visible: flavorBoostsVisible } = useFlavorBoostsVisible();
  const recipeFlavorBoosts = flavorBoostsVisible && Array.isArray(recipe.flavorBoosts) ? recipe.flavorBoosts : [];
  const recipePitfalls = flavorBoostsVisible && Array.isArray(recipe.pitfalls) ? recipe.pitfalls : [];
  const recipeHints = Array.isArray(recipe.hints) ? recipe.hints : [];
  const editIngredients = Array.isArray(editData.ingredients) ? editData.ingredients : [];
  const editSteps = Array.isArray(editData.steps) ? editData.steps : [];
  const editCategories = Array.isArray(editData.categories) ? editData.categories : [];
  const mutableFolders = currentUser?.uid
    ? allFolders.filter((folder) => folder.ownerUID === currentUser.uid)
    : allFolders;
  const canMutateRecipe = !currentUser?.uid
    || (!recipe.isSaved && (!recipe.authorUID || recipe.authorUID === currentUser.uid))
    || (
      recipe.authorUID === currentUser.uid
      && (!currentFolder || currentFolder.ownerUID === currentUser.uid)
    );

  const requiresPermissionConfirmation = (targetFolder?: FolderType) => {
    if (!targetFolder) return false;
    if (getFolderOwnershipDisplay(targetFolder, currentUser).state === 'private') return false;
    return !recipe.isSaved || targetFolder.id !== currentFolder?.id;
  };

  const editRequiresPermissionConfirmation = requiresPermissionConfirmation(selectedEditFolder);
  const isSmartAdjusting = activeAiAction === 'smart_adjust';
  const isGeneratingSteps = activeAiAction === 'generate_steps';
  const isFillingRest = activeAiAction === 'fill_rest';
  const isPolishingIngredients = activeAiAction === 'polish_ingredients';
  const isPolishingSteps = activeAiAction === 'polish_steps';
  const isSuggestingTags = activeAiAction === 'suggest_tags';
  const isGeneratingTips = activeAiAction === 'generate_tips';
  const isEstimatingNutrition = activeAiAction === 'estimate_nutrition';
  const isApplyingPrefix = activeAiAction === 'apply_prefix';

  useEffect(() => {
    if (!isEditing || isAdjusting) {
      setEditData(recipe);
      setHistory([recipe]);
      setHistoryIndex(0);
    }
  }, [recipe, isEditing, isAdjusting]);

  useEffect(() => {
    const originalTitle = document.title;
    document.title = `CookMoxs - ${recipe.title}`;
    return () => { document.title = originalTitle; };
  }, [recipe.title]);

  useEffect(() => {
    setEditPermissionConfirmed(false);
    setFolderConfirmationError(null);
  }, [isEditing, selectedEditFolder?.id, recipe.id]);

  useEffect(() => {
    if (!canMutateRecipe && isEditing) {
      setIsEditing(false);
    }
  }, [canMutateRecipe, isEditing]);

  useEffect(() => {
    setConversionMessage(null);
  }, [recipe.id, isEditing]);

  const mergedCategories = Array.from(new Set([...DEFAULT_RECIPE_CATEGORIES, ...allCategories])).sort();


  const toggleLock = (ingId: string) => {
    if (!canMutateRecipe) return;

    const updatedRecipe = {
      ...recipe,
      ingredients: recipeIngredients.map(ing => 
        ing.id === ingId ? { ...ing, locked: !ing.locked } : ing
      )
    };
    onSave(updatedRecipe);
  };

  const applyRecipeIngredientConversion = (ingredientIndex: number) => {
    const ingredient = recipeIngredients[ingredientIndex];
    if (!ingredient || !canMutateRecipe) return;

    const conversion = convertIngredientBetweenGramsAndDeciliters(ingredient);
    if ('message' in conversion) {
      setConversionMessage(conversion.message);
      return;
    }

    const nextIngredients = [...recipeIngredients];
    nextIngredients[ingredientIndex] = conversion.ingredient;
    setConversionMessage(null);
    onSave({ ...recipe, ingredients: nextIngredients });
  };

  const convertUnit = (index: number) => {
    const ing = editIngredients[index];
    if (!ing) return;

    const conversion = convertIngredientBetweenGramsAndDeciliters(ing);
    if ('message' in conversion) {
      setConversionMessage(conversion.message);
      return;
    }

    setConversionMessage(null);
    if (conversion.ingredient.amount !== ing.amount || conversion.ingredient.unit !== ing.unit) {
      const newIngs = [...editIngredients];
      newIngs[index] = conversion.ingredient;
      updateEditData({ ...editData, ingredients: newIngs });
    }
  };

  const handleScale = (newScale: number) => {
    if (newScale > 0) setScale(newScale);
  };

  const handleSaveEdit = () => {
    if (!canMutateRecipe) {
      return;
    }

    if (editRequiresPermissionConfirmation && !editPermissionConfirmed) {
      setFolderConfirmationError('Bekræft at opskriften må arve synligheden fra den valgte mappe.');
      return;
    }

    const dataToSave = { ...editData };
    if (!dataToSave.folder || dataToSave.folder.trim() === '') {
      dataToSave.folder = 'Opskrift';
    }
    onSave(dataToSave);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditData(recipe);
    setIsEditing(false);
    setCategorySearch('');
    setShowCategoryDropdown(false);
  };

  const commitFolderSave = (targetFolder?: FolderType | null) => {
    if (!canMutateRecipe) {
      return;
    }

    if (targetFolder) {
      onSave({ ...recipe, folder: targetFolder.name, folderId: targetFolder.id });
    } else {
      onSave({ ...recipe, folder: 'Opskrift', folderId: undefined });
    }
    setPendingFolderSaveId(null);
    setShowFolderPicker(false);
  };

  const openFolderPickerForSave = () => {
    if (!canMutateRecipe) {
      return;
    }

    setPendingFolderSaveId(requiresPermissionConfirmation(currentFolder) ? currentFolder?.id || null : null);
    setShowFolderPicker(true);
  };

  const groupedIngredients = recipeIngredients.reduce((acc, ing) => {
    const group = ing.group || 'Andre';
    if (!acc[group]) acc[group] = [];
    acc[group].push(ing);
    return acc;
  }, {} as Record<string, typeof recipeIngredients>);

  if (isEditing) {
    return (
      <div className="p-4 pb-32 max-w-md mx-auto min-h-screen">
        <div className="cm-topbar-surface flex flex-wrap justify-between items-center gap-4 mb-6 sticky top-0 py-4 z-10">
          <button onClick={handleCancelEdit} className="p-2 text-forest-mid cm-light-surface-icon hover:bg-white/40 dark:hover:bg-black/5 rounded-full transition-colors glass-brushed">
            <X size={22} />
          </button>
          <div className="flex gap-2 flex-wrap justify-end flex-1">
            <div className="cm-surface-utility flex rounded-full p-1 mr-2">
              <button 
                onClick={undo} 
                disabled={historyIndex === 0}
                className={`p-1.5 rounded-full transition-colors ${historyIndex === 0 ? 'text-forest-mid/20 dark:text-black/20' : 'text-forest-mid cm-light-surface-icon hover:bg-white/60 dark:hover:bg-black/5'}`}
              >
                <ArrowLeft size={18} />
              </button>
              <button 
                onClick={redo} 
                disabled={historyIndex === history.length - 1}
                className={`p-1.5 rounded-full transition-colors ${historyIndex === history.length - 1 ? 'text-forest-mid/20 dark:text-black/20' : 'text-forest-mid cm-light-surface-icon hover:bg-white/60 dark:hover:bg-black/5'}`}
              >
                <ArrowRight size={18} />
              </button>
            </div>
            <button onClick={() => updateEditData(recipe)} className="px-3 py-1 text-xs font-bold uppercase tracking-widest text-forest-mid cm-light-surface-ink-muted hover:text-forest-dark dark:hover:text-[#202A24] transition-colors">
              Nulstil
            </button>
            {canMutateRecipe && (
              <button 
                onClick={() => setShowSmartModal(true)} 
                className="p-2 text-heath-mid hover:bg-white/40 dark:hover:bg-black/5 rounded-full transition-colors glass-brushed"
                title="Smart Justering"
              >
                {isSmartAdjusting ? <Loader2 size={22} className="animate-spin" /> : <Wand2 size={22} />}
              </button>
            )}
            {canMutateRecipe && (
              <button onClick={() => setShowDeleteConfirm(true)} className="p-2 text-[#DC2626] hover:bg-white/40 dark:hover:bg-black/5 rounded-full transition-colors glass-brushed">
                <Trash2 size={22} />
              </button>
            )}
            <button onClick={handleSaveEdit} className="p-2 text-heath-mid hover:bg-white/40 dark:hover:bg-black/5 rounded-full transition-colors glass-brushed">
              <Save size={22} />
            </button>
          </div>
        </div>

        <div className="space-y-8">
          <div className="glass-brushed p-6 sm:p-8 rounded-[2.5rem] space-y-6">
            <input 
              type="text" 
              value={editData.title}
              onChange={e => updateEditData({...editData, title: e.target.value})}
              placeholder="Titel"
              className="w-full text-3xl font-serif italic bg-transparent border-b border-black/5 dark:border-white/10 focus:border-heath-mid outline-none pb-3 text-forest-dark cm-light-surface-ink placeholder-forest-mid/50 cm-light-surface-placeholder"
            />
            <textarea 
              value={editData.summary || ''}
              onChange={e => updateEditData({...editData, summary: e.target.value})}
              onInput={e => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
              placeholder="Kort beskrivelse..."
              rows={2}
              className="w-full bg-transparent border-b border-black/5 dark:border-white/10 focus:border-heath-mid outline-none pb-3 resize-none text-forest-mid cm-light-surface-ink-muted overflow-hidden text-sm leading-relaxed italic"
            />
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-1">
                <label className="text-xs font-bold text-forest-mid cm-light-surface-ink-muted uppercase tracking-[0.2em] block mb-2 opacity-60 dark:opacity-100">Mappe</label>
                {showNewFolderInput ? (
                  <div className="flex gap-2 items-center">
                    <input 
                      type="text" 
                      value={newFolderName}
                      onChange={e => setNewFolderName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newFolderName.trim()) {
                          const newFolder = newFolderName.trim();
                          updateEditData({...editData, folder: newFolder, folderId: undefined});
                          if (onFolderCreate) onFolderCreate(newFolder);
                          setShowNewFolderInput(false);
                          setNewFolderName('');
                        } else if (e.key === 'Escape') {
                          setShowNewFolderInput(false);
                          setNewFolderName('');
                        }
                      }}
                      placeholder="Ny mappe..."
                      className="w-full bg-transparent border-b border-black/5 dark:border-white/10 focus:border-heath-mid outline-none pb-1 text-sm text-forest-dark cm-light-surface-ink"
                      autoFocus
                    />
                    <button 
                      onClick={() => {
                        if (newFolderName.trim()) {
                          const newFolder = newFolderName.trim();
                          updateEditData({...editData, folder: newFolder, folderId: undefined});
                          if (onFolderCreate) onFolderCreate(newFolder);
                          setShowNewFolderInput(false);
                          setNewFolderName('');
                        }
                      }}
                      className="text-xs font-bold uppercase tracking-widest text-heath-mid"
                    >
                      Gem
                    </button>
                    <button 
                      onClick={() => {
                        setShowNewFolderInput(false);
                        setNewFolderName('');
                      }} 
                      className="text-forest-mid cm-light-surface-icon hover:text-forest-dark dark:hover:text-[#202A24]"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <select 
                    value={editData.folderId || (allFolders?.find(f => f.name === editData.folder)?.id) || editData.folder || ''}
                    onChange={e => {
                      if (e.target.value === '__NEW__') {
                        setShowNewFolderInput(true);
                        setNewFolderName('');
                      } else {
                        const selectedFolderId = e.target.value;
                        const folder = allFolders?.find(f => f.id === selectedFolderId);
                        if (folder) {
                          setEditPermissionConfirmed(false);
                          setFolderConfirmationError(null);
                          updateEditData({...editData, folderId: selectedFolderId, folder: folder.name});
                        } else {
                          // Fallback for old string-based folders
                          setEditPermissionConfirmed(false);
                          setFolderConfirmationError(null);
                          updateEditData({...editData, folder: selectedFolderId, folderId: undefined});
                        }
                      }
                    }}
                    className="w-full bg-transparent border-b border-black/5 dark:border-white/10 focus:border-heath-mid outline-none pb-1 text-sm text-forest-dark cm-light-surface-ink appearance-none cursor-pointer pr-6"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%232D4F39%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0 top 50%', backgroundSize: '.65rem auto' }}
                  >
                    <option value="" disabled>Vælg mappe</option>
                    {mutableFolders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    {editData.folder && !mutableFolders.some(f => f.name === editData.folder) && (
                      <option value={editData.folder}>{editData.folder}</option>
                    )}
                    <option value="__NEW__">+ Opret ny mappe...</option>
                  </select>
                )}
                {selectedEditFolder && editRequiresPermissionConfirmation && (
                  <div className="mt-4 space-y-3">
                    <FolderVisibilityNotice folder={selectedEditFolder} currentUser={currentUser} />
                    <label className="flex items-start gap-3 rounded-2xl border border-black/5 bg-white/40 px-4 py-3 text-sm text-forest-mid cm-light-surface-ink-muted">
                      <input
                        type="checkbox"
                        checked={editPermissionConfirmed}
                        onChange={e => {
                          setEditPermissionConfirmed(e.target.checked);
                          if (e.target.checked) {
                            setFolderConfirmationError(null);
                          }
                        }}
                        className="mt-0.5 h-4 w-4 rounded border-forest-mid/30"
                      />
                      <span>Jeg forstår at opskriften arver adgang og synlighed fra den valgte mappe.</span>
                    </label>
                    {folderConfirmationError && (
                      <p className="text-xs text-red-700">{folderConfirmationError}</p>
                    )}
                  </div>
                )}
              </div>
              <div className="w-full sm:w-40">
                <label className="text-xs font-bold text-forest-mid cm-light-surface-ink-muted uppercase tracking-[0.2em] block mb-2 opacity-60 dark:opacity-100">Antal</label>
                <div className="flex gap-2 items-end">
                  <input 
                    type="number" 
                    value={editData.servings}
                    onChange={e => updateEditData({...editData, servings: Number(e.target.value)})}
                    className="w-16 bg-transparent border-b border-black/5 dark:border-white/10 focus:border-heath-mid outline-none pb-1 text-sm text-forest-dark cm-light-surface-ink"
                  />
                  <input 
                    type="text" 
                    value={editData.servingsUnit || 'pers.'}
                    onChange={e => updateEditData({...editData, servingsUnit: e.target.value})}
                    className="w-20 bg-transparent border-b border-black/5 dark:border-white/10 focus:border-heath-mid outline-none pb-1 text-sm text-forest-dark cm-light-surface-ink"
                  />
                </div>
              </div>
            </div>
            <div className="relative">
              <label className="text-xs font-bold text-forest-mid cm-light-surface-ink-muted uppercase tracking-[0.2em] block mb-3 opacity-60 dark:opacity-100">Kategorier</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {editCategories.map(cat => (
                  <span key={cat} className="cm-surface-utility text-forest-mid cm-light-surface-ink text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2">
                    {cat}
                    <button onClick={() => updateEditData({...editData, categories: editCategories.filter(c => c !== cat)})} className="hover:text-heath-mid transition-colors"><X size={12}/></button>
                  </span>
                ))}
              </div>
              <input 
                type="text" 
                value={categorySearch}
                onChange={e => {
                  setCategorySearch(e.target.value);
                  setShowCategoryDropdown(true);
                }}
                onFocus={() => setShowCategoryDropdown(true)}
                onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 200)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && categorySearch.trim()) {
                    updateEditData({...editData, categories: [...editCategories, categorySearch.trim()]});
                    setCategorySearch('');
                    setShowCategoryDropdown(false);
                  }
                }}
                placeholder="Søg eller tilføj kategori..."
                className="w-full bg-transparent border-b border-black/5 dark:border-white/10 focus:border-heath-mid outline-none pb-2 text-sm text-forest-dark cm-light-surface-ink"
              />
              {showCategoryDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 glass-brushed rounded-2xl shadow-xl z-20 max-h-48 overflow-y-auto">
                  {mergedCategories.filter(c => c.toLowerCase().includes(categorySearch.toLowerCase()) && !editCategories.includes(c)).map(cat => (
                    <button
                      key={cat}
                      onMouseDown={(e) => e.preventDefault()} // Prevent blur before click
                      onClick={() => {
                        updateEditData({...editData, categories: [...editCategories, cat]});
                        setCategorySearch('');
                        setShowCategoryDropdown(false);
                      }}
                      className="w-full text-left px-5 py-3 text-sm text-forest-mid cm-light-surface-ink-muted hover:bg-white/60 dark:hover:bg-black/5 transition-colors border-b border-black/5 dark:border-white/10 last:border-0"
                    >
                      {cat}
                    </button>
                  ))}
                  {categorySearch.trim() !== '' && !mergedCategories.some(c => c.toLowerCase() === categorySearch.trim().toLowerCase()) && (
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        updateEditData({...editData, categories: [...editCategories, categorySearch.trim()]});
                        setCategorySearch('');
                        setShowCategoryDropdown(false);
                      }}
                      className="w-full text-left px-5 py-3 text-sm text-heath-mid hover:bg-white/60 dark:hover:bg-black/5 transition-colors"
                    >
                      + Opret "{categorySearch.trim()}"
                    </button>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-bold text-forest-mid cm-light-surface-ink-muted uppercase tracking-[0.2em] block mb-2 opacity-60 dark:opacity-100">Egne noter</label>
              <textarea 
                value={editData.notes || ''}
                onChange={e => updateEditData({...editData, notes: e.target.value})}
                onInput={e => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                placeholder="Tilføj dine egne noter her..."
                rows={3}
                className="w-full bg-transparent border-b border-black/5 dark:border-white/10 focus:border-heath-mid outline-none pb-2 resize-none text-sm overflow-hidden text-forest-mid cm-light-surface-ink-muted leading-relaxed italic"
              />
            </div>
          </div>

          <div className="glass-brushed p-6 sm:p-8 rounded-[2.5rem] space-y-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-2xl font-serif text-forest-dark cm-light-surface-ink italic flex items-center gap-3 text-engraved">
                <ChefHat className="text-heath-mid" size={24} />
                Ingredienser
              </h2>
            </div>
            
            <div className="space-y-4">
              {editIngredients.map((ing, i) => {
                const isConfirmed = confirmedIngredients[ing.id] !== false;
                return (
                <div key={ing.id || i} className="flex flex-col gap-4 bg-white/40 dark:bg-black/20 p-5 rounded-2xl border border-black/5 dark:border-white/10 relative group">
                  <div className="flex items-center gap-3 relative">
                    <div className="flex-1 relative">
                      <input 
                        type="text" 
                        value={ing.name}
                        onChange={e => {
                          const newIngs = [...editIngredients];
                          newIngs[i].name = e.target.value;
                          updateEditData({...editData, ingredients: newIngs});
                        }}
                        onFocus={() => setActiveIngredientIndex(i)}
                        onBlur={() => setTimeout(() => setActiveIngredientIndex(null), 200)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && ing.name.trim()) {
                            setConfirmedIngredients({...confirmedIngredients, [ing.id]: true});
                          }
                        }}
                        placeholder="Ingrediens (f.eks. Mælk)"
                        className="w-full bg-white/60 dark:bg-black/20 px-4 py-3 rounded-xl border border-black/5 dark:border-white/10 text-base outline-none focus:border-heath-mid text-forest-dark cm-light-surface-ink font-serif italic placeholder-forest-mid/50 cm-light-surface-placeholder"
                      />
                      {activeIngredientIndex === i && ing.name.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 glass-brushed rounded-2xl shadow-xl z-30 max-h-48 overflow-y-auto">
                          {COMMON_INGREDIENT_SUGGESTIONS
                            .filter(c => c.toLowerCase().includes(ing.name.toLowerCase()))
                            .slice(0, 8)
                            .map(cat => (
                            <button
                              key={cat}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                const newIngs = [...editIngredients];
                                newIngs[i].name = cat;
                                const lowerCat = cat.toLowerCase();
                                if (lowerCat.includes('mælk') || lowerCat.includes('vand') || lowerCat.includes('fløde') || lowerCat.includes('bouillon')) newIngs[i].unit = 'dl';
                                else if (lowerCat.includes('mel') || lowerCat.includes('sukker') || lowerCat.includes('kød') || lowerCat.includes('smør') || lowerCat.includes('pasta') || lowerCat.includes('ris')) newIngs[i].unit = 'g';
                                else if (lowerCat.includes('æg') || lowerCat.includes('løg') || lowerCat.includes('tomat') || lowerCat.includes('gulerod')) newIngs[i].unit = 'stk';
                                else if (lowerCat.includes('hvidløg')) newIngs[i].unit = 'fed';
                                else if (lowerCat.includes('olie') || lowerCat.includes('eddike') || lowerCat.includes('soya')) newIngs[i].unit = 'spsk';
                                else if (lowerCat.includes('salt') || lowerCat.includes('peber') || lowerCat.includes('pulver') || lowerCat.includes('natron')) newIngs[i].unit = 'tsk';
                                
                                updateEditData({...editData, ingredients: newIngs});
                                setActiveIngredientIndex(null);
                                setConfirmedIngredients({...confirmedIngredients, [ing.id]: true});
                              }}
                              className="w-full text-left px-5 py-3 text-sm text-forest-dark cm-light-surface-ink-muted hover:bg-white/60 dark:hover:bg-black/5 transition-colors border-b border-black/5 dark:border-white/10 last:border-0"
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {!isConfirmed && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            if (ing.name.trim()) {
                              setConfirmedIngredients({...confirmedIngredients, [ing.id]: true});
                            }
                          }}
                          className="p-3 rounded-xl bg-forest-mid text-white hover:bg-forest-dark transition-colors shadow-sm"
                          title="Bekræft ingrediens"
                        >
                          <ArrowRight size={20} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            const newIngs = editIngredients.filter((_, idx) => idx !== i);
                            setEditData({...editData, ingredients: newIngs});
                          }}
                          className="p-3 rounded-xl bg-white/60 dark:bg-black/20 border border-black/5 dark:border-white/10 text-forest-mid cm-light-surface-icon hover:text-[#DC2626] hover:border-red-200 dark:hover:border-red-500/50 transition-colors"
                          title="Slet ingrediens"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {isConfirmed && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <div className="flex w-full sm:w-auto flex-1 gap-3">
                        <div className="relative flex-1 min-w-[80px]">
                          <select
                            value={COMMON_RECIPE_UNITS.includes(ing.unit as any) ? ing.unit : '__custom__'}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === '__custom__') return;
                              const newIngs = [...editIngredients];
                              newIngs[i].unit = val;
                              updateEditData({...editData, ingredients: newIngs});
                            }}
                            className="w-full bg-white/80 dark:bg-black/20 px-3 py-3 rounded-xl border border-black/10 dark:border-white/10 text-sm outline-none focus:border-heath-mid text-forest-dark cm-light-surface-ink font-serif italic pr-8 appearance-none"
                          >
                            <option value="" label="Enhed" />
                            {COMMON_RECIPE_UNITS.filter(u => u !== '').map(u => <option key={u} value={u}>{u}</option>)}
                            {ing.unit && !COMMON_RECIPE_UNITS.includes(ing.unit as any) && (
                              <option value="__custom__">{ing.unit}</option>
                            )}
                          </select>
                          {canConvertIngredientBetweenGramsAndDeciliters(ing) && (
                            <button 
                              onClick={(e) => { e.preventDefault(); convertUnit(i); }}
                              className="absolute top-1/2 -translate-y-1/2 right-1 bg-heath-mid text-white rounded-lg p-1 shadow-sm hover:bg-heath-dark transition-colors z-10"
                              title="Konverter g/dl"
                            >
                              <Wand2 size={12} />
                            </button>
                          )}
                        </div>
                        <input 
                          type="number" 
                          value={ing.amount || ''}
                          onChange={e => {
                            const newIngs = [...editIngredients];
                            newIngs[i].amount = e.target.value ? Number(e.target.value) : null;
                            updateEditData({...editData, ingredients: newIngs});
                          }}
                          placeholder="Mængde"
                          className="w-24 flex-1 min-w-[80px] bg-white/80 dark:bg-black/20 px-3 py-3 rounded-xl border border-black/10 dark:border-white/10 text-sm outline-none focus:border-heath-mid text-forest-dark cm-light-surface-ink font-serif italic placeholder-forest-mid/50 cm-light-surface-placeholder"
                        />
                      </div>
                      <div className="flex gap-2 shrink-0 w-full sm:w-auto justify-end">
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            const newIngs = [...editIngredients];
                            newIngs[i].locked = !newIngs[i].locked;
                            updateEditData({...editData, ingredients: newIngs});
                          }}
                className={`p-2 rounded-lg transition-all flex-1 sm:flex-none flex justify-center ${ing.locked ? 'bg-forest-mid text-white shadow-sm' : 'cm-surface-utility text-forest-mid cm-light-surface-ink hover:text-forest-dark dark:hover:text-[#202A24]'}`}
                          title={ing.locked ? "Lås op" : "Lås fast"}
                        >
                          {ing.locked ? <Lock size={16} /> : <Unlock size={16} />}
                        </button>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            const newIngs = editIngredients.filter((_, idx) => idx !== i);
                            setEditData({...editData, ingredients: newIngs});
                          }}
                          className="p-2 rounded-lg cm-surface-utility text-forest-mid cm-light-surface-icon hover:text-[#DC2626] hover:border-red-200 dark:hover:border-red-500/50 transition-colors flex-1 sm:flex-none flex justify-center"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )})}
            </div>
            <div className="pt-2 flex justify-center">
              <button 
                onClick={() => {
                  const newIng = { id: Date.now().toString(), name: '', amount: null, unit: '', group: 'Andre' };
                  updateEditData({...editData, ingredients: [...editIngredients, newIng]});
                  setConfirmedIngredients({...confirmedIngredients, [newIng.id]: false});
                }}
                className="text-xs font-bold uppercase tracking-widest text-heath-mid flex items-center gap-2 glass-brushed px-6 py-3 rounded-xl hover:bg-white/60 dark:hover:bg-black/5 transition-all border border-black/5 dark:border-white/10"
                title="Tilføj ingrediens"
              >
                <Plus size={16} /> Tilføj ingrediens
              </button>
            </div>
            <div className="pt-6 border-t border-black/5 dark:border-white/10 flex justify-end">
              <button 
                onClick={handleSaveEdit}
                className="btn-botanical px-8 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center gap-2"
              >
                <Check size={18} />
                Gem ændringer
              </button>
            </div>
          </div>

          <div className="glass-brushed p-6 sm:p-8 rounded-[2.5rem] space-y-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-2xl font-serif text-forest-dark cm-light-surface-ink italic flex items-center gap-3 text-engraved">
                <Flame className="text-heath-mid" size={24} />
                Fremgangsmåde
              </h2>
            </div>
            <div className="space-y-6">
              {editSteps.map((step, i) => (
                <div key={step.id || i} className="flex gap-4 items-start bg-white/40 dark:bg-black/20 p-5 rounded-2xl border border-black/5 dark:border-white/10 w-full overflow-hidden box-border relative group">
                  <div className="w-8 h-8 rounded-full bg-forest-mid flex items-center justify-center text-xs shrink-0 mt-1 text-white font-bold shadow-sm">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0 space-y-4">
                    <textarea 
                      value={step.text}
                      onChange={e => {
                        const newSteps = [...editSteps];
                        newSteps[i].text = e.target.value;
                        updateEditData({...editData, steps: newSteps});
                      }}
                      onInput={e => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                      placeholder="Beskriv trinnet..."
                      rows={2}
                      className="w-full bg-white/60 dark:bg-black/20 px-4 py-3 rounded-xl border border-black/5 dark:border-white/10 text-base outline-none focus:border-heath-mid text-forest-dark cm-light-surface-ink font-serif italic resize-none overflow-hidden box-border leading-relaxed placeholder-forest-mid/50 cm-light-surface-placeholder"
                    />
                    <div className="flex flex-col sm:flex-row gap-3 w-full">
                      <div className="relative flex-1">
                        <label className="text-xs font-bold text-forest-mid cm-light-surface-ink-muted uppercase tracking-wider block mb-1.5 opacity-60 dark:opacity-100 ml-1">Varme</label>
                        <input 
                          type="text" 
                          value={step.heat || ''}
                          onChange={e => {
                            const newSteps = [...editSteps];
                            newSteps[i].heat = e.target.value;
                            updateEditData({...editData, steps: newSteps});
                          }}
                          placeholder="f.eks. Induktion - 5"
                          className="w-full bg-white/60 dark:bg-black/20 px-3 py-2 rounded-lg border border-black/5 dark:border-white/10 text-sm outline-none focus:border-heath-mid text-forest-dark cm-light-surface-ink placeholder-forest-mid/50 cm-light-surface-placeholder"
                        />
                      </div>
                      <div className="relative flex-1">
                        <label className="text-xs font-bold text-forest-mid cm-light-surface-ink-muted uppercase tracking-wider block mb-1.5 opacity-60 dark:opacity-100 ml-1">Husk (Påmindelse)</label>
                        <input 
                          type="text" 
                          value={step.reminder || ''}
                          onChange={e => {
                            const newSteps = [...editSteps];
                            newSteps[i].reminder = e.target.value;
                            updateEditData({...editData, steps: newSteps});
                          }}
                          placeholder="f.eks. Gem pastavand"
                          className="w-full bg-white/60 dark:bg-black/20 px-3 py-2 rounded-lg border border-black/5 dark:border-white/10 text-sm outline-none focus:border-heath-mid text-forest-dark cm-light-surface-ink placeholder-forest-mid/50 cm-light-surface-placeholder"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5 w-full">
                        <label className="text-xs font-bold text-forest-mid cm-light-surface-ink-muted uppercase tracking-wider block mb-1.5 opacity-60 dark:opacity-100 ml-1">Timer</label>
                        <div className="flex gap-2 w-full">
                          <input 
                            type="number" 
                            value={step.timer?.duration || ''}
                            onChange={e => {
                              const newSteps = [...editSteps];
                              const duration = e.target.value ? Number(e.target.value) : undefined;
                              if (duration) {
                                newSteps[i].timer = { duration, description: step.timer?.description || 'Timer' };
                              } else {
                                newSteps[i].timer = undefined;
                              }
                              updateEditData({...editData, steps: newSteps});
                            }}
                            placeholder="Min"
                            className="w-20 shrink-0 bg-white/60 dark:bg-black/20 px-3 py-2 rounded-lg border border-black/5 dark:border-white/10 text-sm outline-none focus:border-heath-mid text-forest-dark cm-light-surface-ink placeholder-forest-mid/50 cm-light-surface-placeholder"
                          />
                          <div className="relative flex-1">
                            <input 
                              type="text" 
                              list="timer-descriptions"
                              value={step.timer?.description || ''}
                              onChange={e => {
                                const newSteps = [...editSteps];
                                if (step.timer) {
                                  newSteps[i].timer = { ...step.timer, description: e.target.value };
                                } else if (e.target.value) {
                                  newSteps[i].timer = { duration: 0, description: e.target.value };
                                }
                                updateEditData({...editData, steps: newSteps});
                              }}
                              placeholder="Beskrivelse"
                              className="w-full bg-white/60 dark:bg-black/20 px-3 py-2 rounded-lg border border-black/5 dark:border-white/10 text-sm outline-none focus:border-heath-mid text-forest-dark cm-light-surface-ink placeholder-forest-mid/50 cm-light-surface-placeholder"
                            />
                            <datalist id="timer-descriptions">
                              <option value="Kogetid" />
                              <option value="Stegetid" />
                              <option value="Bagetid" />
                              <option value="Hviletid" />
                              <option value="Hævetid" />
                              <option value="Trækketid" />
                            </datalist>
                          </div>
                        </div>
                      </div>
                    </div>
                  <button 
                    onClick={() => {
                      const newSteps = editSteps.filter((_, idx) => idx !== i);
                      updateEditData({...editData, steps: newSteps});
                    }}
                    className="p-2 rounded-lg bg-white/60 dark:bg-black/20 border border-black/5 dark:border-white/10 text-forest-mid cm-light-surface-icon hover:text-[#DC2626] hover:border-red-200 dark:hover:border-red-500/50 transition-colors shrink-0 mt-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="pt-2 flex justify-center">
              <button 
                onClick={() => updateEditData({...editData, steps: [...editSteps, { id: Date.now().toString(), text: '' }]})}
                className="text-xs font-bold uppercase tracking-widest text-heath-mid flex items-center gap-2 glass-brushed px-6 py-3 rounded-xl hover:bg-white/60 dark:hover:bg-black/5 transition-all border border-black/5 dark:border-white/10"
                title="Tilføj trin"
              >
                <Plus size={16} /> Tilføj trin
              </button>
            </div>
            <div className="pt-6 border-t border-black/5 dark:border-white/10 flex justify-end">
              <button 
                onClick={handleSaveEdit}
                className="btn-botanical px-8 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center gap-2"
              >
                <Check size={18} />
                Gem ændringer
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {onFillRest && (
            <button
              onClick={() => onFillRest(editData)}
              disabled={isAdjusting || aiDisabled}
              className="w-full py-4 bg-[#2A1F1A] text-[#D4B886] rounded-2xl font-serif text-lg border border-[#3A2A22] hover:bg-[#3A2A22] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isFillingRest ? <Loader2 size={20} className="animate-spin" /> : <Wand2 size={20} />}
              {isFillingRest ? 'Udfylder...' : 'Udfyld resten med AI'}
            </button>
          )}

          {showSmartModal && canMutateRecipe && (
            <div className="cm-dialog-backdrop fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="cm-dialog-surface glass-brushed border border-black/5 dark:border-white/10 rounded-[3rem] p-6 sm:p-8 w-full max-w-sm bg-[#FDFBF7]/95 dark:bg-forest-dark/95 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
                <h3 className="text-2xl font-serif text-forest-dark cm-light-surface-ink italic mb-4 flex items-center gap-3 text-engraved">
                  <div className="p-2 bg-white dark:bg-black/20 rounded-xl shadow-sm border border-black/5 dark:border-white/10">
                    <Wand2 size={24} className="text-heath-mid"/>
                  </div>
                  Smart Tilpasning
                </h3>
                <p className="text-sm text-forest-mid cm-light-surface-ink-muted mb-6 italic leading-relaxed">
                  Fortæl AI&apos;en hvordan opskriften skal tilpasses. Den bruger gastronomisk logik til at justere mængder, enheder og tilberedningstid.
                </p>
                <textarea
                  value={smartInstruction}
                  onChange={e => setSmartInstruction(e.target.value)}
                  placeholder="F.eks. 'Jeg har 500g oksekød i stedet for 300g', eller 'Lav gram om til dl'."
                  className="w-full bg-white/60 dark:bg-black/20 border border-black/5 dark:border-white/10 rounded-2xl p-4 text-forest-dark cm-light-surface-ink text-sm mb-6 focus:outline-none focus:border-heath-mid resize-none h-32 shadow-sm font-serif italic placeholder-forest-mid/50 cm-light-surface-placeholder"
                />
                <div className="flex gap-3">
                  <button onClick={() => setShowSmartModal(false)} className="flex-1 py-4 rounded-2xl border border-black/5 dark:border-white/10 text-forest-mid cm-light-surface-ink-muted font-bold text-xs uppercase tracking-widest hover:bg-white dark:hover:bg-white/10 transition-all">Annuller</button>
                  <button
                    onClick={() => {
                      onSmartAdjust(editData, smartInstruction);
                      setIsEditing(false);
                      setShowSmartModal(false);
                      setSmartInstruction('');
                    }}
                    disabled={!smartInstruction.trim() || isAdjusting}
                    className="flex-1 py-4 rounded-2xl bg-forest-mid text-white font-bold text-xs uppercase tracking-widest disabled:opacity-50 flex justify-center items-center gap-2 hover:bg-forest-dark transition-all shadow-md"
                  >
                    {isSmartAdjusting ? <Loader2 size={16} className="animate-spin" /> : 'Tilpas'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="recipe-print-root p-4 pb-48 sm:pb-36 max-w-md mx-auto min-h-screen">
      {/* Header */}
      <nav className="recipe-print-header cm-topbar-surface flex items-center justify-between mb-6 sticky top-0 py-1.5 px-2 z-10 print:hidden rounded-b-[20px]">
        <button onClick={onBack} className="cm-nav-item !min-h-0 !w-auto !gap-1 px-2.5 py-1.5" title="Tilbage">
          <span className="cm-nav-icon"><ArrowLeft size={18} /></span>
          <span className="cm-nav-label">Tilbage</span>
        </button>
        {hasForward && onForward && (
          <button onClick={onForward} className="cm-nav-item !min-h-0 !w-auto !gap-1 px-2.5 py-1.5" title="Frem">
            <span className="cm-nav-icon"><ArrowRight size={18} /></span>
          </button>
        )}
        <div className="flex items-center gap-0.5 ml-auto">
          {canMutateRecipe && !recipe.isSaved && (
            <button
              onClick={() => openFolderPickerForSave()}
              className="cm-nav-item cm-nav-item--active !min-h-0 !w-auto !gap-1 px-2.5 py-1.5"
              title="Gem opskrift"
            >
              <span className="cm-nav-icon"><Save size={16} /></span>
              <span className="cm-nav-label">Gem</span>
            </button>
          )}
          {canMutateRecipe && (
            <button onClick={() => setIsEditing(true)} className="cm-nav-item !min-h-0 !w-auto !gap-1 px-2.5 py-1.5" title="Rediger">
              <span className="cm-nav-icon"><Edit3 size={16} /></span>
            </button>
          )}
          {canMutateRecipe && (
            <button onClick={() => onToggleFavorite(recipe)} className="cm-nav-item !min-h-0 !w-auto !gap-1 px-2.5 py-1.5" title={recipe.isFavorite ? 'Fjern favorit' : 'Tilføj favorit'}>
              <span className="cm-nav-icon"><Heart size={16} className={recipe.isFavorite ? "fill-heath-mid text-heath-mid" : ""} /></span>
            </button>
          )}
          <button
            onClick={() => {
              if (typeof navigator !== 'undefined' && navigator.share) {
                navigator.share({
                  title: recipe.title,
                  text: `${recipe.title}${recipe.summary ? '\n\n' + recipe.summary : ''}\n\n${(recipe.ingredients || []).map(i => `${i.amount ?? ''} ${i.unit} ${i.name}`.trim()).join('\n')}`,
                }).catch(() => {});
              } else {
                const text = `${recipe.title}\n\n${recipe.summary || ''}\n\nIngredienser:\n${(recipe.ingredients || []).map(i => `${i.amount ?? ''} ${i.unit} ${i.name}`.trim()).join('\n')}\n\nFremgangsmåde:\n${(recipe.steps || []).map((s, i) => `${i + 1}. ${s.text}`).join('\n')}`;
                navigator.clipboard?.writeText(text).catch(() => {});
              }
            }}
            className="cm-nav-item !min-h-0 !w-auto !gap-1 px-2.5 py-1.5"
            title="Del opskrift"
          >
            <span className="cm-nav-icon"><Share2 size={16} /></span>
          </button>
          <button onClick={() => window.print()} className="cm-nav-item !min-h-0 !w-auto !gap-1 px-2.5 py-1.5" title="Print">
            <span className="cm-nav-icon"><Printer size={16} /></span>
          </button>
        </div>
      </nav>

      <style dangerouslySetInnerHTML={{ __html: RECIPE_PRINT_STYLES }} />

      {!recipe.isSaved && (
        <RecipeImportedNotice
          isAdjusting={isSmartAdjusting}
          aiDisabledReason={aiDisabledReason}
          onSimplify={() => onSmartAdjust(recipe, 'Gør fremgangsmåden enklere, kortere og mere overskuelig uden at ændre retten eller ingredienslisten unødigt.')}
          onTighten={() => onSmartAdjust(recipe, 'Gennemgå opskriften og fjern gentagelser, upræcise formuleringer og uklare gruppenavne. Bevar retten, men gør den skarpere og mere konsekvent.')}
          onCheckTimes={() => onSmartAdjust(recipe, 'Gennemgå alle tider, varmeangivelser og timere. Ret det, der virker upræcist, og tilføj manglende timer hvor det giver mening.')}
        />
      )}

      {/* Meta */}
      <div className="print-meta mb-8 space-y-6">
        <div className="glass-brushed p-6 sm:p-8 rounded-[2.5rem]">
          <h1 className="text-4xl font-serif text-forest-dark cm-light-surface-ink mb-4 leading-tight italic text-engraved">
            {recipe.title}
            {recipe.variantPrefix && (
              <span className="ml-3 inline-block text-xs font-sans not-italic font-bold uppercase tracking-widest bg-heath-mid/15 text-heath-mid px-3 py-1 rounded-full align-middle">
                {recipe.variantPrefix}
              </span>
            )}
          </h1>
          <p className="print-byline hidden">CookMoxs</p>
          {recipe.summary && <p className="print-summary text-forest-mid cm-light-surface-ink-muted mb-6 leading-relaxed italic text-sm opacity-80 dark:opacity-100">{recipe.summary}</p>}
          {(recipe.updatedAt || recipe.createdAt) && (
            <p className="print:hidden text-xs text-forest-mid cm-light-surface-ink-muted italic mb-4 opacity-80 dark:opacity-100">
              Sidst gemt: {new Date(recipe.updatedAt || recipe.createdAt!).toLocaleString('da-DK')}
            </p>
          )}
          <div className="cm-recipe-meta-block">
            <div className="cm-recipe-private-row">
              <OwnershipBadge ownership={ownership} />
              <div className="cm-recipe-private-copy">
                <p className="text-xs text-forest-mid cm-light-surface-ink-muted opacity-80 dark:opacity-100">
                  {ownership.state === 'private' ? 'Kun du kan se denne opskrift.' : ownership.detail}
                </p>
              </div>
            </div>

            {isApplyingPrefix && (
              <div className="flex items-center justify-center gap-3 py-6 px-4 cm-surface-secondary rounded-2xl mb-4 animate-pulse">
                <svg className="animate-spin h-5 w-5 text-heath-mid" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm font-medium text-forest-mid cm-light-surface-ink-muted italic">AI tilpasser opskriften...</span>
              </div>
            )}

            <div className="cm-recipe-utility-row">
            {canMutateRecipe && (
            <div className="cm-recipe-ai-shell relative">
              <select
                onChange={(e) => {
                  if (e.target.value && onApplyPrefix) {
                    onApplyPrefix(recipe, e.target.value);
                    e.target.value = ""; // reset
                  }
                }}
                disabled={isAdjusting || aiDisabled || isApplyingPrefix}
                className="cm-recipe-ai-select"
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%238A5A7D%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .8rem top 50%', backgroundSize: '.6rem auto' }}
              >
                <option value="">✨ AI Varianter</option>
                <option value="Gourmet">Gourmet</option>
                <option value="Autentisk">Autentisk</option>
                <option value="Den hurtige">Den hurtige</option>
                <option value="Begynderen">Begynderen</option>
                <option value="Babyvenlig 0/1 år">Babyvenlig 0/1 år</option>
                <option value="Børnevenlig 1/3 år">Børnevenlig 1/3 år</option>
                <option value="Spice it up">Spice it up</option>
              </select>
            </div>
            )}

            {recipe.folder && (
              <span className="cm-recipe-chip cm-recipe-chip--active">
                {activeFolderLabel}
              </span>
            )}

            {canMutateRecipe && onGenerateTips && (
              <button 
                onClick={() => setShowTipsModal(true)}
                disabled={isAdjusting || aiDisabled}
                className="cm-recipe-utility-button"
              >
                {isGeneratingTips ? <Loader2 size={14} className="animate-spin" /> : <Lightbulb size={14} />}
                Tips & Tricks
              </button>
            )}
            </div>

            {recipeCategories.length > 0 && (
              <div className="cm-recipe-chip-row">
                {recipeCategories.map((cat, i) => (
                  <span key={i} className="cm-recipe-chip">
                    {cat}
                  </span>
                ))}
                {!isEditing && onSuggestTags && canMutateRecipe && (
                  <button
                    onClick={() => onSuggestTags(recipe)}
                    disabled={isAdjusting || aiDisabled}
                    className="cm-recipe-chip border-dashed border-forest-mid/30 text-forest-mid/60 hover:text-forest-mid hover:border-forest-mid/50 transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    {isSuggestingTags ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                    {isSuggestingTags ? '...' : '+ tags'}
                  </button>
                )}
              </div>
            )}
            {recipeCategories.length === 0 && !isEditing && onSuggestTags && canMutateRecipe && (
              <button
                onClick={() => onSuggestTags(recipe)}
                disabled={isAdjusting || aiDisabled}
                className="text-xs text-forest-mid/60 hover:text-forest-mid flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isSuggestingTags ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                {isSuggestingTags ? 'Foreslår tags...' : 'Tilføj tags med AI'}
              </button>
            )}

            {!canMutateRecipe && (
              <div className="cm-recipe-inline-status rounded-2xl border border-amber-200 bg-amber-50/80 text-sm text-amber-900">
                Denne opskrift er delt som visning. Redigering, favoritter og andre ændringer er skjult.
              </div>
            )}

            {aiDisabledReason && (
              <div className="cm-recipe-inline-status rounded-2xl border border-amber-200 bg-amber-50/80 text-sm text-amber-900">
                AI-hjælp er midlertidigt slået fra. {aiDisabledReason}
              </div>
            )}

            {error && (
              <div className="cm-recipe-inline-status rounded-2xl border border-red-200 bg-red-50/80 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
          {recipe.notes && (
            <div className="cm-surface-secondary p-6 rounded-3xl mt-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-heath-mid/20" />
              <h4 className="text-xs font-bold text-heath-mid uppercase tracking-[0.2em] mb-3 opacity-60 dark:opacity-100 text-engraved">Mine noter</h4>
              <p className="text-sm text-forest-mid cm-light-surface-ink-muted whitespace-pre-wrap leading-relaxed italic">{recipe.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Rationale */}
      {recipe.aiRationale && (
        <div className="mb-8 glass-brushed p-6 sm:p-8 rounded-[2.5rem] border border-heath-mid/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-heath-mid/5 rounded-full -mr-16 -mt-16 blur-2xl" />
          <div className="flex items-center gap-3 mb-4">
            <div className="cm-surface-utility p-2 rounded-xl">
              <Wand2 size={20} className="text-heath-mid" />
            </div>
            <h3 className="font-serif text-xl text-forest-dark cm-light-surface-ink italic text-engraved">AI Tilpasning</h3>
          </div>
          <p className="text-sm text-forest-mid cm-light-surface-ink-muted leading-relaxed whitespace-pre-wrap mb-8 italic">
            {recipe.aiRationale}
          </p>
          <div className="flex gap-3">
            {recipe.originalRecipeId && onUndoAI && (
              <button 
                onClick={() => onUndoAI(recipe.originalRecipeId!)}
                className="cm-surface-utility flex-1 py-3 text-forest-mid cm-light-surface-ink rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-white dark:hover:bg-black/5 transition-all"
              >
                Fortryd
              </button>
            )}
            {canMutateRecipe && (
            <button 
              onClick={() => {
                const recipeToSave = { ...recipe, aiRationale: undefined };
                onSave(recipeToSave);
              }}
              className="flex-1 py-3 bg-forest-mid text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-forest-dark transition-all shadow-md"
            >
              Fortsæt med denne opskrift?
            </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Tips Button */}
      {recipeTips.length > 0 && (
        <motion.div
          drag
          dragConstraints={{ left: -window.innerWidth + 80, right: 0, top: -window.innerHeight/2 + 80, bottom: window.innerHeight/2 - 80 }}
          dragMomentum={false}
          className="fixed right-4 top-[50vh] z-40"
          style={{ touchAction: "none" }}
        >
          <button
            onClick={() => setShowTipsModal(!showTipsModal)}
            disabled={isAdjusting}
            className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-colors disabled:opacity-50 glass-brushed border border-black/5 dark:border-white/10 ${showTipsModal ? 'bg-heath-mid text-white' : 'bg-sand/90 dark:bg-forest-dark/90 text-heath-mid hover:bg-white dark:hover:bg-forest-mid'}`}
          >
            {isGeneratingTips ? <Loader2 size={24} className="animate-spin" /> : <Lightbulb size={24} />}
          </button>
        </motion.div>
      )}

      {/* Tips Modal */}
      {showTipsModal && (
        <div className="cm-dialog-backdrop fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="cm-dialog-surface glass-brushed border border-black/5 dark:border-white/10 rounded-[3rem] p-6 sm:p-8 max-w-sm w-full shadow-2xl relative bg-sand/95 dark:bg-[#1A221E]/95 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button 
              onClick={() => setShowTipsModal(false)}
              className="absolute right-6 top-6 text-forest-mid cm-light-surface-ink hover:text-forest-dark transition-colors p-2 hover:bg-white/40 dark:hover:bg-white/10 rounded-full"
            >
              <X size={22} />
            </button>
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-white dark:bg-black/20 rounded-2xl shadow-sm border border-black/5 dark:border-white/10">
                {isGeneratingTips ? <Loader2 size={28} className="text-heath-mid animate-spin" /> : <Lightbulb size={28} className="text-heath-mid" />}
              </div>
              <h3 className="font-serif text-2xl text-forest-dark cm-light-surface-ink italic text-engraved">Tips & Tricks</h3>
            </div>

            {recipeTips.length > 0 ? (
              <ul className="space-y-5 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                {recipeTips.map((tip, idx) => (
                  <li key={idx} className="flex gap-4 text-sm text-forest-mid cm-light-surface-ink-muted leading-relaxed italic">
                    <span className="text-heath-mid font-bold mt-1 shrink-0">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-10 text-forest-mid cm-light-surface-ink-muted">
                <p className="mb-2 font-serif italic text-lg">Ingen tips endnu.</p>
                <p className="text-xs opacity-60 dark:opacity-100">Få AI til at generere smarte tips og tricks til denne opskrift.</p>
              </div>
            )}

            {canMutateRecipe && onGenerateTips && (
              <button 
                onClick={() => {
                  onGenerateTips(recipe);
                  setShowTipsModal(false);
                }}
                disabled={isAdjusting || aiDisabled}
                className="mt-8 w-full py-4 bg-forest-mid text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-forest-dark transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGeneratingTips ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                {recipeTips.length > 0 ? 'Generer nye tips' : 'Generer tips'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Ingredients */}
      <section className="print-ingredients mb-10 glass-brushed p-6 sm:p-8 rounded-[2.5rem] space-y-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-2xl font-serif text-forest-dark cm-light-surface-ink italic flex items-center gap-3 text-engraved">
              <ChefHat className="text-heath-mid" size={24} />
              Ingredienser
            </h2>
            <div className="flex items-center gap-2 print:hidden">
              {canMutateRecipe && (
              <button 
                onClick={() => {
                  setIsEditing(true);
                  const newIng = { id: Date.now().toString(), name: '', amount: null, unit: '', group: 'Andre' };
                  updateEditData({...recipe, ingredients: [...(recipe.ingredients || []), newIng]});
                  setConfirmedIngredients({...confirmedIngredients, [newIng.id]: false});
                }}
                className="text-xs font-bold uppercase tracking-widest text-forest-mid cm-light-surface-ink-muted flex items-center gap-1.5 glass-brushed px-3 py-2 rounded-xl hover:bg-white/60 dark:hover:bg-black/5 transition-all shadow-sm"
                title="Tilføj ingrediens"
              >
                <Plus size={14} />
                Tilføj
              </button>
              )}
            </div>
          </div>
          <div className="cm-surface-utility flex items-center gap-4 rounded-2xl px-4 py-2 w-full justify-center print:border-none print:shadow-none print:bg-transparent print:p-0">
            <button onClick={() => handleScale(((recipe.servings * scale) - 1) / recipe.servings)} className="text-forest-mid cm-light-surface-icon hover:text-heath-mid dark:hover:text-heath-mid w-8 h-8 flex items-center justify-center font-bold transition-colors print:hidden">-</button>
            <span className="text-xs font-bold text-forest-dark cm-light-surface-ink text-center uppercase tracking-widest min-w-[4rem]">{Math.round(recipe.servings * scale)} {recipe.servingsUnit || 'pers.'}</span>
            <button onClick={() => handleScale(((recipe.servings * scale) + 1) / recipe.servings)} className="text-forest-mid cm-light-surface-icon hover:text-heath-mid dark:hover:text-heath-mid w-8 h-8 flex items-center justify-center font-bold transition-colors print:hidden">+</button>
          </div>
        </div>

        {conversionMessage && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
            {conversionMessage}
          </div>
        )}

        {Object.entries(groupedIngredients).map(([group, ingredients]) => {
          const measured = ingredients.filter((ing) => ing.amount);
          const unmeasured = ingredients.filter((ing) => !ing.amount);
          return (
            <div key={group} className="space-y-2">
              <h3 className="text-xs font-bold text-forest-mid cm-light-surface-ink-muted uppercase tracking-[0.2em] opacity-60 dark:opacity-100 flex items-center gap-3">
                {group}
                <div className="flex-1 h-px bg-black/5 dark:bg-white/10" />
              </h3>
              {measured.length > 0 && (
                <ul className="space-y-0">
                  {measured.map((ing, i) => (
                    <li key={ing.id || i} className="cm-recipe-ingredient-row">
                      <span className="cm-recipe-ingredient-amount font-semibold text-heath-mid text-sm">
                        {Number((ing.amount! * scale).toFixed(2))}{ing.unit ? ` ${ing.unit}` : ''}
                      </span>
                      <span className="cm-recipe-ingredient-name text-forest-dark cm-light-surface-ink text-sm">{ing.name}</span>
                    </li>
                  ))}
                </ul>
              )}
              {unmeasured.length > 0 && (
                <ul className="mt-1 space-y-0.5 pl-1">
                  {unmeasured.map((ing, i) => (
                    <li key={ing.id || i} className="text-sm text-forest-mid cm-light-surface-ink-muted italic opacity-75">
                      {ing.unit ? `${ing.unit} ${ing.name}` : ing.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}

        {!isEditing && onPolishIngredients && canMutateRecipe && (
          <button
            onClick={() => onPolishIngredients(recipe)}
            disabled={isAdjusting || aiDisabled}
            className="w-full mt-4 py-2.5 text-[#2A1F1A] bg-[#2A1F1A]/5 hover:bg-[#2A1F1A]/10 rounded-xl text-xs font-bold uppercase tracking-widest border border-[#2A1F1A]/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 print:hidden"
          >
            {isPolishingIngredients ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
            {isPolishingIngredients ? 'Forbedrer...' : 'Stram ingredienser op'}
          </button>
        )}

        <div className="cm-recipe-sticky-clearance" aria-hidden="true" />
      </section>

      {/* Guides */}
      {(recipeHeatGuide.length > 0 || recipe.ovenGuide || recipeFlavorBoosts.length > 0 || recipePitfalls.length > 0 || recipeHints.length > 0) && (
        <section className="print-guides mb-6 space-y-3 print:hidden">
          {recipeHeatGuide.length > 0 && (
            <div className="cm-surface-secondary p-5 rounded-2xl flex gap-4 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-heath-mid/20" />
              <Flame className="text-heath-mid shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="text-xs font-bold text-heath-mid uppercase tracking-[0.2em] mb-1.5 text-engraved">Varmeguide</h4>
                <ul className="text-sm text-forest-mid cm-light-surface-ink-muted space-y-1.5 leading-relaxed">
                  {recipeHeatGuide.map((g, i) => <li key={i} className="flex gap-2"><span>•</span>{formatHeatGuideEntry(g)}</li>)}
                </ul>
              </div>
            </div>
          )}
          {recipeFlavorBoosts.length > 0 && (
            <div className="cm-surface-secondary p-5 rounded-2xl flex gap-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-forest-mid/20" />
              <Lightbulb className="text-heath-mid shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="text-xs font-bold text-forest-mid cm-light-surface-ink-muted uppercase tracking-[0.2em] mb-1.5 text-engraved">Smagsboostere</h4>
                <ul className="text-sm text-forest-mid cm-light-surface-ink-muted space-y-1.5 leading-relaxed">
                  {recipeFlavorBoosts.map((g, i) => <li key={i} className="flex gap-2"><span>•</span>{g}</li>)}
                </ul>
              </div>
            </div>
          )}
          {recipePitfalls.length > 0 && (
            <div className="bg-[#DC2626]/10 dark:bg-[#DC2626]/15 p-5 rounded-2xl border border-[#DC2626]/20 flex gap-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#DC2626]/30" />
              <AlertTriangle className="text-[#DC2626] shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="text-xs font-bold text-[#DC2626] uppercase tracking-[0.2em] mb-1.5 text-engraved">Faldgruber</h4>
                <ul className="text-sm text-forest-dark cm-light-surface-ink space-y-1.5 leading-relaxed">
                  {recipePitfalls.map((g, i) => <li key={i} className="flex gap-2"><span className="text-[#DC2626]/60">•</span>{g}</li>)}
                </ul>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Steps */}
      <section className="print-steps mb-10 glass-brushed p-6 sm:p-8 rounded-[2.5rem] space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-serif text-forest-dark cm-light-surface-ink italic flex items-center gap-3 text-engraved">
              <Flame className="text-heath-mid" size={24} />
              Fremgangsmåde
            </h2>
            <p className="mt-2 text-sm text-forest-mid cm-light-surface-ink-muted italic">
              Brug AI til at gennemgå trin, varme og tider, så opskriften fungerer bedre i cookmode.
            </p>
          </div>
          {canMutateRecipe && onGenerateSteps && (
            <button
              onClick={() => onGenerateSteps(recipe)}
              disabled={isAdjusting || aiDisabled}
              className="print:hidden inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2A1F1A] px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#D4B886] border border-[#3A2A22] transition-colors hover:bg-[#3A2A22] disabled:opacity-50"
              title="AI - Ret til cookmode"
            >
              {isGeneratingSteps ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              {isGeneratingSteps ? 'Retter...' : 'AI - Ret til cookmode'}
            </button>
          )}
        </div>
        <div className="space-y-10">
          {recipeSteps.map((step, i) => (
            <div key={step.id || i} className="flex gap-6 group">
              <div className="w-10 h-10 rounded-full bg-forest-mid text-white flex items-center justify-center font-bold shrink-0 mt-1 shadow-md transition-transform group-hover:scale-110">
                {i + 1}
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {step.heat && (
                    <div className="cm-surface-utility inline-flex items-center gap-2 text-heath-mid px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase">
                      <Flame size={12} /> {formatStepHeatDisplay(step)}
                    </div>
                  )}
                  {step.timer && (
                    <div className="cm-surface-utility inline-flex items-center gap-2 text-forest-mid cm-light-surface-ink px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase">
                      <Clock size={12} /> {step.timer.duration} min: {step.timer.description}
                    </div>
                  )}
                </div>
                <p className="text-forest-dark cm-light-surface-ink leading-relaxed font-serif italic text-lg">{step.text}</p>
                {step.reminder && (
                  <div className="mt-4 bg-[#E5A93B]/10 border border-[#E5A93B]/30 rounded-2xl p-4 flex gap-3 items-start shadow-sm">
                    <div className="bg-[#E5A93B]/20 p-1.5 rounded-full shrink-0">
                      <AlertCircle className="text-[#E5A93B]" size={20} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[#E5A93B] font-bold uppercase tracking-widest text-[10px]">Husk!</span>
                      <p className="text-forest-dark cm-light-surface-ink font-serif text-sm leading-relaxed">
                        {step.reminder}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>


        <div className="cm-recipe-sticky-clearance" aria-hidden="true" />
      </section>

      <div className="print:hidden">
        <RecipeNutritionAttachmentCard
          attachment={recipe.nutritionAttachment}
          estimate={recipe.nutritionEstimate}
          servings={recipe.servings}
          canAttach={Boolean(recipe.isSaved && canMutateRecipe)}
          canEstimate={canMutateRecipe}
          canClear={canMutateRecipe}
          readOnlyMessage={canMutateRecipe ? null : 'Produktdata kan ikke ændres for delte opskrifter.'}
          isEstimating={isEstimatingNutrition}
          aiDisabledReason={aiDisabledReason}
          onEstimate={() => onEstimateNutrition?.(recipe)}
          onAttach={(nutritionAttachment) => onSave({ ...recipe, nutritionAttachment })}
          onClear={() => onSave({ ...recipe, nutritionAttachment: undefined })}
        />
      </div>

      {/* Add Ingredient Modal */}
      {showAddIngredientModal && (
        <div className="cm-dialog-backdrop fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="cm-dialog-surface glass-brushed border border-black/5 dark:border-white/10 rounded-[3rem] p-6 sm:p-8 w-full max-w-sm bg-sand/95 dark:bg-forest-dark/95 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-serif text-forest-dark cm-light-surface-ink italic text-engraved">Tilføj Ingrediens</h3>
              <button onClick={() => setShowAddIngredientModal(false)} className="text-forest-mid cm-light-surface-ink hover:text-forest-dark p-2 hover:bg-white/40 dark:hover:bg-white/10 rounded-full transition-colors">
                <X size={22} />
              </button>
            </div>
            <div className="space-y-6">
              <div className="relative">
                <label className="text-xs font-bold text-forest-mid cm-light-surface-ink-muted dark:opacity-100 uppercase tracking-[0.2em] block mb-2 opacity-60 dark:opacity-100 ml-1">Navn</label>
                <input 
                  type="text" 
                  value={newIngredient.name}
                  onChange={e => setNewIngredient({...newIngredient, name: e.target.value})}
                  placeholder="f.eks. Mælk"
                  className="w-full bg-white/60 dark:bg-black/20 px-5 py-4 rounded-2xl border border-black/5 dark:border-white/10 text-base outline-none focus:border-heath-mid text-forest-dark cm-light-surface-ink font-serif italic shadow-sm placeholder-forest-mid/50 cm-light-surface-placeholder"
                  autoFocus
                />
                {newIngredient.name.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 glass-brushed rounded-2xl shadow-xl z-30 max-h-48 overflow-y-auto">
                    {COMMON_INGREDIENT_SUGGESTIONS
                      .filter(c => c.toLowerCase().includes(newIngredient.name.toLowerCase()))
                      .slice(0, 8)
                      .map(cat => (
                      <button
                        key={cat}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          let unit = '';
                          const lowerCat = cat.toLowerCase();
                          if (lowerCat.includes('mælk') || lowerCat.includes('vand') || lowerCat.includes('fløde') || lowerCat.includes('bouillon')) unit = 'dl';
                          else if (lowerCat.includes('mel') || lowerCat.includes('sukker') || lowerCat.includes('kød') || lowerCat.includes('smør') || lowerCat.includes('pasta') || lowerCat.includes('ris')) unit = 'g';
                          else if (lowerCat.includes('æg') || lowerCat.includes('løg') || lowerCat.includes('tomat') || lowerCat.includes('gulerod')) unit = 'stk';
                          else if (lowerCat.includes('hvidløg')) unit = 'fed';
                          else if (lowerCat.includes('olie') || lowerCat.includes('eddike') || lowerCat.includes('soya')) unit = 'spsk';
                          else if (lowerCat.includes('salt') || lowerCat.includes('peber') || lowerCat.includes('pulver') || lowerCat.includes('natron')) unit = 'tsk';
                          
                          setNewIngredient({...newIngredient, name: cat, unit});
                        }}
                        className="w-full text-left px-5 py-3 text-sm text-forest-dark cm-light-surface-ink hover:bg-white/60 dark:hover:bg-white/10 transition-colors border-b border-black/5 dark:border-white/10 last:border-0"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <label className="text-xs font-bold text-forest-mid cm-light-surface-ink-muted dark:opacity-100 uppercase tracking-[0.2em] block mb-2 opacity-60 dark:opacity-100 ml-1">Enhed</label>
                  <select
                    value={COMMON_RECIPE_UNITS.includes(newIngredient.unit as any) ? newIngredient.unit : (newIngredient.unit ? '__custom__' : '')}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '__custom__') return;
                      setNewIngredient({...newIngredient, unit: val});
                    }}
                    className="w-full bg-white/60 dark:bg-black/20 px-4 py-3 rounded-xl border border-black/5 dark:border-white/10 text-sm outline-none focus:border-heath-mid text-forest-dark cm-light-surface-ink shadow-sm appearance-none"
                  >
                    <option value="" label="Enhed" />
                    {COMMON_RECIPE_UNITS.filter(u => u !== '').map(u => <option key={u} value={u}>{u}</option>)}
                    {newIngredient.unit && !COMMON_RECIPE_UNITS.includes(newIngredient.unit as any) && (
                      <option value="__custom__">{newIngredient.unit}</option>
                    )}
                  </select>
                </div>
                <div className="w-28">
                  <label className="text-xs font-bold text-forest-mid cm-light-surface-ink-muted dark:opacity-100 uppercase tracking-[0.2em] block mb-2 opacity-60 dark:opacity-100 ml-1">Mængde</label>
                  <input 
                    type="number" 
                    value={newIngredient.amount || ''}
                    onChange={e => setNewIngredient({...newIngredient, amount: e.target.value ? Number(e.target.value) : null})}
                    placeholder="0"
                    className="w-full bg-white/60 dark:bg-black/20 px-4 py-3 rounded-xl border border-black/5 dark:border-white/10 text-sm outline-none focus:border-heath-mid text-forest-dark cm-light-surface-ink shadow-sm placeholder-forest-mid/50 cm-light-surface-placeholder"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => {
                    if (newIngredient.name.trim()) {
                      setEditData({...editData, ingredients: [...editIngredients, newIngredient]});
                      setConfirmedIngredients({...confirmedIngredients, [newIngredient.id]: true});
                      setNewIngredient({ id: Math.random().toString(36).substr(2, 9), name: '', amount: null, unit: '', group: 'Andre' });
                    }
                  }}
                  disabled={!newIngredient.name.trim()}
                  className="flex-1 py-4 cm-surface-utility text-forest-mid cm-light-surface-ink rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-white dark:hover:bg-white/10 transition-all disabled:opacity-50"
                >
                  Tilføj & Næste
                </button>
                <button 
                  onClick={() => {
                    if (newIngredient.name.trim()) {
                        setEditData({...editData, ingredients: [...editIngredients, newIngredient]});
                      setConfirmedIngredients({...confirmedIngredients, [newIngredient.id]: true});
                      setShowAddIngredientModal(false);
                    }
                  }}
                  disabled={!newIngredient.name.trim()}
                  className="flex-1 py-4 bg-forest-mid text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-forest-dark transition-all shadow-md disabled:opacity-50"
                >
                  Færdig
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Smart Adjust Modal */}
      {showSmartModal && canMutateRecipe && (
        <div className="cm-dialog-backdrop fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="cm-dialog-surface glass-brushed border border-black/5 dark:border-white/10 rounded-[3rem] p-6 sm:p-8 w-full max-w-sm bg-[#FDFBF7]/95 dark:bg-forest-dark/95 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-2xl font-serif text-forest-dark cm-light-surface-ink italic mb-4 flex items-center gap-3 text-engraved">
              <div className="p-2 bg-white dark:bg-black/20 rounded-xl shadow-sm border border-black/5 dark:border-white/10">
                <Wand2 size={24} className="text-heath-mid"/>
              </div>
              Smart Tilpasning
            </h3>
            <p className="text-sm text-forest-mid cm-light-surface-ink-muted dark:opacity-100 mb-6 italic leading-relaxed">
              Fortæl AI'en hvordan opskriften skal tilpasses. Den bruger gastronomisk logik til at justere mængder, enheder og tilberedningstid.
            </p>
            <textarea 
              value={smartInstruction}
              onChange={e => setSmartInstruction(e.target.value)}
              placeholder="F.eks. 'Jeg har 500g oksekød i stedet for 300g', eller 'Lav gram om til dl'."
              className="w-full bg-white/60 dark:bg-black/20 border border-black/5 dark:border-white/10 rounded-2xl p-4 text-forest-dark cm-light-surface-ink text-sm mb-6 focus:outline-none focus:border-heath-mid resize-none h-32 shadow-sm font-serif italic placeholder-forest-mid/50 cm-light-surface-placeholder"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowSmartModal(false)} className="flex-1 py-4 rounded-2xl border border-black/5 dark:border-white/10 text-forest-mid cm-light-surface-ink font-bold text-xs uppercase tracking-widest hover:bg-white dark:hover:bg-white/10 transition-all">Annuller</button>
              <button 
                onClick={() => {
                  onSmartAdjust(recipe, smartInstruction);
                  setShowSmartModal(false);
                  setSmartInstruction('');
                }} 
                disabled={!smartInstruction.trim() || isAdjusting}
                className="flex-1 py-4 rounded-2xl bg-forest-mid text-white font-bold text-xs uppercase tracking-widest disabled:opacity-50 flex justify-center items-center gap-2 hover:bg-forest-dark transition-all shadow-md"
              >
                {isSmartAdjusting ? <Loader2 size={16} className="animate-spin" /> : 'Tilpas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Cook Button */}
      <div className="fixed bottom-[6.5rem] left-0 right-0 p-4 max-w-md mx-auto z-20 print:hidden">
        <div className="flex flex-col gap-2">
          {canMutateRecipe && !recipe.isSaved && (
            <button
              onClick={openFolderPickerForSave}
              className="btn-botanical w-full py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl"
            >
              <Save size={20} />
              <span className="font-bold uppercase tracking-widest text-xs">Gem opskrift i mappe</span>
            </button>
          )}
          <button
            onClick={() => onStartCook(recipe, scale)}
            className="btn-wood-light w-full py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl"
          >
            <ChefHat size={20} className="text-forest-mid cm-light-surface-icon" />
            <span className="font-serif italic text-xl text-forest-dark cm-light-surface-ink">Start madlavning</span>
          </button>
        </div>
      </div>
      {/* Delete Confirm Dialog */}
      {showDeleteConfirm && (
        <div className="cm-dialog-backdrop fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="cm-dialog-surface glass-brushed border border-black/5 dark:border-white/10 rounded-[2rem] p-6 w-full max-w-xs bg-[#FDFBF7]/95 dark:bg-forest-dark/95 shadow-2xl text-center">
            <Trash2 size={32} className="text-[#DC2626] mx-auto mb-4" />
            <h3 className="text-xl font-serif text-forest-dark cm-light-surface-ink italic mb-2">
              {recipe.isSaved ? 'Slet opskrift?' : 'Kassér kladde?'}
            </h3>
            <p className="text-sm text-forest-mid cm-light-surface-ink-muted mb-6">
              {recipe.isSaved
                ? `"${recipe.title}" slettes. Du kan fortryde i kort tid efterfølgende.`
                : `"${recipe.title || 'Unavngivet kladde'}" kasseres. Dette kan ikke fortrydes.`
              }
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl cm-surface-utility text-forest-dark cm-light-surface-ink font-bold text-xs uppercase tracking-widest hover:bg-white/60 dark:hover:bg-black/5 transition-colors"
              >
                Annuller
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); onDelete(); }}
                className="flex-1 py-3 rounded-xl bg-[#DC2626] text-white font-bold text-xs uppercase tracking-widest hover:bg-[#B91C1C] transition-colors"
              >
                {recipe.isSaved ? 'Slet' : 'Kassér'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Folder Picker Modal */}
      {showFolderPicker && (
        <div className="cm-dialog-backdrop fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="cm-dialog-surface glass-brushed bg-white/90 dark:bg-forest-dark/95 w-full max-w-sm rounded-[2.5rem] p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-serif text-forest-dark cm-light-surface-ink italic text-engraved">Gem i mappe</h3>
              <button onClick={() => {
                setPendingFolderSaveId(null);
                setShowFolderPicker(false);
              }} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 text-forest-mid cm-light-surface-ink rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-forest-mid cm-light-surface-ink-muted dark:opacity-100 italic mb-6">Vælg hvor du vil gemme din opskrift.</p>

            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar mb-6">
              {mutableFolders.filter(f => !f.isDefault).map(folder => (
                <button
                  key={folder.id}
                  onClick={() => {
                    if (requiresPermissionConfirmation(folder)) {
                      setPendingFolderSaveId(folder.id);
                      return;
                    }
                    commitFolderSave(folder);
                  }}
                  className="w-full flex items-center gap-4 p-4 glass-brushed rounded-2xl hover:bg-white dark:hover:bg-white/10 transition-all text-left group border border-black/5 dark:border-white/10"
                >
                  <Folder size={20} className="text-forest-mid cm-light-surface-ink group-hover:scale-110 transition-transform" />
                  <div className="min-w-0 flex-1">
                    <span className="block font-serif text-forest-dark cm-light-surface-ink italic">{folder.name}</span>
                    <div className="mt-2">
                      <OwnershipBadge ownership={getFolderOwnershipDisplay(folder, currentUser)} />
                    </div>
                  </div>
                </button>
              ))}
              
              {showNewFolderInput ? (
                <div className="flex gap-2 p-2">
                  <input 
                    type="text" 
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    placeholder="Ny mappe..."
                    className="flex-1 glass-brushed bg-white/60 dark:bg-black/20 px-4 py-2 rounded-xl text-sm outline-none border border-black/5 dark:border-white/10 focus:ring-2 focus:ring-forest-mid/10 text-forest-dark cm-light-surface-ink placeholder-forest-mid/50 cm-light-surface-placeholder"
                    autoFocus
                  />
                  <button 
                    onClick={() => {
                      if (newFolderName.trim()) {
                        onFolderCreate(newFolderName.trim());
                        setNewFolderName('');
                        setShowNewFolderInput(false);
                      }
                    }}
                    className="bg-forest-dark text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest"
                  >
                    Opret
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setShowNewFolderInput(true)}
                  className="w-full flex items-center gap-4 p-4 border border-dashed border-forest-mid/30 rounded-2xl hover:bg-white/40 dark:hover:bg-white/10 transition-all text-left"
                >
                  <Plus size={20} className="text-forest-mid cm-light-surface-ink" />
                  <span className="text-xs font-bold uppercase tracking-widest text-forest-mid cm-light-surface-ink">Ny mappe</span>
                </button>
              )}
            </div>

            {pendingFolderSave && (
              <div className="mb-6 space-y-3">
                <FolderVisibilityNotice folder={pendingFolderSave} currentUser={currentUser} />
                <div className="flex gap-3">
                  <button
                    onClick={() => commitFolderSave(pendingFolderSave)}
                    className="flex-1 rounded-2xl bg-forest-dark py-3 text-xs font-bold uppercase tracking-widest text-white shadow-lg"
                  >
                    Fortsæt og gem
                  </button>
                  <button
                    onClick={() => setPendingFolderSaveId(null)}
                    className="flex-1 rounded-2xl glass-brushed py-3 text-xs font-bold uppercase tracking-widest text-forest-mid cm-light-surface-ink"
                  >
                    Annuller
                  </button>
                </div>
              </div>
            )}

            <button 
              onClick={() => {
                commitFolderSave(null);
              }}
              className="w-full py-4 bg-forest-dark text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-forest-mid transition-all"
            >
              Gem i hovedbibliotek
            </button>
          </div>
        </div>
      )}
    </div>
  );
}



