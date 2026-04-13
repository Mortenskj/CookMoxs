import { Recipe } from '../types';
import { PlayCircle, FileText, Save, Clock, ChefHat, X, Flame } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ActiveViewProps {
  activeRecipe: Recipe | null;
  onNavigate: (view: any) => void;
  onSave: (recipe: Recipe) => void;
  onOpenRecipe: (recipe: Recipe) => void;
  onStopCooking: () => void;
}

export function ActiveView({ activeRecipe, onNavigate, onSave, onOpenRecipe, onStopCooking }: ActiveViewProps) {
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    setSaveState('idle');
  }, [activeRecipe?.id]);

  const handleSave = async () => {
    if (!activeRecipe || saveState === 'saving') return;

    setSaveState('saving');

    try {
      await Promise.resolve(onSave(activeRecipe));
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  };

  if (!activeRecipe) {
    return (
      <div className="p-4 pb-32 max-w-md mx-auto h-full flex flex-col items-center justify-center text-center min-h-screen">
        <div className="w-24 h-24 cm-surface-secondary rounded-full flex items-center justify-center mb-8 glass-brushed">
          <ChefHat size={48} className="text-forest-mid cm-light-surface-icon" />
        </div>
        <h2 className="text-3xl font-serif text-forest-dark cm-light-surface-ink mb-4 italic text-engraved">Intet i gang</h2>
        <p className="text-forest-mid cm-light-surface-ink-muted mb-10 max-w-xs italic leading-relaxed opacity-70 dark:opacity-100">
          Du har ikke nogen aktiv opskrift i øjeblikket. Importer en ny, eller åbn en opskrift fra biblioteket.
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
    <div className="p-4 pb-32 max-w-md mx-auto min-h-screen">
      <div className="flex items-center gap-2 mb-8 pt-4">
        <Flame size={28} className="text-forest-dark cm-light-surface-ink" />
        <h1 className="text-3xl font-serif text-forest-dark cm-light-surface-ink italic text-engraved">I gang</h1>
      </div>

      <div className="glass-brushed rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.05)] border border-black/5 dark:border-white/10 overflow-hidden mb-8">
        <div className="cm-surface-secondary p-8 border-b border-black/5 dark:border-white/10">
          <h2 className="text-2xl font-serif text-forest-dark cm-light-surface-ink mb-3 italic text-engraved">{activeRecipe.title}</h2>
          <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-forest-mid cm-light-surface-ink-muted">
            <span className="cm-surface-utility cm-light-surface-ink flex items-center gap-2 px-3 py-1 rounded-full">
              <Clock size={12} /> Aktiv nu
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
            className="w-full cm-surface-secondary text-forest-dark cm-light-surface-ink py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-white/60 dark:hover:bg-black/5 transition-all"
          >
            <FileText size={22} className="text-forest-mid cm-light-surface-icon" />
            <span className="font-serif text-lg italic">Se hele opskriften</span>
          </button>

          <div className="grid grid-cols-2 gap-3 pt-4">
            <button
              onClick={() => void handleSave()}
              disabled={saveState === 'saving'}
              className="flex-1 cm-surface-utility text-forest-mid cm-light-surface-ink py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/60 dark:hover:bg-black/5 transition-all text-xs font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              {saveState === 'saving' ? 'Gemmer...' : 'Gem'}
            </button>

            <button
              onClick={onStopCooking}
              className="flex-1 bg-red-50/50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-[#DC2626] dark:text-red-400 py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-red-100/50 dark:hover:bg-red-900/30 transition-all text-xs font-bold uppercase tracking-widest"
            >
              <X size={16} />
              Stop
            </button>
          </div>

          {saveState === 'saved' && (
            <div className="cm-inline-feedback cm-inline-feedback--success">
              Opskriften er gemt.
            </div>
          )}

          {saveState === 'error' && (
            <div className="cm-inline-feedback cm-inline-feedback--error">
              Kunne ikke gemme. Prøv igen.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
