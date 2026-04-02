import { Eye, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import type {
  LearningFeedbackArea,
  LearningFeedbackValue,
  LearningProfileTransparencySnapshot,
} from '../services/learningProfileStore';
import {
  getLearningProfileTransparencySnapshot,
  LEARNING_PROFILE_CHANGED_EVENT,
} from '../services/learningProfileStore';

const AREA_LABELS: Record<LearningFeedbackArea, string> = {
  general: 'Generel oplevelse',
  import: 'Import',
  cook_mode: 'Cook mode',
  library: 'Bibliotek',
};

const VALUE_LABELS: Record<LearningFeedbackValue, string> = {
  positive: 'Hjælpsomt',
  neutral: 'Neutralt',
  negative: 'Ikke godt',
};

export function LearningProfileTransparencyCard() {
  const [snapshot, setSnapshot] = useState<LearningProfileTransparencySnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadSnapshot = async () => {
      const nextSnapshot = await getLearningProfileTransparencySnapshot();
      if (!cancelled) {
        setSnapshot(nextSnapshot);
      }
    };

    void loadSnapshot();

    const handleProfileChanged = () => {
      void loadSnapshot();
    };

    window.addEventListener(LEARNING_PROFILE_CHANGED_EVENT, handleProfileChanged);

    return () => {
      cancelled = true;
      window.removeEventListener(LEARNING_PROFILE_CHANGED_EVENT, handleProfileChanged);
    };
  }, []);

  if (!snapshot?.status.available) {
    return null;
  }

  return (
    <section className="glass-brushed p-8 rounded-[2.5rem]">
      <h2 className="text-xs font-bold text-forest-mid uppercase tracking-widest mb-6 flex items-center gap-3 opacity-60 text-engraved">
        <Eye size={14} /> Hvad modulet ved
      </h2>

      <div className="cm-surface-secondary rounded-2xl p-4">
        <p className="font-serif text-lg text-forest-dark italic">Forklarligt og gennemsigtigt</p>
        <p className="mt-2 text-xs text-forest-mid leading-relaxed opacity-80">
          Denne visning viser kun den eksplicitte feedback, du selv har valgt at gemme i denne browser. Der er ingen skjult score, ingen automatiske anbefalinger i dette step, og intet her bliver lagt ind i dine opskrifter eller backups.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-forest-mid">
        <div className="cm-surface-secondary rounded-2xl px-4 py-3">
          <p className="font-bold uppercase tracking-widest opacity-60">Feedback aktiv</p>
          <p className="mt-2 text-sm text-forest-dark">{snapshot.status.feedbackEnabled ? 'Ja' : 'Nej'}</p>
        </div>
        <div className="cm-surface-secondary rounded-2xl px-4 py-3">
          <p className="font-bold uppercase tracking-widest opacity-60">Lagring</p>
          <p className="mt-2 text-sm text-forest-dark">Kun lokal browser</p>
        </div>
        <div className="cm-surface-secondary rounded-2xl px-4 py-3">
          <p className="font-bold uppercase tracking-widest opacity-60">Feedbackposter</p>
          <p className="mt-2 text-sm text-forest-dark">{snapshot.feedbackEntryCount}</p>
        </div>
        <div className="cm-surface-secondary rounded-2xl px-4 py-3">
          <p className="font-bold uppercase tracking-widest opacity-60">Signaltyper</p>
          <p className="mt-2 text-sm text-forest-dark">{snapshot.record?.signalSources.join(', ') || 'Ingen endnu'}</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-900">
        <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-xs">
          <ShieldCheck size={14} />
          Grænser i dette step
        </div>
        <p className="mt-2">
          Modulet ser kun din eksplicitte feedback og eventuelle separate learning-signaler. Det skriver ikke ind i opskrifter, backup eller cloud-data i den nuværende beta.
        </p>
      </div>

      <div className="mt-5">
        <p className="font-serif text-lg text-forest-dark italic">Seneste eksplicitte feedback</p>
        {!snapshot.status.feedbackEnabled && (
          <p className="mt-2 text-sm text-forest-mid opacity-80">
            Feedback er slået fra, så der vises ingen aktiv learning-profil her.
          </p>
        )}
        {snapshot.status.feedbackEnabled && snapshot.recentFeedback.length === 0 && (
          <p className="mt-2 text-sm text-forest-mid opacity-80">
            Der er endnu ingen feedback gemt, selv om modulet er slået til.
          </p>
        )}
        {snapshot.recentFeedback.length > 0 && (
          <div className="mt-3 space-y-3">
            {snapshot.recentFeedback.map((entry, index) => (
              <div key={`${entry.createdAt}-${index}`} className="cm-surface-secondary rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-serif text-sm text-forest-dark italic">{AREA_LABELS[entry.area]}</p>
                    <p className="mt-1 text-xs text-forest-mid opacity-75">{VALUE_LABELS[entry.value]}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-forest-mid opacity-70">
                    {new Date(entry.createdAt).toLocaleString('da-DK')}
                  </span>
                </div>
                {entry.note && (
                  <p className="mt-3 text-sm text-forest-mid leading-relaxed">{entry.note}</p>
                )}
              </div>
            ))}
          </div>
        )}
        {snapshot.lastFeedbackAt && (
          <p className="mt-3 text-xs text-forest-mid opacity-70">
            Seneste registrering: {new Date(snapshot.lastFeedbackAt).toLocaleString('da-DK')}
          </p>
        )}
      </div>
    </section>
  );
}
