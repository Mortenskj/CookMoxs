import { Recipe } from '../types';
import { PlayCircle, FileText, Save, Clock, ChefHat, X, Flame } from 'lucide-react';

interface ActiveViewProps {
  activeRecipe: Recipe | null;
  onNavigate: (view: any) => void;
  onSave: (recipe: Recipe) => void;
  onOpenRecipe: (recipe: Recipe) => void;
}

export function ActiveView({ activeRecipe, onNavigate, onSave, onOpenRecipe }: ActiveViewProps) {
  if (!activeRecipe) {
    return (
      <div className="p-4 pb-32 max-w-md mx-auto h-full flex flex-col items-center justify-center text-center min-h-screen herbal-pattern dark:text-white">
        <div className="w-24 h-24 bg-white/60 dark:bg-black/40 rounded-full flex items-center justify-center mb-8 border border-black/5 dark:border-white/10 shadow-sm glass-brushed">
          <ChefHat size={48} className="text-forest-mid dark:text-white/70" />
        </div>
        <h2 className="text-3xl font-serif text-forest-dark dark:text-white mb-4 italic text-engraved">Intet i gang</h2>
        <p className="text-forest-mid dark:text-white/60 mb-10 max-w-xs italic leading-relaxed opacity-70">
          Du har ikke nogen aktiv opskrift i øjeblikket. Find en i biblioteket eller importer en ny.
        </p>
        <button 
          onClick={() => onNavigate('import')}
          className="btn-botanical px-10 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-md"
        >
          Ny opskrift
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 pb-32 max-w-md mx-auto min-h-screen herbal-pattern dark:text-white">
      <div className="flex items-center gap-2 mb-8 pt-4">
        <Flame size={28} className="text-forest-dark dark:text-white" />
        <h1 className="text-3xl font-serif text-forest-dark dark:text-white italic text-engraved">I gang</h1>
      </div>
      
      <div className="glass-brushed rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.05)] border border-black/5 dark:border-white/10 overflow-hidden mb-8">
        <div className="bg-white/40 dark:bg-black/40 p-8 border-b border-black/5 dark:border-white/10">
          <h2 className="text-2xl font-serif text-forest-dark dark:text-white mb-3 italic text-engraved">{activeRecipe.title}</h2>
          <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-forest-mid dark:text-white/70">
            <span className="flex items-center gap-2 bg-white/60 dark:bg-black/40 px-3 py-1 rounded-full border border-black/5 dark:border-white/10 shadow-sm">
              <Clock size={12} className="animate-pulse" /> Aktiv nu
            </span>
          </div>
        </div>
        
        <div className="p-8 space-y-4">
          <button 
            onClick={() => onNavigate('cook')}
            className="btn-botanical w-full py-5 rounded-2xl flex items-center justify-center gap-3 shadow-md"
          >
            <PlayCircle size={22} />
            <span className="font-serif text-xl italic">Fortsæt madlavning</span>
          </button>
          
          <button 
            onClick={() => onOpenRecipe(activeRecipe)}
            className="w-full glass-brushed text-forest-dark dark:text-white py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-white/60 dark:hover:bg-white/10 transition-all border border-black/5 dark:border-white/10 shadow-sm"
          >
            <FileText size={22} className="text-forest-mid dark:text-white/70" />
            <span className="font-serif text-lg italic">Se hele opskriften</span>
          </button>
          
          <div className="grid grid-cols-2 gap-3 pt-4">
            <button 
              onClick={() => onSave(activeRecipe)}
              className="flex-1 glass-brushed text-forest-mid dark:text-white/70 py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/60 dark:hover:bg-white/10 transition-all border border-black/5 dark:border-white/10 text-xs font-bold uppercase tracking-widest"
            >
              <Save size={16} />
              Gem
            </button>

            <button 
              onClick={() => onNavigate('home')}
              className="flex-1 bg-red-50/50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-[#DC2626] dark:text-red-400 py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-red-100/50 dark:hover:bg-red-900/30 transition-all text-xs font-bold uppercase tracking-widest"
            >
              <X size={16} />
              Stop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
