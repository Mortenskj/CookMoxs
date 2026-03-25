import { Recipe, Folder as FolderType } from '../types';
import { Search, Heart, Book, List, Tag, ChevronRight, ArrowLeft, Folder, Plus, Edit3, Trash2, X, TreePine, Share2, UserPlus, Shield, ShieldCheck, Save } from 'lucide-react';
import { useState } from 'react';
import { OwnershipBadge } from './OwnershipBadge';
import { getFolderOwnershipDisplay } from '../services/ownershipLabelService';
import { LibraryRecipeCard } from './library/LibraryRecipeCard';
import { LibraryEmptyState } from './library/LibraryEmptyState';
import { LibrarySortSelect } from './library/LibrarySortSelect';
import { ShareFolderModal } from './library/ShareFolderModal';

interface LibraryViewProps {
  savedRecipes: Recipe[];
  allFolders: FolderType[];
  onOpenRecipe: (recipe: Recipe) => void;
  onCreateFolder: (folder: string) => void;
  onCreateInFolder: (folder: FolderType) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onShareFolder: (folderId: string, email: string, role: 'viewer' | 'editor') => void;
  currentUser: any;
}

type LibrarySection = 'home' | 'favorites' | 'cookbooks' | 'all' | 'categories';
type SortOrder = 'newest' | 'alphabetical' | 'most_used' | 'category';

export function LibraryView({ savedRecipes, allFolders, onOpenRecipe, onCreateFolder, onCreateInFolder, onDeleteFolder, onRenameFolder, onShareFolder, currentUser }: LibraryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<LibrarySection>('home');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [folderIdToDelete, setFolderIdToDelete] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState<'viewer' | 'editor'>('viewer');

  const selectedFolder = allFolders.find(f => f.id === selectedFolderId);

// Remove derived allFolders since it's now passed as prop
  const allCategories = Array.from(new Set(savedRecipes.flatMap(r => r.categories || []))).sort();

  const getSortedRecipes = (recipes: Recipe[]) => {
    return [...recipes].sort((a, b) => {
      if (sortOrder === 'alphabetical') return a.title.localeCompare(b.title);
      if (sortOrder === 'most_used') return new Date(b.lastUsed || 0).getTime() - new Date(a.lastUsed || 0).getTime();
      if (sortOrder === 'category') {
        const catA = a.categories?.[0] || 'ZZZ';
        const catB = b.categories?.[0] || 'ZZZ';
        return catA.localeCompare(catB);
      }
      // default: newest
      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  };

  const searchResults = savedRecipes.filter(recipe => {
    if (!searchQuery) return false;
    const query = searchQuery.toLowerCase();
    const matchesTitle = recipe.title.toLowerCase().includes(query);
    const matchesIngredient = recipe.ingredients.some(i => i.name.toLowerCase().includes(query));
    const matchesCategory = recipe.categories?.some(c => c.toLowerCase().includes(query));
    return matchesTitle || matchesIngredient || matchesCategory;
  });

  const renderRecipeList = (recipes: Recipe[], emptyMessage: string, emptyHint?: string) => {
    if (recipes.length === 0) {
      return <LibraryEmptyState title={emptyMessage} hint={emptyHint} />;
    }

    return (
      <div className="space-y-4">
        {recipes.map((recipe) => (
          <div key={recipe.id}>
            <LibraryRecipeCard recipe={recipe} onOpen={onOpenRecipe} currentUser={currentUser} allFolders={allFolders} />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-4 pb-24 max-w-md mx-auto min-h-screen herbal-pattern">
      <div className="flex items-center gap-3 mb-8 pt-4">
        {activeSection !== 'home' && !searchQuery && (
          <button onClick={() => {
            if (selectedFolderId) setSelectedFolderId(null);
            else if (selectedCategory) setSelectedCategory(null);
            else setActiveSection('home');
          }} className="flex items-center gap-1 p-2 -ml-2 text-forest-mid dark:text-white/70 hover:bg-white/40 dark:hover:bg-white/10 rounded-full transition-colors glass-brushed">
            <ArrowLeft size={22} />
            <span className="text-sm font-medium pr-2">Tilbage</span>
          </button>
        )}
        <div className="flex items-center gap-2">
          <TreePine size={28} className="text-forest-dark dark:text-white" />
          <h1 className="text-3xl font-serif text-forest-dark dark:text-white tracking-tight italic text-engraved">Bibliotek</h1>
        </div>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-forest-mid dark:text-white/70 opacity-50" size={20} />
        <input 
          type="text" 
          placeholder="Søg i ingredienser, tags eller navn..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-10 py-4 glass-brushed rounded-[2rem] focus:outline-none focus:ring-2 focus:ring-forest-mid/10 focus:border-forest-mid/30 transition-all text-forest-dark dark:text-white placeholder-forest-mid/40 dark:placeholder-white/40 font-medium bg-white/60 dark:bg-black/20 border border-black/5 dark:border-white/10"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-forest-mid dark:text-white/70 hover:text-forest-dark dark:hover:text-white"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {searchQuery ? (
        <div>
          <h2 className="text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-[0.2em] mb-4 opacity-70 text-engraved">Søgeresultater</h2>
          {renderRecipeList(getSortedRecipes(searchResults), 'Ingen opskrifter matchede din søgning.')}
        </div>
      ) : activeSection === 'home' ? (
        <div className="grid grid-cols-1 gap-4">
          {savedRecipes.filter(r => r.folder === 'Ikke gemte').length > 0 && (
            <button 
              onClick={() => {
                const unsavedFolder = allFolders.find(f => f.name === 'Ikke gemte');
                if (unsavedFolder) {
                  setSelectedFolderId(unsavedFolder.id);
                  setActiveSection('cookbooks');
                }
              }}
              className="flex items-center justify-between p-6 glass-brushed rounded-[2.5rem] bg-heath-mid/10 border-heath-mid/20 hover:bg-heath-mid/20 transition-all group animate-pulse hover:animate-none"
            >
              <div className="flex items-center gap-5">
                <div className="p-4 bg-heath-mid text-white rounded-2xl shadow-md">
                  <Save size={24} />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-serif text-forest-dark dark:text-white italic text-engraved">Ikke gemte</h3>
                  <p className="text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-widest opacity-70">
                    {savedRecipes.filter(r => r.folder === 'Ikke gemte').length} nye opskrifter
                  </p>
                </div>
              </div>
              <ChevronRight size={20} className="text-forest-mid group-hover:translate-x-1 transition-transform" />
            </button>
          )}

          <button 
            onClick={() => setActiveSection('favorites')}
            className="flex items-center justify-between p-6 glass-brushed rounded-[2rem] hover:bg-white/60 transition-all group"
          >
            <div className="flex items-center gap-5">
              <div className="p-4 bg-sand text-forest-mid rounded-2xl shadow-sm border border-black/5">
                <Heart size={24} className="fill-current" />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-serif text-forest-dark dark:text-white italic text-engraved">Favoritter</h3>
                <p className="text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-widest opacity-50">{savedRecipes.filter(r => r.isFavorite).length} opskrifter</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-forest-mid group-hover:translate-x-1 transition-transform" />
          </button>

          <button 
            onClick={() => setActiveSection('cookbooks')}
            className="flex items-center justify-between p-6 glass-brushed rounded-[2rem] hover:bg-white/60 transition-all group"
          >
            <div className="flex items-center gap-5">
              <div className="p-4 bg-sand text-forest-mid rounded-2xl shadow-sm border border-black/5">
                <Book size={24} />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-serif text-forest-dark dark:text-white italic text-engraved">Kogebøger</h3>
                <p className="text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-widest opacity-50">{allFolders.length} mapper</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-forest-mid group-hover:translate-x-1 transition-transform" />
          </button>

          <button 
            onClick={() => setActiveSection('all')}
            className="flex items-center justify-between p-6 glass-brushed rounded-[2rem] hover:bg-white/60 transition-all group"
          >
            <div className="flex items-center gap-5">
              <div className="p-4 bg-sand text-forest-mid rounded-2xl shadow-sm border border-black/5">
                <List size={24} />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-serif text-forest-dark dark:text-white italic text-engraved">Alle opskrifter</h3>
                <p className="text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-widest opacity-50">{savedRecipes.length} opskrifter</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-forest-mid group-hover:translate-x-1 transition-transform" />
          </button>

          <button 
            onClick={() => setActiveSection('categories')}
            className="flex items-center justify-between p-6 glass-brushed rounded-[2rem] hover:bg-white/60 transition-all group"
          >
            <div className="flex items-center gap-5">
              <div className="p-4 bg-sand text-forest-mid rounded-2xl shadow-sm border border-black/5">
                <Tag size={24} />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-serif text-forest-dark dark:text-white italic text-engraved">Kategorier</h3>
                <p className="text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-widest opacity-50">{allCategories.length} tags</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-forest-mid group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      ) : activeSection === 'favorites' ? (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-serif text-forest-dark flex items-center gap-2 italic text-engraved"><Heart size={20} className="fill-current text-forest-mid"/> Favoritter</h2>
            <LibrarySortSelect value={sortOrder} onChange={setSortOrder} />
          </div>
          {renderRecipeList(getSortedRecipes(savedRecipes.filter(r => r.isFavorite)), 'Du har ingen favoritter endnu.', 'Tip: marker en opskrift som favorit fra opskriftssiden.')}
        </div>
      ) : activeSection === 'cookbooks' ? (
        selectedFolderId && selectedFolder ? (
          <div>
            {(() => {
              const folderOwnership = getFolderOwnershipDisplay(selectedFolder, currentUser);
              return (
                <>
            <div className="flex justify-between items-center mb-6">
              <div className="flex flex-col">
                <h2 className="text-2xl font-serif text-forest-dark dark:text-white flex items-center gap-2 italic text-engraved">
                  <Folder size={20} className="text-forest-mid dark:text-white/70"/> {selectedFolder.name}
                </h2>
                <div className="ml-7 mt-2 flex items-center gap-2">
                  <OwnershipBadge ownership={folderOwnership} />
                  <span className="text-xs text-forest-mid dark:text-white/70 opacity-70">{folderOwnership.detail}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {(selectedFolder.ownerUID === currentUser?.uid || selectedFolder.sharedWith?.some(s => s.uid === currentUser?.uid && s.role === 'editor')) && (
                  <button 
                    onClick={() => onCreateInFolder(selectedFolder)}
                    className="p-2 text-forest-mid dark:text-white/70 hover:bg-white/60 dark:hover:bg-white/10 glass-brushed rounded-xl transition-colors"
                    title="Opret ny opskrift i denne mappe"
                  >
                    <Plus size={18} />
                  </button>
                )}
                {selectedFolder.ownerUID === currentUser?.uid && (
                  <>
                    <button 
                      onClick={() => setShowShareModal(selectedFolder.id)}
                      className="p-2 text-forest-mid dark:text-white/70 hover:bg-white/60 dark:hover:bg-white/10 glass-brushed rounded-xl transition-colors"
                      title="Del mappe"
                    >
                      <Share2 size={18} />
                    </button>
                    <button 
                      onClick={() => {
                        setEditingFolderId(selectedFolder.id);
                        setEditFolderName(selectedFolder.name);
                      }} 
                      className="p-2 text-forest-mid dark:text-white/70 hover:bg-white/60 dark:hover:bg-white/10 glass-brushed rounded-xl transition-colors"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button 
                      onClick={() => setFolderIdToDelete(selectedFolder.id)} 
                      className="p-2 text-[#DC2626] hover:bg-white/60 dark:hover:bg-white/10 glass-brushed rounded-xl transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
                </>
              );
            })()}

            <div className="flex justify-end mb-6">
              <LibrarySortSelect value={sortOrder} onChange={setSortOrder} />
            </div>

            {editingFolderId === selectedFolder.id && (
              <div className="mb-8 flex gap-2">
                <input 
                  type="text" 
                  value={editFolderName}
                  onChange={e => setEditFolderName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && editFolderName.trim() && editFolderName !== selectedFolder.name) {
                      onRenameFolder(selectedFolder.id, editFolderName.trim());
                      setEditingFolderId(null);
                    } else if (e.key === 'Escape') {
                      setEditingFolderId(null);
                    }
                  }}
                  placeholder="Nyt mappenavn..."
                  className="flex-1 glass-brushed text-forest-dark dark:text-white text-sm rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-mid/10 dark:bg-black/20"
                  autoFocus
                />
                <button 
                  onClick={() => {
                    if (editFolderName.trim() && editFolderName !== selectedFolder.name) {
                      onRenameFolder(selectedFolder.id, editFolderName.trim());
                    }
                    setEditingFolderId(null);
                  }}
                  className="btn-botanical px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-widest"
                >
                  Gem
                </button>
              </div>
            )}

            {folderIdToDelete === selectedFolder.id && (
              <div className="mb-8 glass-brushed p-6 rounded-[2rem] border-red-100 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/10">
                <p className="text-sm text-forest-dark dark:text-white mb-4 font-medium">Er du sikker på at du vil slette denne mappe? Opskrifterne vil blive flyttet til "Opskrifter".</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      onDeleteFolder(selectedFolder.id);
                      setSelectedFolderId(null);
                      setFolderIdToDelete(null);
                    }}
                    className="bg-[#DC2626] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest shadow-sm"
                  >
                    Slet mappe
                  </button>
                  <button 
                    onClick={() => setFolderIdToDelete(null)}
                    className="glass-brushed text-forest-mid dark:text-white/70 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest"
                  >
                    Annuller
                  </button>
                </div>
              </div>
            )}

            {renderRecipeList(getSortedRecipes(savedRecipes.filter(r => r.folderId === selectedFolder.id || (r.folder === selectedFolder.name && !r.folderId))), 'Ingen opskrifter i denne mappe.')}
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif text-forest-dark dark:text-white flex items-center gap-2 italic text-engraved"><Book size={20} className="text-forest-mid dark:text-white/70"/> Kogebøger</h2>
              <button 
                onClick={() => setShowNewFolderInput(true)}
                className="text-xs font-bold uppercase tracking-widest text-forest-mid dark:text-white/70 flex items-center gap-1.5 glass-brushed px-3 py-2 rounded-xl hover:bg-white/60 dark:hover:bg-white/10 transition-all"
              >
                <Plus size={14} /> Ny mappe
              </button>
            </div>
            {showNewFolderInput && (
              <div className="mb-6 flex gap-2">
                <input 
                  type="text" 
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  placeholder="Mappenavn..."
                  className="flex-1 glass-brushed text-forest-dark dark:text-white text-sm rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-mid/10 dark:bg-black/20"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newFolderName.trim()) {
                      onCreateFolder(newFolderName.trim());
                      setNewFolderName('');
                      setShowNewFolderInput(false);
                    } else if (e.key === 'Escape') {
                      setShowNewFolderInput(false);
                      setNewFolderName('');
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    if (newFolderName.trim()) {
                      onCreateFolder(newFolderName.trim());
                      setNewFolderName('');
                      setShowNewFolderInput(false);
                    }
                  }}
                  className="btn-botanical px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-widest"
                >
                  Opret
                </button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {allFolders.filter(f => f.name !== 'Ikke gemte' || savedRecipes.some(r => r.folder === 'Ikke gemte')).map(folder => {
                const count = savedRecipes.filter(r => r.folderId === folder.id || (r.folder === folder.name && !r.folderId)).length;
                const isShared = folder.ownerUID !== currentUser?.uid;
                const folderOwnership = getFolderOwnershipDisplay(folder, currentUser);
                return (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedFolderId(folder.id)}
                    className="flex flex-col items-start p-6 glass-brushed rounded-[2rem] hover:bg-white/60 dark:hover:bg-white/10 transition-all text-left group relative"
                  >
                    <Folder size={28} className="text-forest-mid dark:text-white/70 mb-4 group-hover:scale-110 transition-transform" />
                    {isShared && (
                      <div className="absolute top-4 right-4 text-forest-mid dark:text-white/70 opacity-60">
                        <UserPlus size={14} />
                      </div>
                    )}
                    <span className="font-serif text-lg text-forest-dark dark:text-white line-clamp-1 italic text-engraved">{folder.name}</span>
                    <span className="text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-widest opacity-50 mt-1">{count} opskrifter</span>
                    <div className="mt-3">
                      <OwnershipBadge ownership={folderOwnership} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )
      ) : activeSection === 'all' ? (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-serif text-forest-dark dark:text-white flex items-center gap-2 italic text-engraved"><List size={20} className="text-forest-mid dark:text-white/70"/> Alle opskrifter</h2>
            <LibrarySortSelect value={sortOrder} onChange={setSortOrder} />
          </div>
          {renderRecipeList(getSortedRecipes(savedRecipes), 'Du har ingen opskrifter endnu.', 'Start med at importere en opskrift eller opret en ny i en mappe.')}
        </div>
      ) : activeSection === 'categories' ? (
        selectedCategory ? (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif text-forest-dark dark:text-white flex items-center gap-2 italic text-engraved"><Tag size={20} className="text-forest-mid dark:text-white/70"/> {selectedCategory}</h2>
              <LibrarySortSelect value={sortOrder} onChange={setSortOrder} />
            </div>
            {renderRecipeList(getSortedRecipes(savedRecipes.filter(r => r.categories?.includes(selectedCategory))), 'Ingen opskrifter i denne kategori.')}
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-serif text-forest-dark dark:text-white mb-6 flex items-center gap-2 italic text-engraved"><Tag size={20} className="text-forest-mid dark:text-white/70"/> Kategorier</h2>
            <div className="flex flex-wrap gap-3">
              {allCategories.map(cat => {
                const count = savedRecipes.filter(r => r.categories?.includes(cat)).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className="flex items-center gap-2 px-5 py-3 glass-brushed rounded-full hover:bg-white/60 dark:hover:bg-white/10 transition-all group"
                  >
                    <span className="text-sm font-medium text-forest-dark dark:text-white group-hover:text-forest-mid dark:group-hover:text-white/80 transition-colors">{cat}</span>
                    <span className="bg-white/60 dark:bg-white/10 text-forest-mid dark:text-white/70 text-xs font-bold px-2 py-0.5 rounded-full border border-black/5 dark:border-white/10">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )
      ) : null}
      {showShareModal ? (() => {
        const folder = allFolders.find(f => f.id === showShareModal);
        if (!folder) return null;
        return (
          <ShareFolderModal
            folder={folder}
            onClose={() => setShowShareModal(null)}
            onShare={onShareFolder}
          />
        );
      })() : null}
    </div>
  );
}
