import { Barcode, Link2, Search, ShieldAlert, Unlink2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNutritionToolsEnabled } from '../hooks/useNutritionToolsEnabled';
import type { RecipeNutritionAttachment } from '../types';
import {
  getNutritionStatus,
  lookupNutritionBarcode,
  searchNutritionProductsByText,
} from '../services/nutrition/nutritionClientService';
import type { NutritionLookupResult } from '../services/nutrition/nutritionLookupService';
import {
  createRecipeNutritionAttachment,
  getRecipeNutritionExplanation,
  getRecipeNutritionSummaryLine,
} from '../services/nutrition/recipeNutritionAttachmentService';

interface RecipeNutritionAttachmentCardProps {
  attachment?: RecipeNutritionAttachment;
  canAttach: boolean;
  canClear?: boolean;
  readOnlyMessage?: string | null;
  onAttach: (attachment: RecipeNutritionAttachment) => void;
  onClear: () => void;
}

type LookupMode = 'barcode' | 'text_search';

export function RecipeNutritionAttachmentCard({
  attachment,
  canAttach,
  canClear = canAttach,
  readOnlyMessage,
  onAttach,
  onClear,
}: RecipeNutritionAttachmentCardProps) {
  const { enabled: nutritionToolsEnabled } = useNutritionToolsEnabled();
  const [enabled, setEnabled] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [mode, setMode] = useState<LookupMode>('barcode');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NutritionLookupResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const status = await getNutritionStatus();
        if (!cancelled) {
          setEnabled(status.enabled);
        }
      } catch {
        if (!cancelled) {
          setEnabled(false);
        }
      } finally {
        if (!cancelled) {
          setLoadingStatus(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loadingStatus || !enabled || !nutritionToolsEnabled) {
    return null;
  }

  const handleLookup = async () => {
    if (!input.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const nextResult = mode === 'barcode'
        ? await lookupNutritionBarcode(input.trim())
        : await searchNutritionProductsByText(input.trim(), 4);
      setResult(nextResult);
    } catch (lookupError) {
      setResult(null);
      setError(lookupError instanceof Error ? lookupError.message : 'Produktdata kunne ikke hentes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mb-8 glass-brushed p-6 sm:p-8 rounded-[2.5rem] border border-black/5 dark:border-white/10">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-white/60 dark:bg-black/20 rounded-2xl border border-black/5 dark:border-white/10">
          <Link2 size={18} className="text-heath-mid" />
        </div>
        <div>
          <h3 className="font-serif text-xl text-forest-dark dark:text-white italic text-engraved">Produktdata til opskriften</h3>
          <p className="text-xs text-forest-mid dark:text-white/70 opacity-80">
            {getRecipeNutritionExplanation(attachment)}
          </p>
        </div>
      </div>

      {attachment ? (
        <div className="rounded-3xl border border-black/5 dark:border-white/10 bg-white/45 dark:bg-black/20 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-serif text-lg text-forest-dark dark:text-white italic">{attachment.title}</p>
              <p className="mt-1 text-xs text-forest-mid dark:text-white/70 opacity-75">
                {[attachment.brand, attachment.barcode].filter(Boolean).join(' · ') || 'Intet ekstra produkt-id'}
              </p>
            </div>
            {canClear && (
              <button
                onClick={onClear}
                className="inline-flex items-center gap-2 rounded-full border border-black/10 dark:border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-forest-mid dark:text-white/80 hover:bg-white/40 dark:hover:bg-white/10 transition-colors"
              >
                <Unlink2 size={14} />
                Fjern link
              </button>
            )}
          </div>
          <p className="mt-3 text-xs text-forest-mid dark:text-white/70 opacity-80">
            {getRecipeNutritionSummaryLine(attachment)}
          </p>
          {attachment.nutrition && (
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-forest-mid dark:text-white/80">
              <div className="rounded-2xl bg-white/55 dark:bg-black/20 px-3 py-3">kcal/100g: {attachment.nutrition.energyKcalPer100g ?? '-'}</div>
              <div className="rounded-2xl bg-white/55 dark:bg-black/20 px-3 py-3">Fedt: {attachment.nutrition.fatPer100g ?? '-'} g</div>
              <div className="rounded-2xl bg-white/55 dark:bg-black/20 px-3 py-3">Kulhydrat: {attachment.nutrition.carbsPer100g ?? '-'} g</div>
              <div className="rounded-2xl bg-white/55 dark:bg-black/20 px-3 py-3">Protein: {attachment.nutrition.proteinPer100g ?? '-'} g</div>
            </div>
          )}
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
            Vejledende produktdata pr. 100 g. Opskriftens ingredienser og portioner bliver ikke regnet om automatisk.
          </div>
          {attachment.provenance.sourceUrl && (
            <a
              href={attachment.provenance.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex text-xs font-bold uppercase tracking-widest text-heath-mid hover:underline"
            >
              Se kilde
            </a>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-black/10 dark:border-white/10 bg-white/35 dark:bg-black/10 p-5 text-sm text-forest-mid dark:text-white/80">
          Ingen produktdata er knyttet til denne opskrift endnu.
        </div>
      )}

      {!canAttach && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
          {readOnlyMessage || 'Gem opskriften foerst, hvis du vil knytte produktdata til den.'}
        </div>
      )}

      {canAttach && (
        <>
          <div className="mt-5 flex bg-white/40 dark:bg-black/10 rounded-2xl p-1.5 border border-black/5 dark:border-white/10">
            <button
              onClick={() => setMode('barcode')}
              className={`flex-1 px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-all ${mode === 'barcode' ? 'bg-forest-dark text-white shadow-sm' : 'text-forest-mid dark:text-white/70 hover:bg-white/40 dark:hover:bg-white/10'}`}
            >
              <Barcode size={14} /> Stregkode
            </button>
            <button
              onClick={() => setMode('text_search')}
              className={`flex-1 px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-all ${mode === 'text_search' ? 'bg-forest-dark text-white shadow-sm' : 'text-forest-mid dark:text-white/70 hover:bg-white/40 dark:hover:bg-white/10'}`}
            >
              <Search size={14} /> Produktsogning
            </button>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !loading) {
                  void handleLookup();
                }
              }}
              placeholder={mode === 'barcode' ? 'Fx 3017620422003' : 'Fx nutella'}
              className="flex-1 rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 px-4 py-3 text-sm text-forest-dark dark:text-white outline-none focus:border-forest-mid"
            />
            <button
              onClick={() => void handleLookup()}
              disabled={!input.trim() || loading}
              className="px-5 py-3 text-xs font-bold uppercase tracking-widest rounded-2xl bg-forest-dark text-white shadow-sm disabled:opacity-50"
            >
              {loading ? 'Soger...' : 'Find produkt'}
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-4 space-y-3">
              {result.items.length === 0 && (
                <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/40 dark:bg-black/10 p-4 text-sm text-forest-mid dark:text-white/80">
                  Ingen produkter fundet for denne sogning.
                </div>
              )}
              {result.items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/45 dark:bg-black/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-serif text-lg text-forest-dark dark:text-white italic">{item.title}</p>
                      <p className="mt-1 text-xs text-forest-mid dark:text-white/70 opacity-75">
                        {[item.brand, item.barcode].filter(Boolean).join(' · ') || 'Ingen ekstra produktinfo'}
                      </p>
                      <p className="mt-2 text-xs text-forest-mid dark:text-white/70 opacity-80">
                        {getRecipeNutritionSummaryLine(createRecipeNutritionAttachment(result, item))}
                      </p>
                    </div>
                    <button
                      onClick={() => onAttach(createRecipeNutritionAttachment(result, item))}
                      disabled={!canAttach}
                      className="rounded-full bg-forest-dark text-white px-4 py-2 text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                    >
                      Knyt til opskrift
                    </button>
                  </div>
                  {item.provenance.isFallback && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
                      <ShieldAlert size={12} />
                      Fallback-kilde
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
