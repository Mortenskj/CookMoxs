import { MessageSquareHeart, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { LearningFeedbackArea, LearningFeedbackValue } from '../services/learningProfileStore';
import type { LearningSignalEventName } from '../config/learningSignalContract';
import {
  appendLearningFeedbackEntry,
  clearLearningProfileRecord,
  getLearningProfileStoreStatus,
  isLearningProfileFeedbackEnabled,
  setLearningProfileFeedbackEnabled,
} from '../services/learningProfileStore';

const FEEDBACK_AREAS: Array<{ value: LearningFeedbackArea; label: string; eventName: LearningSignalEventName; description: string }> = [
  { value: 'general', label: 'Generel oplevelse', eventName: 'module_enabled', description: 'Brug dette til overordnet feedback om appens nytte.' },
  { value: 'import', label: 'Import', eventName: 'recipe_import_succeeded', description: 'Fortæl om importflowet føles brugbart eller frustrerende.' },
  { value: 'cook_mode', label: 'Cook mode', eventName: 'cook_mode_completed', description: 'Fortæl om cook mode hjælper dig i praksis.' },
  { value: 'library', label: 'Bibliotek', eventName: 'recipe_saved', description: 'Fortæl om gemme- og biblioteksoverblikket føles godt.' },
];

export function LearningFeedbackCard() {
  const [enabled, setEnabled] = useState(false);
  const [area, setArea] = useState<LearningFeedbackArea>('general');
  const [value, setValue] = useState<LearningFeedbackValue>('positive');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const status = getLearningProfileStoreStatus();
    if (!status.available) {
      return;
    }
    setEnabled(isLearningProfileFeedbackEnabled());
  }, []);

  const selectedArea = FEEDBACK_AREAS.find((item) => item.value === area) || FEEDBACK_AREAS[0];

  const handleEnableChange = (nextEnabled: boolean) => {
    setLearningProfileFeedbackEnabled(nextEnabled);
    setEnabled(nextEnabled);
    setMessage(nextEnabled
      ? 'Eksplicit feedback er nu aktiv i denne browser. Det bruges kun som frivillig learning-feedback og bliver ikke sendt til cloud i dette step.'
      : 'Eksplicit feedback er slået fra, og lokal feedbackhistorik er ryddet.');

    if (!nextEnabled) {
      void clearLearningProfileRecord();
      setNote('');
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    setMessage(null);

    try {
      await appendLearningFeedbackEntry({
        area,
        eventName: selectedArea.eventName,
        value,
        note: note.trim() || undefined,
      });
      setNote('');
      setMessage('Tak. Din feedback er gemt lokalt som frivillig learning-feedback i denne browser og er ikke lagt ind i dine opskrifter eller cloud-data.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="glass-brushed p-8 rounded-[2.5rem] border border-black/5 shadow-sm bg-white/40">
      <h2 className="text-xs font-bold text-forest-mid uppercase tracking-widest mb-6 flex items-center gap-3 opacity-60 text-engraved">
        <MessageSquareHeart size={14} /> Frivillig feedback
      </h2>

      <div className="rounded-2xl border border-black/5 bg-white/50 p-4">
        <p className="font-serif text-lg text-forest-dark italic">Hjælp kun hvis du vil</p>
        <p className="mt-2 text-xs text-forest-mid leading-relaxed opacity-80">
          Denne feedback er frivillig, tydelig og lokal for denne browser. Den bruges ikke til skjult scoring, ligger ikke i dine opskrifter eller backups, og ændrer ikke automatisk dine opskrifter.
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-black/5 bg-white/50 p-4">
        <div>
          <p className="font-serif text-lg text-forest-dark italic">Aktiver eksplicit feedback</p>
          <p className="text-xs text-forest-mid opacity-75">Du kan slaa det til eller fra uden at påvirke resten af appen.</p>
        </div>
        <div className="flex bg-white/40 rounded-2xl p-1.5 border border-black/5 glass-brushed shadow-inner">
          <button
            onClick={() => handleEnableChange(false)}
            className={`px-4 py-2 rounded-xl transition-all text-xs font-bold uppercase tracking-widest ${!enabled ? 'bg-forest-dark text-white shadow-sm' : 'text-forest-mid hover:bg-white/40'}`}
          >
            Fra
          </button>
          <button
            onClick={() => handleEnableChange(true)}
            className={`px-4 py-2 rounded-xl transition-all text-xs font-bold uppercase tracking-widest ${enabled ? 'bg-forest-dark text-white shadow-sm' : 'text-forest-mid hover:bg-white/40'}`}
          >
            Til
          </button>
        </div>
      </div>

      {enabled && (
        <div className="mt-5 space-y-5">
          <div className="grid gap-3">
            {FEEDBACK_AREAS.map((item) => (
              <button
                key={item.value}
                onClick={() => setArea(item.value)}
                className={`p-4 rounded-2xl border transition-all text-left ${area === item.value ? 'border-forest-dark bg-white/70 shadow-md' : 'border-black/5 bg-white/20 hover:bg-white/40'}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-serif text-sm text-forest-dark italic">{item.label}</span>
                  {area === item.value && <span className="text-[10px] font-bold uppercase tracking-widest text-forest-dark">Valgt</span>}
                </div>
                <p className="text-xs text-forest-mid opacity-75">{item.description}</p>
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setValue('positive')}
              className={`flex-1 px-4 py-3 rounded-2xl border text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 ${value === 'positive' ? 'border-emerald-700 bg-emerald-50 text-emerald-800' : 'border-black/5 bg-white/40 text-forest-mid'}`}
            >
              <ThumbsUp size={14} /> Hjælpsomt
            </button>
            <button
              onClick={() => setValue('neutral')}
              className={`flex-1 px-4 py-3 rounded-2xl border text-xs font-bold uppercase tracking-widest ${value === 'neutral' ? 'border-slate-600 bg-slate-50 text-slate-700' : 'border-black/5 bg-white/40 text-forest-mid'}`}
            >
              Neutralt
            </button>
            <button
              onClick={() => setValue('negative')}
              className={`flex-1 px-4 py-3 rounded-2xl border text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 ${value === 'negative' ? 'border-rose-700 bg-rose-50 text-rose-800' : 'border-black/5 bg-white/40 text-forest-mid'}`}
            >
              <ThumbsDown size={14} /> Ikke godt
            </button>
          </div>

          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="Valgfri note: Hvad fungerede eller fungerede ikke?"
            className="w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm text-forest-dark outline-none focus:border-forest-mid"
          />

          <button
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="w-full px-5 py-3 text-xs font-bold uppercase tracking-widest rounded-2xl bg-forest-dark text-white shadow-sm disabled:opacity-50"
          >
            {saving ? 'Gemmer...' : 'Gem feedback lokalt'}
          </button>
        </div>
      )}

      {message && (
        <div className="mt-5 rounded-2xl border border-black/5 bg-white/50 p-4 text-sm text-forest-mid">
          {message}
        </div>
      )}
    </section>
  );
}
