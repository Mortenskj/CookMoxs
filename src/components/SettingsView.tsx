import { ArrowLeft, Info, Thermometer, Settings, LogIn, LogOut, User, Palette, Moon, Sun, ChefHat, Download, Upload, Cloud, Type, Sparkles, X, ChevronDown, UtensilsCrossed, BookOpen, Beaker, Eye, EyeOff, Copy, Trash2, Smartphone } from 'lucide-react';
import React, { useState } from 'react';
import { COOKING_LEVELS, type UserLevel } from '../config/cookingLevels';
import { COOK_FONT_META, COOK_FONT_SIZES, type CookFontSize } from '../config/cookDisplay';
import { IMPORT_PREFERENCE_OPTIONS, type ImportPreference } from '../config/importPreferences';
import { SEASONAL_THEME_OPTIONS } from '../config/seasonalThemes';
import { useNutritionToolsEnabled } from '../hooks/useNutritionToolsEnabled';
import { useRecipeNutritionEstimateVisible } from '../hooks/useRecipeNutritionEstimateVisible';
import { useRecipeNutritionVisible } from '../hooks/useRecipeNutritionVisible';
import { useRecipeNutritionExpandedByDefault } from '../hooks/useRecipeNutritionExpandedByDefault';
import { useFlavorBoostsVisible } from '../hooks/useFlavorBoostsVisible';
import { useWakeLockEnabled } from '../hooks/useWakeLockEnabled';
import { useSessionErrorLog, exportSessionErrorLog } from '../hooks/useSessionErrorLog';
import { HouseholdSettingsCard } from './HouseholdSettingsCard';
import { LearningFeedbackCard } from './LearningFeedbackCard';
import { LearningProfileTransparencyCard } from './LearningProfileTransparencyCard';
import { SupportInfoCard } from './SupportInfoCard';

interface SettingsViewProps {
  onBack: () => void;
  user: any;
  onLogin: () => void;
  onLogout: () => void;
  theme: string;
  setTheme: (theme: string) => void;
  isDarkMode: boolean;
  onDarkModeChange: (isDark: boolean) => void;
  userLevel: UserLevel;
  setUserLevel: (level: UserLevel) => void;
  importPreference: ImportPreference;
  setImportPreference: (value: ImportPreference) => void;
  autoAiImportEnhancement: boolean;
  setAutoAiImportEnhancement: (value: boolean) => void;
  includePrep: boolean;
  setIncludePrep: (value: boolean) => void;
  cookFontSize: CookFontSize;
  setCookFontSize: (size: CookFontSize) => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
  authAction?: 'login' | 'logout' | null;
  backupAction?: 'export' | 'import' | null;
  lastBackupAt?: string | null;
  cloudSyncStatus?: 'idle' | 'syncing' | 'saved' | 'error';
  cloudSyncMessage?: string | null;
  cloudLastSyncAt?: string | null;
  authErrorMessage?: string | null;
  appVersion?: string;
  isOnline?: boolean;
  aiDisabledReason?: string | null;
}

interface SettingsToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  enabledLabel?: string;
  disabledLabel?: string;
}

function SettingsToggle({
  enabled,
  onChange,
  enabledLabel = 'Til',
  disabledLabel = 'Fra',
}: SettingsToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={enabled ? enabledLabel : disabledLabel}
      onClick={() => onChange(!enabled)}
      data-state={enabled ? 'on' : 'off'}
      className="cm-settings-toggle"
    >
      <span className="cm-settings-toggle-thumb" />
    </button>
  );
}

const LEVEL_CARD_SUMMARY: Record<UserLevel, string> = {
  Begynder: 'Mere guidet og forklarende.',
  'Hverdags kok': 'Praktisk hjælp i et roligt tempo.',
  'Erfaren amatør': 'Mindre forklaring, mere køkkenflow.',
  Professionel: 'Kortfattet med høj faglig antagelse.',
};

const LEVEL_HELP_CONTENT: Array<{
  level: UserLevel;
  meaning: string;
  effect: string;
}> = [
  {
    level: 'Begynder',
    meaning: 'Mest guidet niveau med tydelige trin og mere hjælp undervejs.',
    effect: 'Giver flere forklaringer, mindre fagsprog og mere hjælp i cook mode og AI-forslag.',
  },
  {
    level: 'Hverdags kok',
    meaning: 'Praktisk niveau med klare trin og kun den vigtigste støtte.',
    effect: 'Holder instruktionerne korte, men forklarer stadig timing, varme og faldgruber tydeligt.',
  },
  {
    level: 'Erfaren amatør',
    meaning: 'Mere flydende opskriftsstil med færre forklarende stop.',
    effect: 'Antager mere køkkenerfaring, bruger mere køkkensprog og gør cook mode mere kompakt.',
  },
  {
    level: 'Professionel',
    meaning: 'Korteste og mest implicitte niveau.',
    effect: 'Antager høj erfaring, bruger fagsprog mere direkte og skærer hjælpetekst og forklaringer ned.',
  },
];

function SectionAccordion({ title, icon, children, defaultOpen = false }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="cm-settings-card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 py-1"
      >
        <h2 className="cm-settings-section-heading !mb-0 flex items-center gap-2">
          {icon} {title}
        </h2>
        <ChevronDown size={18} className={`text-forest-mid transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="mt-4">{children}</div>}
    </section>
  );
}

export function SettingsView({
  onBack,
  user,
  onLogin,
  onLogout,
  theme,
  setTheme,
  isDarkMode,
  onDarkModeChange,
  userLevel,
  setUserLevel,
  importPreference,
  setImportPreference,
  autoAiImportEnhancement,
  setAutoAiImportEnhancement,
  includePrep,
  setIncludePrep,
  cookFontSize,
  setCookFontSize,
  onExportBackup,
  onImportBackup,
  authAction = null,
  backupAction = null,
  lastBackupAt,
  cloudSyncStatus = 'idle',
  cloudSyncMessage,
  cloudLastSyncAt,
  authErrorMessage,
  appVersion,
  isOnline = true,
  aiDisabledReason,
}: SettingsViewProps) {
  const [showLevelHelp, setShowLevelHelp] = useState(false);
  const { enabled: nutritionToolsEnabled, setEnabled: setNutritionToolsEnabled } = useNutritionToolsEnabled();
  const { visible: recipeNutritionVisible, setVisible: setRecipeNutritionVisible } = useRecipeNutritionVisible();
  const { visible: recipeNutritionEstimateVisible, setVisible: setRecipeNutritionEstimateVisible } = useRecipeNutritionEstimateVisible();
  const { expandedByDefault: recipeNutritionExpandedByDefault, setExpandedByDefault: setRecipeNutritionExpandedByDefault } = useRecipeNutritionExpandedByDefault();
  const { visible: flavorBoostsVisible, setVisible: setFlavorBoostsVisible } = useFlavorBoostsVisible();
  const { enabled: wakeLockEnabled, setEnabled: setWakeLockEnabled } = useWakeLockEnabled();
  const { errors: sessionErrors, clear: clearSessionErrors } = useSessionErrorLog();
  const [copiedLog, setCopiedLog] = useState(false);

  return (
    <div className="p-4 pb-32 max-w-md mx-auto min-h-screen">
      <div className="flex items-center gap-4 mb-10 pt-4">
        <button onClick={onBack} className="flex items-center gap-1 p-3 text-forest-mid hover:bg-white/60 rounded-full transition-all glass-brushed border border-black/5 shadow-sm">
          <ArrowLeft size={20} />
          <span className="text-sm font-medium pr-2">Tilbage</span>
        </button>
        <div className="flex items-center gap-2">
          <Settings size={28} className="text-forest-dark" />
          <h1 className="text-3xl font-serif text-forest-dark italic text-engraved">Indstillinger</h1>
        </div>
      </div>

      <div className="space-y-4">

        {/* ─── KONTO ─── */}
        <section className="cm-settings-card">
          <h2 className="cm-settings-section-heading">
            <User size={14} /> Konto
          </h2>

          <div className="cm-settings-row">
            <div className="cm-settings-copy">
              <p className="font-serif text-lg text-forest-dark italic">Google-login</p>
              <p className="text-xs text-forest-mid italic opacity-70">
                {user ? `Logget ind som ${user.displayName || user.email}` : 'Log ind for cloud-sync og deling.'}
              </p>
            </div>
            <div className="flex">
              {user ? (
                <button onClick={onLogout} className="btn-heath disabled:opacity-50 disabled:cursor-not-allowed" disabled={Boolean(authAction)}>
                  <LogOut size={14} /> {authAction === 'logout' ? 'Logger ud...' : 'Log ud'}
                </button>
              ) : (
                <button onClick={onLogin} className="btn-heath disabled:opacity-50 disabled:cursor-not-allowed" disabled={Boolean(authAction)}>
                  <LogIn size={14} /> {authAction === 'login' ? 'Logger ind...' : 'Log ind'}
                </button>
              )}
            </div>
          </div>

          {authErrorMessage ? (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-800">
              {authErrorMessage}
            </p>
          ) : null}
        </section>

        {/* ─── GENERELT ─── */}
        <SectionAccordion title="Generelt" icon={<Palette size={14} />} defaultOpen>
          <div className="cm-settings-row mb-6">
            <div className="cm-settings-copy">
              <p className="font-serif text-lg text-forest-dark italic">Udseende</p>
              <p className="text-xs text-forest-mid italic opacity-70">Lys eller mørk tilstand.</p>
            </div>
            <div className="cm-settings-segmented">
              <button onClick={() => onDarkModeChange(false)} data-active={!isDarkMode} className="cm-settings-segment-button">
                <Sun size={14} />
              </button>
              <button onClick={() => onDarkModeChange(true)} data-active={isDarkMode} className="cm-settings-segment-button">
                <Moon size={14} />
              </button>
            </div>
          </div>

          <div className="cm-settings-row mb-6">
            <div className="cm-settings-copy">
              <p className="font-serif text-lg text-forest-dark italic">Temperatur</p>
              <p className="text-xs text-forest-mid italic opacity-70">Hvordan temperatur vises i opskrifter.</p>
            </div>
            <div className="cm-settings-segmented">
              <button data-active className="cm-settings-segment-button">°C</button>
              <button className="cm-settings-segment-button">°F</button>
            </div>
          </div>

          <div>
            <p className="font-serif text-lg text-forest-dark italic mb-3">Tema og årstid</p>
            <div className="grid grid-cols-2 gap-4">
              {SEASONAL_THEME_OPTIONS.map((option) => {
                const selected = theme === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => setTheme(option.id)}
                    data-active={selected}
                    className="cm-settings-choice-card cm-settings-choice-card--centered cm-settings-choice-card--theme flex flex-col items-center gap-2"
                  >
                    {selected ? <span data-active className="cm-settings-choice-badge cm-settings-choice-card__badge">AKTIV</span> : null}
                    <div
                      data-active={selected}
                      className="cm-settings-theme-swatch"
                      style={{ backgroundColor: option.swatch }}
                    />
                    <span className="font-serif text-sm text-forest-dark italic cm-settings-choice-card__title">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </SectionAccordion>

        {/* ─── IMPORT ─── */}
        <SectionAccordion title="Import" icon={<Download size={14} />}>
          <div className="mb-6">
            <div className="cm-settings-section-heading-row">
              <p className="font-serif text-lg text-forest-dark italic">Dit niveau i køkkenet</p>
              <button
                type="button"
                onClick={() => setShowLevelHelp(true)}
                className="cm-settings-inline-help"
                aria-label="Sådan virker niveauerne i køkkenet"
              >
                <Info size={14} />
              </button>
            </div>
            <p className="text-xs text-forest-mid italic opacity-70 mb-4">Påvirker AI-tone og detaljeniveau i hele appen.</p>
            <div className="grid grid-cols-2 gap-4">
              {COOKING_LEVELS.map((level) => {
                const selected = userLevel === level;
                return (
                  <button
                    key={level}
                    onClick={() => setUserLevel(level)}
                    data-active={selected}
                    className="cm-settings-choice-card cm-settings-choice-card--level"
                  >
                    {selected ? <span data-active className="cm-settings-choice-badge cm-settings-choice-card__badge">AKTIV</span> : null}
                    <div className="mb-2">
                      <span className="font-serif text-base text-forest-dark italic cm-settings-choice-card__title">{level}</span>
                    </div>
                    <p className="cm-settings-choice-card__description text-xs text-forest-mid leading-relaxed opacity-80">
                      {LEVEL_CARD_SUMMARY[level]}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-6">
            <p className="font-serif text-lg text-forest-dark italic mb-1">Import med eller uden AI</p>
            <p className="text-xs text-forest-mid italic opacity-70 mb-4">Styrer hvor meget hjælp linkimport må bruge.</p>
            <div className="grid gap-3">
              {IMPORT_PREFERENCE_OPTIONS.map((option) => {
                const selected = importPreference === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setImportPreference(option.value)}
                    data-active={selected}
                    className="cm-settings-choice-card"
                  >
                    {selected ? <span data-active className="cm-settings-choice-badge cm-settings-choice-card__badge">AKTIV</span> : null}
                    <div className="mb-1">
                      <span className="font-serif text-sm text-forest-dark italic cm-settings-choice-card__title">{option.label}</span>
                    </div>
                    <p className="cm-settings-choice-card__description text-xs text-forest-mid opacity-75">{option.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="cm-settings-row">
            <div className="cm-settings-copy">
              <p className="font-serif text-lg text-forest-dark italic">{autoAiImportEnhancement ? 'AI-forbedring aktiv' : 'Kun grundimport'}</p>
              <p className="text-xs text-forest-mid opacity-75">
                Til: linkimport kører også AI bagefter. Fra: stopper efter grundimport.
              </p>
            </div>
            <SettingsToggle enabled={autoAiImportEnhancement} onChange={setAutoAiImportEnhancement} />
          </div>

          {aiDisabledReason && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-900">AI-status</p>
              <p className="mt-2 text-sm text-amber-900">{aiDisabledReason}</p>
            </div>
          )}
        </SectionAccordion>

        {/* ─── OPSKRIFTER ─── */}
        <SectionAccordion title="Opskrifter" icon={<BookOpen size={14} />}>
          <div className="cm-settings-row mb-4">
            <div className="cm-settings-copy">
              <p className="font-serif text-lg text-forest-dark italic">Smagsboostere og faldgruber</p>
              <p className="text-xs text-forest-mid opacity-75">Vis eller skjul smagsboostere og faldgruber på opskrifter.</p>
            </div>
            <SettingsToggle enabled={flavorBoostsVisible} onChange={setFlavorBoostsVisible} />
          </div>

          <div className="cm-settings-row mb-4">
            <div className="cm-settings-copy">
              <p className="font-serif text-lg text-forest-dark italic">Ernæring og stregkode</p>
              <p className="text-xs text-forest-mid opacity-75">
                Vis produktdata, stregkodeopslag og AI-makroestimat.
              </p>
            </div>
            <SettingsToggle enabled={nutritionToolsEnabled} onChange={setNutritionToolsEnabled} />
          </div>

          {nutritionToolsEnabled && (
            <>
              <div className="cm-settings-row cm-settings-row--subtle mb-4">
                <div className="cm-settings-copy">
                  <p className="font-serif text-lg text-forest-dark italic">{recipeNutritionVisible ? 'Produktdata vises' : 'Produktdata skjules'}</p>
                  <p className="text-xs text-forest-mid opacity-75">Styrer om produktdata vises på opskriftssider.</p>
                </div>
                <SettingsToggle enabled={recipeNutritionVisible} onChange={setRecipeNutritionVisible} />
              </div>

              {recipeNutritionVisible && (
                <div className="cm-settings-row cm-settings-row--subtle mb-4">
                  <div className="cm-settings-copy">
                    <p className="font-serif text-lg text-forest-dark italic">{recipeNutritionEstimateVisible ? 'AI-makroestimat vises' : 'AI-makroestimat skjules'}</p>
                    <p className="text-xs text-forest-mid opacity-75">AI-kortet med kcal og makroer.</p>
                  </div>
                  <SettingsToggle enabled={recipeNutritionEstimateVisible} onChange={setRecipeNutritionEstimateVisible} />
                </div>
              )}

              {recipeNutritionVisible && (
                <div className="cm-settings-row cm-settings-row--subtle">
                  <div className="cm-settings-copy">
                    <p className="font-serif text-lg text-forest-dark italic">{recipeNutritionExpandedByDefault ? 'Produktdata starter åbent' : 'Produktdata starter lukket'}</p>
                    <p className="text-xs text-forest-mid opacity-75">Om produktdata er udfoldet som standard.</p>
                  </div>
                  <SettingsToggle enabled={recipeNutritionExpandedByDefault} onChange={setRecipeNutritionExpandedByDefault} />
                </div>
              )}
            </>
          )}
        </SectionAccordion>

        {/* ─── COOK MODE ─── */}
        <SectionAccordion title="Cook Mode" icon={<UtensilsCrossed size={14} />}>
          <div className="cm-settings-row mb-6">
            <div className="cm-settings-copy">
              <p className="font-serif text-lg text-forest-dark italic">{wakeLockEnabled ? 'Skærm forbliver tændt' : 'Skærm slukker normalt'}</p>
              <p className="text-xs text-forest-mid opacity-75">
                Hold skærmen tændt mens du er i cook mode.
              </p>
            </div>
            <SettingsToggle enabled={wakeLockEnabled} onChange={setWakeLockEnabled} />
          </div>

          <div className="cm-settings-row mb-6">
            <div className="cm-settings-copy">
              <p className="font-serif text-lg text-forest-dark italic">{includePrep ? 'Forberedelses-trin aktivt' : 'Forberedelses-trin skjult'}</p>
              <p className="text-xs text-forest-mid opacity-75">
                Start cook mode med et forberedelsestrin til ingrediensoversigt.
              </p>
            </div>
            <SettingsToggle enabled={includePrep} onChange={setIncludePrep} />
          </div>

          <div>
            <p className="font-serif text-lg text-forest-dark italic mb-3">Tekststørrelse</p>
            <p className="text-xs text-forest-mid italic opacity-70 mb-4">Størrelsen på trin og hjælpetekst i cook mode.</p>
            <div className="grid grid-cols-2 gap-3">
              {COOK_FONT_SIZES.map((size) => {
                const selected = cookFontSize === size;
                return (
                  <button
                    key={size}
                    onClick={() => setCookFontSize(size)}
                    data-active={selected}
                    className="cm-settings-choice-card cm-settings-choice-card--compact"
                  >
                    {selected ? <span data-active className="cm-settings-choice-badge cm-settings-choice-card__badge">AKTIV</span> : null}
                    <div className="mb-1">
                      <span className="font-serif text-sm text-forest-dark italic cm-settings-choice-card__title">{COOK_FONT_META[size].label}</span>
                    </div>
                    <p className="cm-settings-choice-card__description text-xs text-forest-mid opacity-75">Ca. {COOK_FONT_META[size].px}px</p>
                  </button>
                );
              })}
            </div>
          </div>
        </SectionAccordion>

        {/* ─── HUSSTANDE ─── */}
        <HouseholdSettingsCard user={user} isOnline={isOnline} />

        {/* ─── DATA & BACKUP ─── */}
        <SectionAccordion title="Data og backup" icon={<Cloud size={14} />}>
          <div className="cm-surface-secondary rounded-2xl p-4 mb-4">
            <p className="font-serif text-base text-forest-dark italic mb-1">Cloud er synkronisering, ikke backup</p>
            <p className="text-xs text-forest-mid leading-relaxed opacity-80">
              Cloud holder den aktuelle version opdateret. Eksport er din sikkerhedskopi.
            </p>
          </div>

          <div className="cm-settings-row items-start mb-4">
            <div className="cm-settings-copy">
              <p className="font-serif text-lg text-forest-dark italic mb-1">Cloud-status</p>
              <p className="text-xs text-forest-mid leading-relaxed opacity-80">
                {cloudSyncMessage || (user ? 'Synkroniserer med cloud.' : 'Gemmer kun lokalt.')}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${cloudSyncStatus === 'saved' ? 'bg-emerald-100 text-emerald-800' : cloudSyncStatus === 'syncing' ? 'bg-amber-100 text-amber-800' : cloudSyncStatus === 'error' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'}`}>
              {cloudSyncStatus === 'saved' ? 'OK' : cloudSyncStatus === 'syncing' ? 'Arbejder' : cloudSyncStatus === 'error' ? 'Fejl' : 'Lokal'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <button onClick={onExportBackup} className="btn-heath flex-1 disabled:opacity-50 disabled:cursor-not-allowed" disabled={Boolean(backupAction)}>
              <Download size={14} /> {backupAction === 'export' ? 'Eksporterer...' : 'Eksportér backup'}
            </button>
            <button onClick={onImportBackup} className="btn-wood-light flex-1 disabled:opacity-50 disabled:cursor-not-allowed" disabled={Boolean(backupAction)}>
              <Upload size={14} /> {backupAction === 'import' ? 'Gendanner...' : 'Gendan backup'}
            </button>
          </div>

          <p className="text-xs text-forest-mid italic opacity-70">
            {lastBackupAt ? `Seneste eksport: ${new Date(lastBackupAt).toLocaleString('da-DK')}` : 'Ingen backup eksporteret endnu.'}
          </p>
        </SectionAccordion>

        {/* ─── BETA / DEV ─── */}
        <SectionAccordion title="Beta og info" icon={<Beaker size={14} />}>
          <div className="cm-surface-secondary rounded-2xl p-4 not-italic mb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-forest-mid">Version</p>
                <p className="text-sm text-forest-dark mt-1">CookMoxs {appVersion || 'dev'}</p>
                <p className="text-xs text-forest-mid opacity-80 mt-2">Netværk: {isOnline ? 'Online' : 'Offline'}</p>
                <p className="text-xs text-forest-mid opacity-80 mt-1">Seneste cloud-sync: {cloudLastSyncAt ? new Date(cloudLastSyncAt).toLocaleString('da-DK') : '—'}</p>
              </div>
              <span className="shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-700">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          <SupportInfoCard
            appVersion={appVersion}
            isOnline={isOnline}
            hasCloudAccount={Boolean(user)}
            cloudSyncStatus={cloudSyncStatus}
            cloudSyncMessage={cloudSyncMessage}
            cloudLastSyncAt={cloudLastSyncAt}
            aiDisabledReason={aiDisabledReason}
          />

          <div className="mt-4">
            <LearningFeedbackCard />
          </div>
          <div className="mt-4">
            <LearningProfileTransparencyCard />
          </div>

          {/* Session error log */}
          <div className="cm-surface-secondary rounded-2xl p-4 mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-widest text-forest-mid">Session-fejllog</p>
              <div className="flex gap-2">
                {sessionErrors.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(exportSessionErrorLog());
                        setCopiedLog(true);
                        setTimeout(() => setCopiedLog(false), 2000);
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg bg-forest-mid/10 text-forest-mid hover:bg-forest-mid/20 transition-colors"
                    >
                      <Copy size={12} /> {copiedLog ? 'Kopieret!' : 'Kopiér'}
                    </button>
                    <button
                      type="button"
                      onClick={clearSessionErrors}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                    >
                      <Trash2 size={12} /> Ryd
                    </button>
                  </>
                )}
              </div>
            </div>
            {sessionErrors.length === 0 ? (
              <p className="text-xs text-forest-mid opacity-70 italic">Ingen fejl i denne session.</p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1 mt-2">
                {sessionErrors.map((e, i) => (
                  <div key={i} className="text-[11px] text-forest-dark font-mono leading-snug bg-white/50 dark:bg-black/10 rounded-lg px-2 py-1">
                    <span className="text-forest-mid opacity-60">{new Date(e.timestamp).toLocaleTimeString('da-DK')}</span>
                    {e.action && <span className="text-heath-mid ml-1">({e.action})</span>}
                    {e.code && <span className="text-amber-700 ml-1">[{e.code}]</span>}
                    <span className="ml-1">{e.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 space-y-3 text-sm text-forest-dark leading-relaxed font-serif italic">
            <p>
              <strong className="text-forest-dark not-italic font-bold text-xs uppercase tracking-widest">CookMoxs v1 Showcase</strong> er din personlige madlavningsassistent.
            </p>
            <p className="opacity-80">
              Når en opskrift angiver varme, for eksempel &quot;Induktion - 5&quot;, antager appen et standard induktionskomfur på skala 1-9.
            </p>
          </div>
        </SectionAccordion>

      </div>

      {showLevelHelp && (
        <div className="cm-dialog-backdrop fixed inset-0 z-[110] flex items-end justify-center bg-black/35 p-4 backdrop-blur-sm sm:items-center">
          <div className="cm-dialog-surface glass-brushed w-full max-w-md rounded-[2rem] border border-black/5 bg-white/95 p-6 shadow-2xl dark:border-white/10 dark:bg-[#1A221E]/96">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="cm-settings-section-heading !mb-3">
                  <ChefHat size={14} /> Niveau i køkkenet
                </p>
                <h3 className="font-serif text-2xl italic text-forest-dark dark:text-white">Sådan virker niveauerne</h3>
                <p className="mt-2 text-sm text-forest-mid dark:text-white/80">
                  Niveauet påvirker cook mode og AI-hjælp: detaljeniveau, køkkensprog og hjælp undervejs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLevelHelp(false)}
                className="cm-icon-button shrink-0"
                aria-label="Luk forklaring om niveauer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {LEVEL_HELP_CONTENT.map((item) => (
                <div key={item.level} className="cm-settings-panel cm-settings-panel--subtle">
                  <p className="font-serif text-lg italic text-forest-dark dark:text-white">{item.level}</p>
                  <p className="mt-1 text-sm text-forest-mid dark:text-white/80">{item.meaning}</p>
                  <p className="mt-2 text-xs text-forest-mid/85 dark:text-white/70">{item.effect}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
