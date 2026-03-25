import { Recipe } from '../types';
import { PlayCircle, PlusCircle, Settings, Clock, Sprout, BookOpen, Cloud, WifiOff, ChefHat } from 'lucide-react';

interface HomeViewProps {
  activeRecipe: Recipe | null;
  recentRecipes: Recipe[];
  onNavigate: (view: any) => void;
  onOpenRecipe: (recipe: Recipe) => void;
  totalRecipes: number;
  currentUser: any;
  isOnline: boolean;
}

export function HomeView({ activeRecipe, recentRecipes, onNavigate, onOpenRecipe, totalRecipes, currentUser, isOnline }: HomeViewProps) {
  return (
    <div className="p-4 pb-24 max-w-md mx-auto min-h-screen herbal-pattern">
      <div className="flex justify-between items-center mb-8 pt-4">
        <div className="flex items-center gap-2">
          <Sprout size={28} className="text-forest-dark dark:text-white" />
          <h1 className="text-3xl font-serif text-forest-dark dark:text-white tracking-tight italic text-engraved">CookMoxs</h1>
        </div>
        <button onClick={() => onNavigate('settings')} className="p-2 text-forest-mid dark:text-white/70 hover:bg-white/40 dark:hover:bg-white/10 rounded-full transition-colors glass-brushed">
          <Settings size={22} />
        </button>
      </div>

      {activeRecipe && (
        <section className="mb-10">
          <h2 className="text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-[0.2em] mb-4 opacity-70 text-engraved">I gang nu</h2>
          <div 
            onClick={() => onNavigate('active')}
            className="glass-brushed p-5 rounded-[2rem] cursor-pointer hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-500 group"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-serif text-forest-dark dark:text-white mb-2 group-hover:text-forest-mid dark:group-hover:text-white/80 transition-colors truncate">{activeRecipe.title}</h3>
                <p className="text-xs font-medium text-forest-mid dark:text-white/70 flex items-center gap-1.5 uppercase tracking-wider">
                  <PlayCircle size={14} className="animate-pulse" /> Fortsæt madlavning
                </p>
              </div>
            </div>
          </div>
        </section>
      )}


      {!activeRecipe && totalRecipes === 0 && (
        <section className="mb-10">
          <div className="glass-brushed p-6 rounded-[2rem] border border-black/5 shadow-sm bg-white/50">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 rounded-2xl bg-sand text-forest-mid border border-black/5">
                <ChefHat size={22} />
              </div>
              <div>
                <h2 className="text-xl font-serif italic text-forest-dark dark:text-white">Kom godt i gang</h2>
                <p className="text-sm text-forest-mid dark:text-white/70 leading-relaxed mt-1">CookMoxs er klar. Start med at importere din første opskrift, vælg dit niveau i køkkenet og gem dine egne favoritter efterhånden.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 mb-4">
              <div className="rounded-2xl bg-white/50 border border-black/5 p-4 flex items-start gap-3">
                <PlusCircle size={18} className="text-forest-mid mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-forest-dark">Importér din første opskrift</p>
                  <p className="text-xs text-forest-mid opacity-80">Fra link, tekst, PDF eller billede.</p>
                </div>
              </div>
              <div className="rounded-2xl bg-white/50 border border-black/5 p-4 flex items-start gap-3">
                <Settings size={18} className="text-forest-mid mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-forest-dark">Tilpas oplevelsen</p>
                  <p className="text-xs text-forest-mid opacity-80">Vælg køkkenniveau, tema og tekststørrelse til Cook mode.</p>
                </div>
              </div>
              <div className="rounded-2xl bg-white/50 border border-black/5 p-4 flex items-start gap-3">
                {isOnline ? <Cloud size={18} className="text-forest-mid mt-0.5" /> : <WifiOff size={18} className="text-forest-mid mt-0.5" />}
                <div>
                  <p className="text-sm font-semibold text-forest-dark">{currentUser ? 'Cloud er aktiv' : 'Brug lokalt eller log ind'}</p>
                  <p className="text-xs text-forest-mid opacity-80">{currentUser ? 'Dine opskrifter kan synkroniseres mellem enheder.' : 'Log ind med Google senere, hvis du vil have cloud-sync og backup i skyen.'}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => onNavigate('import')} className="btn-wood-light flex-1 p-4 rounded-[1.5rem] flex items-center justify-center gap-2">
                <PlusCircle size={18} className="text-forest-mid dark:text-white/70" />
                <span className="font-serif text-lg italic text-forest-dark dark:text-white">Start nu</span>
              </button>
              <button onClick={() => onNavigate('settings')} className="glass-brushed px-5 py-4 rounded-[1.5rem] flex items-center justify-center gap-2 border border-black/5">
                <BookOpen size={18} className="text-forest-mid dark:text-white/70" />
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="mb-10">
        <h2 className="text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-[0.2em] mb-4 opacity-70 text-engraved">Hurtig start</h2>
        <button 
          onClick={() => onNavigate('import')}
          className="btn-wood-light w-full p-5 rounded-[2rem] flex items-center justify-center gap-3"
        >
          <PlusCircle size={22} className="text-forest-mid dark:text-white/70" />
          <span className="font-serif text-xl italic text-forest-dark dark:text-white">Ny opskrift</span>
        </button>
      </section>

      {recentRecipes.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-[0.2em] mb-4 opacity-70 flex items-center gap-2 text-engraved">
            <Clock size={12} /> Senest brugte
          </h2>
          <div className="space-y-4">
            {recentRecipes.slice(0, 3).map(recipe => (
              <div 
                key={recipe.id}
                onClick={() => onOpenRecipe(recipe)}
                className="glass-brushed p-4 rounded-2xl cursor-pointer hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-300 flex justify-between items-center group"
              >
                <span className="font-medium text-forest-dark dark:text-white truncate pr-4 group-hover:translate-x-1 transition-transform">{recipe.title}</span>
                <span className="text-xs font-bold text-forest-mid dark:text-white/70 opacity-50 whitespace-nowrap uppercase tracking-wider">
                  {recipe.lastUsed ? new Date(recipe.lastUsed).toLocaleDateString('da-DK') : ''}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
