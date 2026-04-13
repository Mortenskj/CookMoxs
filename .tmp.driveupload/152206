import { Barcode, Search, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNutritionToolsEnabled } from '../hooks/useNutritionToolsEnabled';
import {
  getNutritionStatus,
  lookupNutritionBarcode,
  searchNutritionProductsByText,
} from '../services/nutrition/nutritionClientService';
import type { NutritionLookupResult } from '../services/nutrition/nutritionLookupService';

interface NutritionLookupCardProps {
  isOnline?: boolean;
}

type LookupMode = 'barcode' | 'text_search';

export function NutritionLookupCard({ isOnline = true }: NutritionLookupCardProps) {
  const { enabled: nutritionToolsEnabled } = useNutritionToolsEnabled();
  const [status, setStatus] = useState<Awaited<ReturnType<typeof getNutritionStatus>> | null>(null);
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
        const nextStatus = await getNutritionStatus();
        if (!cancelled) {
          setStatus(nextStatus);
        }
      } catch {
        if (!cancelled) {
          setStatus(null);
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

  if (loadingStatus || !status?.enabled || !nutritionToolsEnabled) {
    return null;
  }

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const nextResult =
        mode === 'barcode'
          ? await lookupNutritionBarcode(input.trim())
          : await searchNutritionProductsByText(input.trim(), 5);
      setResult(nextResult);
    } catch (lookupError) {
      setResult(null);
      setError(lookupError instanceof Error ? lookupError.message : 'Produktsøgning fejlede.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="glass-brushed p-8 rounded-[2.5rem]">
      <h2 className="text-xs font-bold text-forest-mid uppercase tracking-widest mb-6 flex items-center gap-3 opacity-60 text-engraved">
        <Sparkles size={14} /> Ernæring og stregkode
      </h2>

      <div className="space-y-5">
        <div className="cm-surface-secondary rounded-2xl p-4">
          <p className="font-serif text-lg text-forest-dark italic">Tidlig beta for produktdata</p>
          <p className="mt-2 text-xs text-forest-mid opacity-80">
            Søg efter et produkt manuelt med stregkode eller tekst. Dette er kun opslag endnu og ændrer ikke dine opskrifter.
          </p>
          <p className="mt-2 text-xs text-forest-mid opacity-70">
            Primær kilde: {status.providers.find((provider) => provider.id === status.primaryProviderId)?.label || status.primaryProviderId}
          </p>
        </div>

        <div className="flex bg-white/40 rounded-2xl p-1.5 border border-black/5 glass-brushed shadow-inner">
          <button
            onClick={() => {
              setMode('barcode');
              setError(null);
              setResult(null);
            }}
            disabled={loading}
            className={`flex-1 px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${mode === 'barcode' ? 'bg-forest-dark text-white shadow-sm' : 'text-forest-mid hover:bg-white/40'}`}
          >
            <Barcode size={14} /> Stregkode
          </button>
          <button
            onClick={() => {
              setMode('text_search');
              setError(null);
              setResult(null);
            }}
            disabled={loading}
            className={`flex-1 px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${mode === 'text_search' ? 'bg-forest-dark text-white shadow-sm' : 'text-forest-mid hover:bg-white/40'}`}
          >
            <Search size={14} /> Produktsøgning
          </button>
        </div>

        {!isOnline && (
          <div className="cm-inline-feedback cm-inline-feedback--info">
            Produktsøgning kræver internetforbindelse.
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setError(null);
              if (result) {
                setResult(null);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !loading && isOnline) {
                void handleSubmit();
              }
            }}
            placeholder={mode === 'barcode' ? 'Fx 3017620422003' : 'Fx nutella'}
            className="flex-1 rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm text-forest-dark outline-none focus:border-forest-mid"
            disabled={loading || !isOnline}
          />
          <button
            onClick={() => void handleSubmit()}
            disabled={!input.trim() || loading || !isOnline}
            className="px-5 py-3 text-xs font-bold uppercase tracking-widest rounded-2xl bg-forest-dark text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Søger...' : mode === 'barcode' ? 'Find produkt' : 'Søg'}
          </button>
        </div>

        {loading && (
          <div className="cm-inline-feedback cm-inline-feedback--info">
            Søger efter produktdata...
          </div>
        )}

        {error && (
          <div className="cm-inline-feedback cm-inline-feedback--error">
            {error}
          </div>
        )}

        {result && result.items.length === 0 && (
          <div className="cm-inline-feedback cm-inline-feedback--info">
            Intet produkt fundet. Prøv en anden stregkode eller en kortere søgning.
          </div>
        )}

        {result && result.items.length > 0 && (
          <div className="space-y-3">
            <div className="cm-surface-secondary rounded-2xl p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-forest-mid opacity-60">
                {result.mode === 'barcode' ? 'Stregkodeopslag' : 'Produktsøgning'}
              </p>
              <p className="mt-2 text-sm text-forest-mid opacity-80">
                {result.items.length} resultat{result.items.length === 1 ? '' : 'er'} fundet
              </p>
              <p className="mt-1 text-xs text-forest-mid opacity-70">
                Kilde: {result.provenance.providerLabel} · Sikkerhed: {result.provenance.confidence}
                {result.provenance.isFallback ? ' · Fallback' : ''}
              </p>
            </div>

            {result.items.map((item) => (
              <div key={item.id} className="cm-surface-secondary rounded-2xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-serif text-lg text-forest-dark italic">{item.title}</p>
                    <p className="mt-1 text-xs text-forest-mid opacity-75">
                      {[item.brand, item.barcode].filter(Boolean).join(' · ') || 'Ingen ekstra produktinfo'}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${item.provenance.isFallback ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {item.provenance.isFallback ? 'Fallback' : item.provenance.providerLabel}
                  </span>
                </div>
                {item.nutrition && (
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-forest-mid">
                    <div className="rounded-xl bg-white/60 px-3 py-2">kcal/100 g: {item.nutrition.energyKcalPer100g ?? '—'}</div>
                    <div className="rounded-xl bg-white/60 px-3 py-2">Fedt: {item.nutrition.fatPer100g ?? '—'} g</div>
                    <div className="rounded-xl bg-white/60 px-3 py-2">Kulhydrat: {item.nutrition.carbsPer100g ?? '—'} g</div>
                    <div className="rounded-xl bg-white/60 px-3 py-2">Protein: {item.nutrition.proteinPer100g ?? '—'} g</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
