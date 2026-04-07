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
  { value: 'general', label: 'Generel oplevelse', eventName: 'module_enabled', description: 'Brug dette til overordnet feedback om appen.' },
  { value: 'import', label: 'Import', eventName: 'recipe_import_succeeded', description: 'Fortæl om import fra links og kilder virker som forventet.' },
  { value: 'cook_mode', label: 'Cook mode', eventName: 'cook_mode_completed', description: 'Fortæl om cook mode hjælper, når du laver mad.' },
  { value: 'library', label: 'Bibliotek', eventName: 'recipe_saved', description: 'Fortæl om det er let at gemme og finde opskrifter.' },
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
      ? 'Eksplicit feedback er aktiv i denne browser. Den sendes ikke til cloud i dette step.'
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
      setMessage('Feedback er gemt lokalt i denne browser. Den påvirker ikke opskrifter eller cloud-data.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="glass-brushed p-8 rounded-[2.5rem]">
      <h2 className="cm-settings-section-heading">
        <MessageSquareHeart size={14} /> Frivillig feedback
      </h2>

      <div className="cm-surface-secondary rounded-2xl p-4">
        <p className="font-serif text-lg text-forest-dark italic">Kun hvis du vil hjælpe</p>
        <p className="mt-2 text-xs text-forest-mid leading-relaxed opacity-80">
          Feedback her er frivillig og lokal for denne browser. Den ændrer ikke automatisk dine opskrifter.
        </p>
      </div>

      <div className="cm-settings-row mt-5">
        <div className="cm-settings-copy">
          <p className="font-serif text-lg text-forest-dark italic">Aktiver eksplicit feedback</p>
          <p className="text-xs text-forest-mid opacity-75">Styrer om denne browser må gemme frivillig feedback.</p>
        </div>
        <div className="cm-settings-segmented">
          <button onClick={() => handleEnableChange(false)} data-active={!enabled} className="cm-settings-segment-button">
            Fra
          </button>
          <button onClick={() => handleEnableChange(true)} data-active={enabled} className="cm-settings-segment-button">
            Til
          </button>
        </div>
      </div>

      {enabled && (
        <div className="mt-5 space-y-5">
          <div className="grid gap-3">
            {FEEDBACK_AREAS.map((item) => {
              const selected = area === item.value;
              return (
                <button
                  key={item.value}
                  onClick={() => setArea(item.value)}
                  data-active={selected}
                  className="cm-settings-choice-card"
                >
                  {selected ? <span data-active className="cm-settings-choice-badge cm-settings-choice-card__badge">Aktiv</span> : null}
                  <div className="mb-1">
                    <span className="font-serif text-sm text-forest-dark italic cm-settings-choice-card__title">{item.label}</span>
                  </div>
                  <p className="text-xs text-forest-mid opacity-75">{item.description}</p>
                </button>
              );
            })}
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
            placeholder="Valgfri note: Hvad fungerede, og hvad gjorde ikke?"
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
        <div className="cm-surface-secondary mt-5 rounded-2xl p-4 text-sm text-forest-mid">
          {message}
        </div>
      )}
    </section>
  );
}
