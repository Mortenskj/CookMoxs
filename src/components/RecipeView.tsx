import { Recipe, Ingredient, Step, Folder as FolderType } from '../types';
import { ChefHat, Heart, Printer, Save, ArrowLeft, ArrowRight, Clock, Flame, Info, AlertTriangle, Lightbulb, Edit3, Trash2, Plus, Minus, X, Lock, Unlock, Wand2, Loader2, Check, Folder, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DEFAULT_RECIPE_CATEGORIES, COMMON_INGREDIENT_SUGGESTIONS, COMMON_RECIPE_UNITS } from '../config/recipeEditorOptions';
import { RECIPE_PRINT_STYLES } from '../config/recipePrintStyles';
import { OwnershipBadge } from './OwnershipBadge';
import { FolderVisibilityNotice } from './FolderVisibilityNotice';
import { RecipeImportedNotice } from './RecipeImportedNotice';
import { RecipeNutritionAttachmentCard } from './RecipeNutritionAttachmentCard';
import { formatHeatGuideEntry, formatStepHeatDisplay } from '../services/cookModeHeuristics';
import { DEFAULT_FOLDER_NAME } from '../services/defaultFolderService';
import { findFolderForRecipe, getFolderOwnershipDisplay, getRecipeOwnershipDisplay } from '../services/ownershipLabelService';

interface RecipeViewProps {
  recipe: Recipe;
  allCategories: string[];
  allFolders: FolderType[];
  onFolderCreate?: (folderName: string) => void;
  onBack: () => void;
  onForward?: () => void;
  hasForward?: boolean;
  onStartCook: (recipe: Recipe, scale: number, includePrep: boolean) => void;
  onSave: (recipe: Recipe) => void;
  onDelete: () => void;
  onToggleFavorite: (recipe: Recipe) => void;
  onSmartAdjust: (recipe: Recipe, instruction: string) => void;
  onGenerateSteps?: (recipe: Recipe) => void;
  onFillRest?: (recipe: Recipe) => void;
  onGenerateTips?: (recipe: Recipe) => void;
  onApplyPrefix?: (recipe: Recipe, prefix: string) => void;
  onUndoAI?: (originalId: string) => void;
  isAdjusting?: boolean;
  error?: string | null;
  aiDisabledReason?: string | null;
  initialEditMode?: boolean;
  currentUser?: any;
}

export function RecipeView({ recipe, allCategories, allFolders, onFolderCreate, onBack, onForward, hasForward, onStartCook, onSave, onDelete, onToggleFavorite, onSmartAdjust, onGenerateSteps, onFillRest, onGenerateTips, onApplyPrefix, onUndoAI, isAdjusting, error, aiDisabledReason, initialEditMode = false, currentUser }: RecipeViewProps) {
  const [scale, setScale] = useState(1);
  const [includePrep, setIncludePrep] = useState(true);
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [editData, setEditData] = useState<Recipe>(recipe);
  const [history, setHistory] = useState<Recipe[]>([recipe]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const updateEditData = (newData: Recipe) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newData);
    // Limit history to 20 steps
    if (newHistory.length > 20) newHistory.shift();
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
  const [pendingFolderSaveId, setPendingFolderSaveId] = useState<string | null>(null);
  const [confirmedIngredients, setConfirmedIngredients] = useState<Record<string, boolean>>({});
  const aiDisabled = Boolean(aiDisabledReason);
  const ownership = getRecipeOwnershipDisplay(recipe, allFolders, currentUser);
  const currentFolder = findFolderForRecipe(recipe, allFolders);
  const selectedEditFolder = findFolderForRecipe(editData, allFolders);
  const pendingFolderSave = pendingFolderSaveId ? allFolders.find((folder) => folder.id === pendingFolderSaveId) || null : null;
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

  useEffect(() => {
    if (!isEditing || isAdjusting) {
      setEditData(recipe);
      setHistory([recipe]);
      setHistoryIndex(0);
    }
  }, [recipe, isEditing, isAdjusting]);

  useEffect(() => {
    setEditPermissionConfirmed(false);
    setFolderConfirmationError(null);
  }, [isEditing, selectedEditFolder?.id, recipe.id]);

  useEffect(() => {
    if (!canMutateRecipe && isEditing) {
      setIsEditing(false);
    }
  }, [canMutateRecipe, isEditing]);

  const mergedCategories = Array.from(new Set([...DEFAULT_RECIPE_CATEGORIES, ...allCategories])).sort();


  const toggleLock = (ingId: string) => {
    if (!canMutateRecipe) return;

    const updatedRecipe = {
      ...recipe,
      ingredients: (recipe.ingredients || []).map(ing => 
        ing.id === ingId ? { ...ing, locked: !ing.locked } : ing
      )
    };
    onSave(updatedRecipe);
  };

  const convertUnit = (index: number) => {
    if (!editData.ingredients) return;
    const ing = editData.ingredients[index];
    if (!ing || !ing.amount) return;
    
    const name = ing.name.toLowerCase();
    let newAmount = ing.amount;
    let newUnit = ing.unit;

    // Very basic conversion logic for common ingredients
    const gToDl: Record<string, number> = {
      'havregryn': 35,
      'hvedemel': 60,
      'mel': 60,
      'sukker': 85,
      'mælk': 100,
      'vand': 100,
      'olie': 90,
      'smør': 95,
      'kakao': 40,
      'flormelis': 50,
      'fløde': 100,
      'ris': 80,
      'pasta': 35
    };

    let matchedKey = Object.keys(gToDl).find(k => name.includes(k));
    const conversionRate = matchedKey ? gToDl[matchedKey] : 100; // Fallback to 100g = 1dl if unknown

    if (ing.unit.toLowerCase() === 'g') {
      newAmount = Number((ing.amount / conversionRate).toFixed(1));
      newUnit = 'dl';
    } else if (ing.unit.toLowerCase() === 'dl') {
      newAmount = Math.round(ing.amount * conversionRate);
      newUnit = 'g';
    }

    if (newAmount !== ing.amount || newUnit !== ing.unit) {
      const newIngs = [...(editData.ingredients || [])];
      newIngs[index] = { ...ing, amount: newAmount, unit: newUnit };
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
      setFolderConfirmationError('Bekræft at opskriften maa arve synligheden fra den valgte mappe.');
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

  const groupedIngredients = (recipe.ingredients || []).reduce((acc, ing) => {
    const group = ing.group || 'Andre';
    if (!acc[group]) acc[group] = [];
    acc[group].push(ing);
    return acc;
  }, {} as Record<string, typeof recipe.ingredients>);

  if (isEditing) {
    return (
      <div className="p-4 pb-32 max-w-md mx-auto min-h-screen herbal-pattern">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6 sticky top-0 bg-[#FDFBF7]/90 dark:bg-[#121614]/90 backdrop-blur-md py-4 z-10 border-b border-black/5 dark:border-white/10">
          <button onClick={handleCancelEdit} className="p-2 text-forest-mid dark:text-white/70 hover:bg-white/40 dark:hover:bg-white/10 rounded-full transition-colors glass-brushed">
            <X size={22} />
          </button>
          <div className="flex gap-2 flex-wrap justify-end flex-1">
            <div className="flex bg-white/40 dark:bg-black/20 rounded-full p-1 border border-black/5 dark:border-white/10 mr-2">
              <button 
                onClick={undo} 
                disabled={historyIndex === 0}
                className={`p-1.5 rounded-full transition-colors ${historyIndex === 0 ? 'text-forest-mid/20 dark:text-white/20' : 'text-forest-mid dark:text-white/70 hover:bg-white/60 dark:hover:bg-white/10'}`}
              >
                <ArrowLeft size={18} />
              </button>
              <button 
                onClick={redo} 
                disabled={historyIndex === history.length - 1}
                className={`p-1.5 rounded-full transition-colors ${historyIndex === history.length - 1 ? 'text-forest-mid/20 dark:text-white/20' : 'text-forest-mid dark:text-white/70 hover:bg-white/60 dark:hover:bg-white/10'}`}
              >
                <ArrowRight size={18} />
              </button>
            </div>
            <button onClick={() => updateEditData(recipe)} className="px-3 py-1 text-xs font-bold uppercase tracking-widest text-forest-mid dark:text-white/70 hover:text-forest-dark dark:hover:text-white transition-colors">
              Nulstil
            </button>
            {canMutateRecipe && (
              <button 
                onClick={() => setShowSmartModal(true)} 
                className="p-2 text-heath-mid hover:bg-white/40 dark:hover:bg-white/10 rounded-full transition-colors glass-brushed"
                title="Smart Justering"
              >
                {isAdjusting ? <Loader2 size={22} className="animate-spin" /> : <Wand2 size={22} />}
              </button>
            )}
            {canMutateRecipe && (
              <button onClick={onDelete} className="p-2 text-[#DC2626] hover:bg-white/40 dark:hover:bg-white/10 rounded-full transition-colors glass-brushed">
                <Trash2 size={22} />
              </button>
            )}
            <button onClick={handleSaveEdit} className="p-2 text-heath-mid hover:bg-white/40 dark:hover:bg-white/10 rounded-full transition-colors glass-brushed">
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
              className="w-full text-3xl font-serif italic bg-transparent border-b border-black/5 dark:border-white/10 focus:border-heath-mid outline-none pb-3 text-forest-dark dark:text-white placeholder-forest-mid/50 dark:placeholder-white/30"
            />
            <textarea 
              value={editData.summary || ''}
              onChange={e => updateEditData({...editData, summary: e.target.value})}
              onInput={e => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
              placeholder="Kort beskrivelse..."
              rows={2}
              className="w-full bg-transparent border-b border-black/5 dark:border-white/10 focus:border-heath-mid outline-none pb-3 resize-none text-forest-mid dark:text-white/70 overflow-hidden text-sm leading-relaxed italic"
            />
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-1">
                <label className="text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-[0.2em] block mb-2 opacity-60 dark:opacity-100">Mappe</label>
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
                      className="w-full bg-transparent border-b border-black/5 dark:border-white/10 focus:border-heath-mid outline-none pb-1 text-sm text-forest-dark dark:text-white"
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
                      className="text-forest-mid dark:text-white/70 hover:text-forest-dark dark:hover:text-white"
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
                    className="w-full bg-transparent border-b border-black/5 dark:border-white/10 focus:border-heath-mid outline-none pb-1 text-sm text-forest-dark dark:text-white appearance-none cursor-pointer pr-6"
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
                    <label className="flex items-start gap-3 rounded-2xl border border-black/5 bg-white/40 px-4 py-3 text-sm text-forest-mid dark:text-white/70">
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
                <label className="text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-[0.2em] block mb-2 opacity-60 dark:opacity-100">Antal</label>
                <div className="flex gap-2 items-end">
                  <input 
                    type="number" 
                    value={editData.servings}
                    onChange={e => updateEditData({...editData, servings: Number(e.target.value)})}
                    className="w-16 bg-transparent border-b border-black/5 dark:border-white/10 focus:border-heath-mid outline-none pb-1 text-sm text-forest-dark dark:text-white"
                  />
                  <input 
                    type="text" 
                    value={editData.servingsUnit || 'pers.'}
                    onChange={e => updateEditData({...editData, servingsUnit: e.target.value})}
                    className="w-20 bg-transparent border-b border-black/5 dark:border-white/10 focus:border-heath-mid outline-none pb-1 text-sm text-forest-dark dark:text-white"
                  />
                </div>
              </div>
            </div>
            <div className="relative">
              <label className="text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-[0.2em] block mb-3 opacity-60 dark:opacity-100">Kategorier</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {editData.categories?.map(cat => (
                  <span key={cat} className="bg-white/60 dark:bg-black/20 text-forest-mid dark:text-white/70 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2 border border-black/5 dark:border-white/10">
                    {cat}
                    <button onClick={() => updateEditData({...editData, categories: editData.categories?.filter(c => c !== cat)})} className="hover:text-heath-mid transition-colors"><X size={12}/></button>
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
                    updateEditData({...editData, categories: [...(editData.categories || []), categorySearch.trim()]});
                    setCategorySearch('');
                    setShowCategoryDropdown(false);
                  }
                }}
                placeholder="Søg eller tilføj kategori..."
                className="w-full bg-transparent border-b border-black/5 dark:border-white/10 focus:border-heath-mid outline-none pb-2 text-sm text-forest-dark dark:text-white"
              />
              {showCategoryDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 glass-brushed rounded-2xl shadow-xl z-20 max-h-48 overflow-y-auto">
                  {mergedCategories.filter(c => c.toLowerCase().includes(categorySearch.toLowerCase()) && !editData.categories?.includes(c)).map(cat => (
                    <button
                      key={cat}
                      onMouseDown={(e) => e.preventDefault()} // Prevent blur before click
                      onClick={() => {
                        updateEditData({...editData, categories: [...(editData.categories || []), cat]});
                        setCategorySearch('');
                        setShowCategoryDropdown(false);
                      }}
                      className="w-full text-left px-5 py-3 text-sm text-forest-mid dark:text-white/70 hover:bg-white/60 dark:hover:bg-white/10 transition-colors border-b border-black/5 dark:border-white/10 last:border-0"
                    >
                      {cat}
                    </button>
                  ))}
                  {categorySearch.trim() !== '' && !mergedCategories.some(c => c.toLowerCase() === categorySearch.trim().toLowerCase()) && (
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        updateEditData({...editData, categories: [...(editData.categories || []), categorySearch.trim()]});
                        setCategorySearch('');
                        setShowCategoryDropdown(false);
                      }}
                      className="w-full text-left px-5 py-3 text-sm text-heath-mid hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
                    >
                      + Opret "{categorySearch.trim()}"
                    </button>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-[0.2em] block mb-2 opacity-60 dark:opacity-100">Egne noter</label>
              <textarea 
                value={editData.notes || ''}
                onChange={e => updateEditData({...editData, notes: e.target.value})}
                onInput={e => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                placeholder="Tilføj dine egne noter her..."
                rows={3}
                className="w-full bg-transparent border-b border-black/5 dark:border-white/10 focus:border-heath-mid outline-none pb-2 resize-none text-sm overflow-hidden text-forest-mid dark:text-white/80 leading-relaxed italic"
              />
            </div>
          </div>

          <div className="glass-brushed p-6 sm:p-8 rounded-[2.5rem] space-y-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-2xl font-serif text-forest-dark dark:text-white italic flex items-center gap-3 text-engraved">
                <ChefHat className="text-heath-mid" size={24} />
                Ingredienser
              </h2>
            </div>
            
            <div className="space-y-4">
              {(editData.ingredients || []).map((ing, i) => {
                const isConfirmed = confirmedIngredients[ing.id] !== false;
                return (
                <div key={ing.id || i} className="flex flex-col gap-4 bg-white/40 dark:bg-black/20 p-5 rounded-2xl border border-black/5 dark:border-white/10 relative group">
                  <div className="flex items-center gap-3 relative">
                    <div className="flex-1 relative">
                      <input 
                        type="text" 
                        value={ing.name}
                        onChange={e => {
                          const newIngs = [...(editData.ingredients || [])];
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
                        className="w-full bg-white/60 dark:bg-black/20 px-4 py-3 rounded-xl border border-black/5 dark:border-white/10 text-base outline-none focus:border-heath-mid text-forest-dark dark:text-white font-serif italic placeholder-forest-mid/50 dark:placeholder-white/30"
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
                                const newIngs = [...(editData.ingredients || [])];
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
                              className="w-full text-left px-5 py-3 text-sm text-forest-dark dark:text-white/80 hover:bg-white/60 dark:hover:bg-white/10 transition-colors border-b border-black/5 dark:border-white/10 last:border-0"
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
                            const newIngs = editData.ingredients.filter((_, idx) => idx !== i);
                            setEditData({...editData, ingredients: newIngs});
                          }}
                          className="p-3 rounded-xl bg-white/60 dark:bg-black/20 border border-black/5 dark:border-white/10 text-forest-mid dark:text-white/70 hover:text-[#DC2626] hover:border-red-200 dark:hover:border-red-500/50 transition-colors"
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
                          <input
                            type="text"
                            list="units-list"
                            value={ing.unit}
                            onChange={e => {
                              const newIngs = [...(editData.ingredients || [])];
                              newIngs[i].unit = e.target.value;
                              updateEditData({...editData, ingredients: newIngs});
                            }}
                            placeholder="Enhed"
                            className="w-full bg-white/80 dark:bg-black/20 px-3 py-3 rounded-xl border border-black/10 dark:border-white/10 text-sm outline-none focus:border-heath-mid text-forest-dark dark:text-white font-serif italic pr-8 placeholder-forest-mid/50 dark:placeholder-white/30"
                          />
                          <datalist id="units-list">
                            {COMMON_RECIPE_UNITS.map(u => <option key={u} value={u} />)}
                          </datalist>
                          {(ing.unit.toLowerCase() === 'g' || ing.unit.toLowerCase() === 'dl') && (
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
                            const newIngs = [...(editData.ingredients || [])];
                            newIngs[i].amount = e.target.value ? Number(e.target.value) : null;
                            updateEditData({...editData, ingredients: newIngs});
                          }}
                          placeholder="Mængde"
                          className="w-24 flex-1 min-w-[80px] bg-white/80 dark:bg-black/20 px-3 py-3 rounded-xl border border-black/10 dark:border-white/10 text-sm outline-none focus:border-heath-mid text-forest-dark dark:text-white font-serif italic placeholder-forest-mid/50 dark:placeholder-white/30"
                        />
                      </div>
                      <div className="flex gap-2 shrink-0 w-full sm:w-auto justify-end">
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            const newIngs = [...(editData.ingredients || [])];
                            newIngs[i].locked = !newIngs[i].locked;
                            updateEditData({...editData, ingredients: newIngs});
                          }}
                          className={`p-2 rounded-lg transition-all flex-1 sm:flex-none flex justify-center ${ing.locked ? 'bg-forest-mid text-white shadow-sm' : 'bg-white/60 dark:bg-black/20 text-forest-mid dark:text-white/70 border border-black/5 dark:border-white/10 hover:text-forest-dark dark:hover:text-white'}`}
                          title={ing.locked ? "Lås op" : "Lås fast"}
                        >
                          {ing.locked ? <Lock size={16} /> : <Unlock size={16} />}
                        </button>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            const newIngs = editData.ingredients.filter((_, idx) => idx !== i);
                            setEditData({...editData, ingredients: newIngs});
                          }}
                          className="p-2 rounded-lg bg-white/60 dark:bg-black/20 border border-black/5 dark:border-white/10 text-forest-mid dark:text-white/70 hover:text-[#DC2626] hover:border-red-200 dark:hover:border-red-500/50 transition-colors flex-1 sm:flex-none flex justify-center"
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
                  updateEditData({...editData, ingredients: [...(editData.ingredients || []), newIng]});
                  setConfirmedIngredients({...confirmedIngredients, [newIng.id]: false});
                }}
                className="text-xs font-bold uppercase tracking-widest text-heath-mid flex items-center gap-2 glass-brushed px-6 py-3 rounded-xl hover:bg-white/60 dark:hover:bg-white/10 transition-all border border-black/5 dark:border-white/10"
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
              <h2 className="text-2xl font-serif text-forest-dark dark:text-white italic flex items-center gap-3 text-engraved">
                <Flame className="text-heath-mid" size={24} />
                Fremgangsmåde
              </h2>
            </div>
            <div className="space-y-6">
              {(editData.steps || []).map((step, i) => (
                <div key={step.id || i} className="flex gap-4 items-start bg-white/40 dark:bg-black/20 p-5 rounded-2xl border border-black/5 dark:border-white/10 w-full overflow-hidden box-border relative group">
                  <div className="w-8 h-8 rounded-full bg-forest-mid flex items-center justify-center text-xs shrink-0 mt-1 text-white font-bold shadow-sm">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0 space-y-4">
                    <textarea 
                      value={step.text}
                      onChange={e => {
                        const newSteps = [...(editData.steps || [])];
                        newSteps[i].text = e.target.value;
                        updateEditData({...editData, steps: newSteps});
                      }}
                      onInput={e => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                      placeholder="Beskriv trinnet..."
                      rows={2}
                      className="w-full bg-white/60 dark:bg-black/20 px-4 py-3 rounded-xl border border-black/5 dark:border-white/10 text-base outline-none focus:border-heath-mid text-forest-dark dark:text-white font-serif italic resize-none overflow-hidden box-border leading-relaxed placeholder-forest-mid/50 dark:placeholder-white/30"
                    />
                    <div className="flex flex-col sm:flex-row gap-3 w-full">
                      <div className="relative flex-1">
                        <label className="text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-wider block mb-1.5 opacity-60 dark:opacity-100 ml-1">Varme</label>
                        <input 
                          type="text" 
                          value={step.heat || ''}
                          onChange={e => {
                            const newSteps = [...(editData.steps || [])];
                            newSteps[i].heat = e.target.value;
                            updateEditData({...editData, steps: newSteps});
                          }}
                          placeholder="f.eks. Induktion - 5"
                          className="w-full bg-white/60 dark:bg-black/20 px-3 py-2 rounded-lg border border-black/5 dark:border-white/10 text-sm outline-none focus:border-heath-mid text-forest-dark dark:text-white placeholder-forest-mid/50 dark:placeholder-white/30"
                        />
                      </div>
                      <div className="relative flex-1">
                        <label className="text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-wider block mb-1.5 opacity-60 dark:opacity-100 ml-1">Husk (Påmindelse)</label>
                        <input 
                          type="text" 
                          value={step.reminder || ''}
                          onChange={e => {
                            const newSteps = [...(editData.steps || [])];
                            newSteps[i].reminder = e.target.value;
                            updateEditData({...editData, steps: newSteps});
                          }}
                          placeholder="f.eks. Gem pastavand"
                          className="w-full bg-white/60 dark:bg-black/20 px-3 py-2 rounded-lg border border-black/5 dark:border-white/10 text-sm outline-none focus:border-heath-mid text-forest-dark dark:text-white placeholder-forest-mid/50 dark:placeholder-white/30"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5 w-full">
                        <label className="text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-wider block mb-1.5 opacity-60 dark:opacity-100 ml-1">Timer</label>
                        <div className="flex gap-2 w-full">
                          <input 
                            type="number" 
                            value={step.timer?.duration || ''}
                            onChange={e => {
                              const newSteps = [...(editData.steps || [])];
                              const duration = e.target.value ? Number(e.target.value) : undefined;
                              if (duration) {
                                newSteps[i].timer = { duration, description: step.timer?.description || 'Timer' };
                              } else {
                                newSteps[i].timer = undefined;
                              }
                              updateEditData({...editData, steps: newSteps});
                            }}
                            placeholder="Min"
                            className="w-20 shrink-0 bg-white/60 dark:bg-black/20 px-3 py-2 rounded-lg border border-black/5 dark:border-white/10 text-sm outline-none focus:border-heath-mid text-forest-dark dark:text-white placeholder-forest-mid/50 dark:placeholder-white/30"
                          />
                          <div className="relative flex-1">
                            <input 
                              type="text" 
                              list="timer-descriptions"
                              value={step.timer?.description || ''}
                              onChange={e => {
                                const newSteps = [...(editData.steps || [])];
                                if (step.timer) {
                                  newSteps[i].timer = { ...step.timer, description: e.target.value };
                                } else if (e.target.value) {
                                  newSteps[i].timer = { duration: 0, description: e.target.value };
                                }
                                updateEditData({...editData, steps: newSteps});
                              }}
                              placeholder="Beskrivelse"
                              className="w-full bg-white/60 dark:bg-black/20 px-3 py-2 rounded-lg border border-black/5 dark:border-white/10 text-sm outline-none focus:border-heath-mid text-forest-dark dark:text-white placeholder-forest-mid/50 dark:placeholder-white/30"
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
                      const newSteps = (editData.steps || []).filter((_, idx) => idx !== i);
                      updateEditData({...editData, steps: newSteps});
                    }}
                    className="p-2 rounded-lg bg-white/60 dark:bg-black/20 border border-black/5 dark:border-white/10 text-forest-mid dark:text-white/70 hover:text-[#DC2626] hover:border-red-200 dark:hover:border-red-500/50 transition-colors shrink-0 mt-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="pt-2 flex justify-center">
              <button 
                onClick={() => updateEditData({...editData, steps: [...(editData.steps || []), { id: Date.now().toString(), text: '' }]})}
                className="text-xs font-bold uppercase tracking-widest text-heath-mid flex items-center gap-2 glass-brushed px-6 py-3 rounded-xl hover:bg-white/60 dark:hover:bg-white/10 transition-all border border-black/5 dark:border-white/10"
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
              {isAdjusting ? <Loader2 size={20} className="animate-spin" /> : <Wand2 size={20} />}
              {isAdjusting ? 'Udfylder...' : 'Udfyld resten med AI'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-32 max-w-md mx-auto min-h-screen herbal-pattern">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6 sticky top-0 bg-sand/90 dark:bg-[#121614]/90 backdrop-blur-md py-4 z-10 border-b border-black/5 dark:border-white/10 print:hidden">
        <div className="flex gap-2">
          <button onClick={onBack} className="flex items-center gap-1 p-2 text-forest-mid dark:text-white/70 hover:bg-white/40 dark:hover:bg-white/10 rounded-full transition-colors glass-brushed">
            <ArrowLeft size={22} />
            <span className="text-sm font-medium pr-2 hidden sm:inline">Tilbage</span>
          </button>
          {hasForward && onForward && (
            <button onClick={onForward} className="p-2 text-forest-mid dark:text-white/70 hover:bg-white/40 dark:hover:bg-white/10 rounded-full transition-colors glass-brushed">
              <ArrowRight size={22} />
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {canMutateRecipe && (recipe.folder === DEFAULT_FOLDER_NAME || !recipe.isSaved) && (
            <button 
              onClick={openFolderPickerForSave} 
              className="flex items-center gap-2 px-6 py-2 bg-heath-mid text-white rounded-full text-xs font-bold tracking-widest uppercase shadow-lg hover:bg-heath-dark transition-all scale-105 animate-pulse hover:animate-none"
            >
              <Save size={18} />
              Gem Opskrift
            </button>
          )}
          {canMutateRecipe && (
            <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 text-forest-mid dark:text-white/70 hover:bg-white/40 dark:hover:bg-white/10 rounded-full transition-colors glass-brushed">
              <Edit3 size={18} />
              <span className="text-sm font-medium hidden sm:inline">Rediger</span>
            </button>
          )}
          {canMutateRecipe && (
            <button onClick={() => onToggleFavorite(recipe)} className="p-2 text-forest-mid dark:text-white/70 hover:bg-white/40 dark:hover:bg-white/10 rounded-full transition-colors glass-brushed">
              <Heart size={22} className={recipe.isFavorite ? "fill-heath-mid text-heath-mid" : ""} />
            </button>
          )}
          <button onClick={() => window.print()} className="p-2 text-forest-mid dark:text-white/70 hover:bg-white/40 dark:hover:bg-white/10 rounded-full transition-colors glass-brushed">
            <Printer size={22} />
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: RECIPE_PRINT_STYLES }} />

      {!recipe.isSaved && (
        <RecipeImportedNotice
          isAdjusting={isAdjusting}
          aiDisabledReason={aiDisabledReason}
          onSimplify={() => onSmartAdjust(recipe, 'Gør fremgangsmåden enklere, kortere og mere overskuelig uden at ændre retten eller ingredienslisten unødigt.')}
          onTighten={() => onSmartAdjust(recipe, 'Gennemgå opskriften og fjern gentagelser, upræcise formuleringer og uklare gruppenavne. Bevar retten, men gør den skarpere og mere konsekvent.')}
          onCheckTimes={() => onSmartAdjust(recipe, 'Gennemgå alle tider, varmeangivelser og timere. Ret det, der virker upræcist, og tilføj manglende timer hvor det giver mening.')}
        />
      )}

      {/* Meta */}
      <div className="mb-8 space-y-6">
        <div className="glass-brushed p-6 sm:p-8 rounded-[2.5rem]">
          <h1 className="text-4xl font-serif text-forest-dark dark:text-white mb-4 leading-tight italic text-engraved">{recipe.title}</h1>
          {recipe.summary && <p className="text-forest-mid dark:text-white/80 mb-6 leading-relaxed italic text-sm opacity-80">{recipe.summary}</p>}
          {(recipe.updatedAt || recipe.createdAt) && (
            <p className="text-xs text-forest-mid dark:text-white/70 italic mb-4 opacity-80">
              Sidst gemt: {new Date(recipe.updatedAt || recipe.createdAt!).toLocaleString('da-DK')}
            </p>
          )}
          <div className="mb-4 flex items-center gap-3">
            <OwnershipBadge ownership={ownership} />
            <p className="text-xs text-forest-mid dark:text-white/70 opacity-80">{ownership.detail}</p>
          </div>
          {!canMutateRecipe && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
              Denne opskrift er delt som visning. Redigering, favoritter og andre ændringer er skjult i denne stabiliserings-pass.
            </div>
          )}
          
          <div className="flex flex-wrap gap-2 mb-6">
            {canMutateRecipe && (
            <div className="relative">
              <select 
                onChange={(e) => {
                  if (e.target.value && onApplyPrefix) {
                    onApplyPrefix(recipe, e.target.value);
                    e.target.value = ""; // reset
                  }
                }}
                disabled={isAdjusting || aiDisabled}
                className="bg-white/60 dark:bg-black/20 text-heath-mid px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase border border-black/5 dark:border-white/10 outline-none appearance-none cursor-pointer pr-10 relative shadow-sm hover:bg-white dark:hover:bg-white/10 transition-all"
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

            {canMutateRecipe && onGenerateTips && (
              <button 
                onClick={() => setShowTipsModal(true)}
                disabled={isAdjusting || aiDisabled}
                className="flex items-center gap-2 bg-white/60 dark:bg-black/20 text-forest-mid dark:text-white/80 hover:text-heath-mid dark:hover:text-heath-mid px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase border border-black/5 dark:border-white/10 transition-all shadow-sm hover:bg-white dark:hover:bg-white/10"
              >
                {isAdjusting ? <Loader2 size={14} className="animate-spin" /> : <Lightbulb size={14} />}
                Tips & Tricks
              </button>
            )}

            {recipe.folder && (
              <span className="bg-forest-mid text-white px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase shadow-sm">
                📁 {recipe.folder}
              </span>
            )}
            {recipe.categories?.map((cat, i) => (
              <span key={i} className="bg-white/60 dark:bg-black/20 text-forest-mid dark:text-white/80 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase border border-black/5 dark:border-white/10 shadow-sm">
                {cat}
              </span>
            ))}
          </div>
          {aiDisabledReason && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
              AI-hjælp er midlertidigt slået fra. {aiDisabledReason}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
          {recipe.notes && (
            <div className="bg-white/40 dark:bg-black/20 p-6 rounded-3xl border border-black/5 dark:border-white/10 mt-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-heath-mid/20" />
              <h4 className="text-xs font-bold text-heath-mid uppercase tracking-[0.2em] mb-3 opacity-60 dark:opacity-100 text-engraved">Mine noter</h4>
              <p className="text-sm text-forest-mid dark:text-white/80 whitespace-pre-wrap leading-relaxed italic">{recipe.notes}</p>
            </div>
          )}
        </div>
      </div>

      <RecipeNutritionAttachmentCard
        attachment={recipe.nutritionAttachment}
        canAttach={Boolean(recipe.isSaved && canMutateRecipe)}
        canClear={canMutateRecipe}
        readOnlyMessage={canMutateRecipe ? null : 'Produktdata kan ikke aendres for delte opskrifter i denne stabiliserings-pass.'}
        onAttach={(nutritionAttachment) => onSave({ ...recipe, nutritionAttachment })}
        onClear={() => onSave({ ...recipe, nutritionAttachment: undefined })}
      />

      {/* AI Rationale */}
      {recipe.aiRationale && (
        <div className="mb-8 glass-brushed p-6 sm:p-8 rounded-[2.5rem] border border-heath-mid/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-heath-mid/5 rounded-full -mr-16 -mt-16 blur-2xl" />
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[#FDFBF7] dark:bg-black/20 rounded-xl shadow-sm border border-black/5 dark:border-white/10">
              <Wand2 size={20} className="text-heath-mid" />
            </div>
            <h3 className="font-serif text-xl text-forest-dark dark:text-white italic text-engraved">AI Tilpasning</h3>
          </div>
          <p className="text-sm text-forest-mid dark:text-white/80 leading-relaxed whitespace-pre-wrap mb-8 italic">
            {recipe.aiRationale}
          </p>
          <div className="flex gap-3">
            {recipe.originalRecipeId && onUndoAI && (
              <button 
                onClick={() => onUndoAI(recipe.originalRecipeId!)}
                className="flex-1 py-3 bg-white/60 dark:bg-black/20 text-forest-mid dark:text-white/80 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-white dark:hover:bg-white/10 transition-all border border-black/5 dark:border-white/10 shadow-sm"
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
      {recipe.tipsAndTricks && recipe.tipsAndTricks.length > 0 && (
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
            {isAdjusting ? <Loader2 size={24} className="animate-spin" /> : <Lightbulb size={24} />}
          </button>
        </motion.div>
      )}

      {/* Tips Modal */}
      {showTipsModal && (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-brushed border border-black/5 dark:border-white/10 rounded-[3rem] p-6 sm:p-8 max-w-sm w-full shadow-2xl relative bg-sand/95 dark:bg-[#1A221E]/95 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button 
              onClick={() => setShowTipsModal(false)}
              className="absolute right-6 top-6 text-forest-mid dark:text-white/70 hover:text-forest-dark dark:hover:text-white transition-colors p-2 hover:bg-white/40 dark:hover:bg-white/10 rounded-full"
            >
              <X size={22} />
            </button>
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-white dark:bg-black/20 rounded-2xl shadow-sm border border-black/5 dark:border-white/10">
                {isAdjusting ? <Loader2 size={28} className="text-heath-mid animate-spin" /> : <Lightbulb size={28} className="text-heath-mid" />}
              </div>
              <h3 className="font-serif text-2xl text-forest-dark dark:text-white italic text-engraved">Tips & Tricks</h3>
            </div>
            
            {Array.isArray(recipe.tipsAndTricks) && recipe.tipsAndTricks.length > 0 ? (
              <ul className="space-y-5 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                {recipe.tipsAndTricks.map((tip, idx) => (
                  <li key={idx} className="flex gap-4 text-sm text-forest-mid dark:text-white/80 leading-relaxed italic">
                    <span className="text-heath-mid font-bold mt-1 shrink-0">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-10 text-forest-mid dark:text-white/80">
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
                {isAdjusting ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                {recipe.tipsAndTricks && recipe.tipsAndTricks.length > 0 ? 'Generer nye tips' : 'Generer tips'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Ingredients */}
      <section className="mb-10 glass-brushed p-6 sm:p-8 rounded-[2.5rem] space-y-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-2xl font-serif text-forest-dark dark:text-white italic flex items-center gap-3 text-engraved">
              <ChefHat className="text-heath-mid" size={24} />
              Ingredienser
            </h2>
            <div className="flex items-center gap-2 print:hidden">
              {canMutateRecipe && (
              <button 
                onClick={() => setShowSmartModal(true)} 
                disabled={isAdjusting || aiDisabled}
                className="text-xs font-bold uppercase tracking-widest text-heath-mid flex items-center gap-1.5 glass-brushed px-3 py-2 rounded-xl hover:bg-white/60 dark:hover:bg-white/10 transition-all shadow-sm disabled:opacity-50" 
                title="Smart Tilpasning"
              >
                {isAdjusting ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                {isAdjusting ? 'Tilpasser...' : 'AI Tilpas'}
              </button>
              )}
              {canMutateRecipe && (
              <button 
                onClick={() => {
                  setIsEditing(true);
                  const newIng = { id: Date.now().toString(), name: '', amount: null, unit: '', group: 'Andre' };
                  updateEditData({...recipe, ingredients: [...(recipe.ingredients || []), newIng]});
                  setConfirmedIngredients({...confirmedIngredients, [newIng.id]: false});
                }}
                className="text-xs font-bold uppercase tracking-widest text-forest-mid dark:text-white/70 flex items-center gap-1.5 glass-brushed px-3 py-2 rounded-xl hover:bg-white/60 dark:hover:bg-white/10 transition-all shadow-sm"
                title="Tilføj ingrediens"
              >
                <Plus size={14} />
                Tilføj
              </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white/60 dark:bg-black/20 rounded-2xl px-4 py-2 border border-black/5 dark:border-white/10 shadow-sm w-full justify-center print:border-none print:shadow-none print:bg-transparent print:p-0">
            <button onClick={() => handleScale(((recipe.servings * scale) - 1) / recipe.servings)} className="text-forest-mid dark:text-white/70 hover:text-heath-mid dark:hover:text-heath-mid w-8 h-8 flex items-center justify-center font-bold transition-colors print:hidden">-</button>
            <span className="text-xs font-bold text-forest-dark dark:text-white text-center uppercase tracking-widest min-w-[4rem]">{Math.round(recipe.servings * scale)} {recipe.servingsUnit || 'pers.'}</span>
            <button onClick={() => handleScale(((recipe.servings * scale) + 1) / recipe.servings)} className="text-forest-mid dark:text-white/70 hover:text-heath-mid dark:hover:text-heath-mid w-8 h-8 flex items-center justify-center font-bold transition-colors print:hidden">+</button>
          </div>
        </div>

        {Object.entries(groupedIngredients).map(([group, ingredients]) => (
          <div key={group} className="space-y-4">
            <h3 className="text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-[0.2em] opacity-60 dark:opacity-100 flex items-center gap-3">
              {group}
              <div className="flex-1 h-px bg-black/5 dark:bg-white/10" />
            </h3>
            <ul className="space-y-3">
              {ingredients.map((ing, i) => (
                <li key={ing.id || i} className="flex justify-between items-center group/item">
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleLock(ing.id)} className="p-1.5 hover:bg-white/60 dark:hover:bg-white/10 rounded-lg transition-all text-forest-mid dark:text-white/70 opacity-40 group-hover/item:opacity-100" title={ing.locked ? "Lås op" : "Lås mængde"}>
                      {ing.locked ? <Lock size={14} className="text-heath-mid" /> : <Unlock size={14} />}
                    </button>
                    <span className="text-forest-dark dark:text-white font-serif italic">{ing.name}</span>
                  </div>
                  <span className="font-bold text-heath-mid text-sm tracking-tight">
                    {ing.amount ? (ing.locked ? ing.amount : Number((ing.amount * scale).toFixed(2))) : ''} {ing.unit}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* Guides */}
      {(recipe.heatGuide || recipe.ovenGuide || recipe.flavorBoosts || recipe.pitfalls || recipe.hints) && (
        <section className="mb-10 space-y-4">
          {Array.isArray(recipe.heatGuide) && recipe.heatGuide.length > 0 && (
            <div className="bg-white/40 dark:bg-black/20 p-6 rounded-3xl border border-black/5 dark:border-white/10 flex gap-4 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-heath-mid/20" />
              <Flame className="text-heath-mid shrink-0" size={24} />
              <div>
                <h4 className="text-xs font-bold text-heath-mid uppercase tracking-[0.2em] mb-2 opacity-60 dark:opacity-100 text-engraved">Varmeguide</h4>
                <ul className="text-sm text-forest-mid dark:text-white/70 space-y-2 italic leading-relaxed">
                  {recipe.heatGuide.map((g, i) => <li key={i} className="flex gap-2"><span>•</span>{formatHeatGuideEntry(g)}</li>)}
                </ul>
              </div>
            </div>
          )}
          {Array.isArray(recipe.flavorBoosts) && recipe.flavorBoosts.length > 0 && (
            <div className="bg-white/40 dark:bg-black/20 p-6 rounded-3xl border border-black/5 dark:border-white/10 flex gap-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-forest-mid/20" />
              <Lightbulb className="text-heath-mid shrink-0" size={24} />
              <div>
                <h4 className="text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-[0.2em] mb-2 opacity-60 dark:opacity-100 text-engraved">Smagsboostere</h4>
                <ul className="text-sm text-forest-mid dark:text-white/70 space-y-2 italic leading-relaxed">
                  {recipe.flavorBoosts.map((g, i) => <li key={i} className="flex gap-2"><span>•</span>{g}</li>)}
                </ul>
              </div>
            </div>
          )}
          {Array.isArray(recipe.pitfalls) && recipe.pitfalls.length > 0 && (
            <div className="bg-[#DC2626]/5 dark:bg-[#DC2626]/10 p-6 rounded-3xl border border-[#DC2626]/10 flex gap-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#DC2626]/20" />
              <AlertTriangle className="text-[#DC2626] shrink-0" size={24} />
              <div>
                <h4 className="text-xs font-bold text-[#DC2626] uppercase tracking-[0.2em] mb-2 opacity-60 dark:opacity-100 text-engraved">Faldgruber</h4>
                <ul className="text-sm text-forest-mid dark:text-white/70 space-y-2 italic leading-relaxed">
                  {recipe.pitfalls.map((g, i) => <li key={i} className="flex gap-2"><span>•</span>{g}</li>)}
                </ul>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Steps */}
      <section className="mb-10 glass-brushed p-6 sm:p-8 rounded-[2.5rem] space-y-8">
        <h2 className="text-2xl font-serif text-forest-dark dark:text-white italic flex items-center gap-3 text-engraved">
          <Flame className="text-heath-mid" size={24} />
          Fremgangsmåde
        </h2>
        <div className="space-y-10">
          {(recipe.steps || []).map((step, i) => (
            <div key={step.id || i} className="flex gap-6 group">
              <div className="w-10 h-10 rounded-full bg-forest-mid text-white flex items-center justify-center font-bold shrink-0 mt-1 shadow-md transition-transform group-hover:scale-110">
                {i + 1}
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {step.heat && (
                    <div className="inline-flex items-center gap-2 bg-white/60 dark:bg-black/20 text-heath-mid px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase border border-black/5 dark:border-white/10 shadow-sm">
                      <Flame size={12} /> {formatStepHeatDisplay(step)}
                    </div>
                  )}
                  {step.timer && (
                    <div className="inline-flex items-center gap-2 bg-white/60 dark:bg-black/20 text-forest-mid dark:text-white/70 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase border border-black/5 dark:border-white/10 shadow-sm">
                      <Clock size={12} /> {step.timer.duration} min: {step.timer.description}
                    </div>
                  )}
                </div>
                <p className="text-forest-dark dark:text-white leading-relaxed font-serif italic text-lg">{step.text}</p>
                {step.reminder && (
                  <div className="mt-4 bg-[#E5A93B]/10 border border-[#E5A93B]/30 rounded-2xl p-4 flex gap-3 items-start shadow-sm">
                    <div className="bg-[#E5A93B]/20 p-1.5 rounded-full shrink-0">
                      <AlertCircle className="text-[#E5A93B]" size={20} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[#E5A93B] font-bold uppercase tracking-widest text-[10px]">Husk!</span>
                      <p className="text-forest-dark dark:text-white font-serif text-sm leading-relaxed">
                        {step.reminder}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Add Ingredient Modal */}
      {showAddIngredientModal && (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-brushed border border-black/5 dark:border-white/10 rounded-[3rem] p-6 sm:p-8 w-full max-w-sm bg-sand/95 dark:bg-forest-dark/95 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-serif text-forest-dark dark:text-white italic text-engraved">Tilføj Ingrediens</h3>
              <button onClick={() => setShowAddIngredientModal(false)} className="text-forest-mid dark:text-white/70 hover:text-forest-dark dark:hover:text-white p-2 hover:bg-white/40 dark:hover:bg-white/10 rounded-full transition-colors">
                <X size={22} />
              </button>
            </div>
            <div className="space-y-6">
              <div className="relative">
                <label className="text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-[0.2em] block mb-2 opacity-60 dark:opacity-100 ml-1">Navn</label>
                <input 
                  type="text" 
                  value={newIngredient.name}
                  onChange={e => setNewIngredient({...newIngredient, name: e.target.value})}
                  placeholder="f.eks. Mælk"
                  className="w-full bg-white/60 dark:bg-black/20 px-5 py-4 rounded-2xl border border-black/5 dark:border-white/10 text-base outline-none focus:border-heath-mid text-forest-dark dark:text-white font-serif italic shadow-sm placeholder-forest-mid/50 dark:placeholder-white/30"
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
                        className="w-full text-left px-5 py-3 text-sm text-forest-dark dark:text-white/80 hover:bg-white/60 dark:hover:bg-white/10 transition-colors border-b border-black/5 dark:border-white/10 last:border-0"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <label className="text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-[0.2em] block mb-2 opacity-60 dark:opacity-100 ml-1">Enhed</label>
                  <input
                    type="text"
                    list="new-units-list"
                    value={newIngredient.unit}
                    onChange={e => setNewIngredient({...newIngredient, unit: e.target.value})}
                    placeholder="Enhed"
                    className="w-full bg-white/60 dark:bg-black/20 px-4 py-3 rounded-xl border border-black/5 dark:border-white/10 text-sm outline-none focus:border-heath-mid text-forest-dark dark:text-white shadow-sm placeholder-forest-mid/50 dark:placeholder-white/30"
                  />
                  <datalist id="new-units-list">
                    {COMMON_RECIPE_UNITS.map(u => <option key={u} value={u} />)}
                  </datalist>
                </div>
                <div className="w-28">
                  <label className="text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-[0.2em] block mb-2 opacity-60 dark:opacity-100 ml-1">Mængde</label>
                  <input 
                    type="number" 
                    value={newIngredient.amount || ''}
                    onChange={e => setNewIngredient({...newIngredient, amount: e.target.value ? Number(e.target.value) : null})}
                    placeholder="0"
                    className="w-full bg-white/60 dark:bg-black/20 px-4 py-3 rounded-xl border border-black/5 dark:border-white/10 text-sm outline-none focus:border-heath-mid text-forest-dark dark:text-white shadow-sm placeholder-forest-mid/50 dark:placeholder-white/30"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => {
                    if (newIngredient.name.trim()) {
                      setEditData({...editData, ingredients: [...(editData.ingredients || []), newIngredient]});
                      setConfirmedIngredients({...confirmedIngredients, [newIngredient.id]: true});
                      setNewIngredient({ id: Math.random().toString(36).substr(2, 9), name: '', amount: null, unit: '', group: 'Andre' });
                    }
                  }}
                  disabled={!newIngredient.name.trim()}
                  className="flex-1 py-4 bg-white/60 dark:bg-black/20 text-forest-mid dark:text-white/70 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-white dark:hover:bg-white/10 transition-all border border-black/5 dark:border-white/10 shadow-sm disabled:opacity-50"
                >
                  Tilføj & Næste
                </button>
                <button 
                  onClick={() => {
                    if (newIngredient.name.trim()) {
                      setEditData({...editData, ingredients: [...(editData.ingredients || []), newIngredient]});
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
        <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-brushed border border-black/5 dark:border-white/10 rounded-[3rem] p-6 sm:p-8 w-full max-w-sm bg-[#FDFBF7]/95 dark:bg-forest-dark/95 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-2xl font-serif text-forest-dark dark:text-white italic mb-4 flex items-center gap-3 text-engraved">
              <div className="p-2 bg-white dark:bg-black/20 rounded-xl shadow-sm border border-black/5 dark:border-white/10">
                <Wand2 size={24} className="text-heath-mid"/>
              </div>
              Smart Tilpasning
            </h3>
            <p className="text-sm text-forest-mid dark:text-white/70 mb-6 italic leading-relaxed">
              Fortæl AI'en hvordan opskriften skal tilpasses. Den bruger gastronomisk logik til at justere mængder, enheder og tilberedningstid.
            </p>
            <textarea 
              value={smartInstruction}
              onChange={e => setSmartInstruction(e.target.value)}
              placeholder="F.eks. 'Jeg har 500g oksekød i stedet for 300g', eller 'Lav gram om til dl'."
              className="w-full bg-white/60 dark:bg-black/20 border border-black/5 dark:border-white/10 rounded-2xl p-4 text-forest-dark dark:text-white text-sm mb-6 focus:outline-none focus:border-heath-mid resize-none h-32 shadow-sm font-serif italic placeholder-forest-mid/50 dark:placeholder-white/30"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowSmartModal(false)} className="flex-1 py-4 rounded-2xl border border-black/5 dark:border-white/10 text-forest-mid dark:text-white/70 font-bold text-xs uppercase tracking-widest hover:bg-white dark:hover:bg-white/10 transition-all">Annuller</button>
              <button 
                onClick={() => {
                  onSmartAdjust(recipe, smartInstruction);
                  setShowSmartModal(false);
                  setSmartInstruction('');
                }} 
                disabled={!smartInstruction.trim() || isAdjusting}
                className="flex-1 py-4 rounded-2xl bg-forest-mid text-white font-bold text-xs uppercase tracking-widest disabled:opacity-50 flex justify-center items-center gap-2 hover:bg-forest-dark transition-all shadow-md"
              >
                {isAdjusting ? <Loader2 size={16} className="animate-spin" /> : 'Tilpas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Cook Button */}
      <div className="fixed bottom-20 left-0 right-0 p-4 max-w-md mx-auto z-20 print:hidden">
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 justify-center mb-1 text-sm text-forest-mid dark:text-white/70 cursor-pointer">
            <input 
              type="checkbox" 
              checked={includePrep} 
              onChange={(e) => setIncludePrep(e.target.checked)} 
              className="w-5 h-5 rounded border-forest-mid/30 text-forest-dark focus:ring-forest-dark bg-white/50 dark:bg-black/50"
            />
            <span className="font-medium tracking-wide">Inkludér "Forbered ingredienser" trin</span>
          </label>
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
            onClick={() => onStartCook(recipe, scale, includePrep)}
            className="btn-wood-light w-full py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl"
          >
            <ChefHat size={20} className="text-forest-mid dark:text-white/70" />
            <span className="font-serif italic text-xl text-forest-dark dark:text-white">Start madlavning</span>
          </button>
        </div>
      </div>
      {/* Folder Picker Modal */}
      {showFolderPicker && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="glass-brushed bg-white/90 dark:bg-forest-dark/95 w-full max-w-sm rounded-[2.5rem] p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-serif text-forest-dark dark:text-white italic text-engraved">Gem i mappe</h3>
              <button onClick={() => {
                setPendingFolderSaveId(null);
                setShowFolderPicker(false);
              }} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 text-forest-mid dark:text-white/70 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-forest-mid dark:text-white/70 italic mb-6">Vælg hvor du vil gemme din opskrift.</p>

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
                  <Folder size={20} className="text-forest-mid dark:text-white/70 group-hover:scale-110 transition-transform" />
                  <div className="min-w-0 flex-1">
                    <span className="block font-serif text-forest-dark dark:text-white italic">{folder.name}</span>
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
                    className="flex-1 glass-brushed bg-white/60 dark:bg-black/20 px-4 py-2 rounded-xl text-sm outline-none border border-black/5 dark:border-white/10 focus:ring-2 focus:ring-forest-mid/10 text-forest-dark dark:text-white placeholder-forest-mid/50 dark:placeholder-white/30"
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
                  <Plus size={20} className="text-forest-mid dark:text-white/70" />
                  <span className="text-xs font-bold uppercase tracking-widest text-forest-mid dark:text-white/70">Ny mappe</span>
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
                    className="flex-1 rounded-2xl glass-brushed py-3 text-xs font-bold uppercase tracking-widest text-forest-mid dark:text-white/70"
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
