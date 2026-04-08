import { ArrowLeft, Info, Thermometer, Settings, LogIn, LogOut, User, Palette, Moon, Sun, ChefHat, Download, Upload, Cloud, Type, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { COOKING_LEVELS, type UserLevel } from '../config/cookingLevels';
import { COOK_FONT_META, COOK_FONT_SIZES, type CookFontSize } from '../config/cookDisplay';
import { IMPORT_PREFERENCE_OPTIONS, type ImportPreference } from '../config/importPreferences';
import { SEASONAL_THEME_OPTIONS } from '../config/seasonalThemes';
import { useNutritionToolsEnabled } from '../hooks/useNutritionToolsEnabled';
import { useRecipeNutritionEstimateVisible } from '../hooks/useRecipeNutritionEstimateVisible';
import { useRecipeNutritionVisible } from '../hooks/useRecipeNutritionVisible';
import { useRecipeNutritionExpandedByDefault } from '../hooks/useRecipeNutritionExpandedByDefault';
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

      <div className="space-y-8">
        <section className="cm-settings-card">
          <h2 className="cm-settings-section-heading">
            <User size={14} /> Konto
          </h2>

          <div className="cm-settings-row">
            <div className="cm-settings-copy">
              <p className="font-serif text-lg text-forest-dark italic">Google-login</p>
              <p className="text-xs text-forest-mid italic opacity-70">
                {user ? `Logget ind som ${user.displayName || user.email}` : 'Giver synkronisering, deling og gendannelse på tværs af dine enheder.'}
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

        <section className="cm-settings-card">
          <h2 className="cm-settings-section-heading">
            <Cloud size={14} /> Data og backup
          </h2>

          <div className="space-y-5">
            <div className="cm-surface-secondary rounded-2xl p-4">
              <p className="font-serif text-lg text-forest-dark italic mb-1">Cloud er synkronisering, ikke backup</p>
              <p className="text-xs text-forest-mid leading-relaxed opacity-80">
                Cloud holder den aktuelle version opdateret. Eksport er den version, du kan gemme som sikkerhedskopi.
              </p>
            </div>

            <div className="cm-settings-row items-start">
              <div className="cm-settings-copy">
                <p className="font-serif text-lg text-forest-dark italic mb-1">Cloud-status</p>
                <p className="text-xs text-forest-mid leading-relaxed opacity-80">
                  {cloudSyncMessage || (user ? 'Denne browser synkroniserer med cloud.' : 'Denne browser gemmer kun lokalt.')}
                </p>
                <p className="text-xs text-forest-mid leading-relaxed opacity-70 mt-2">
                  Netværk: {isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${cloudSyncStatus === 'saved' ? 'bg-emerald-100 text-emerald-800' : cloudSyncStatus === 'syncing' ? 'bg-amber-100 text-amber-800' : cloudSyncStatus === 'error' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'}`}>
                {cloudSyncStatus === 'saved' ? 'OK' : cloudSyncStatus === 'syncing' ? 'Arbejder' : cloudSyncStatus === 'error' ? 'Fejl' : 'Lokal'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={onExportBackup} className="btn-heath flex-1 disabled:opacity-50 disabled:cursor-not-allowed" disabled={Boolean(backupAction)}>
                <Download size={14} /> {backupAction === 'export' ? 'Eksporterer...' : 'Eksportér backup'}
              </button>
              <button onClick={onImportBackup} className="btn-wood-light flex-1 disabled:opacity-50 disabled:cursor-not-allowed" disabled={Boolean(backupAction)}>
                <Upload size={14} /> {backupAction === 'import' ? 'Gendanner...' : 'Gendan backup'}
              </button>
            </div>

            <p className="text-xs text-forest-mid italic opacity-70">
              {lastBackupAt ? `Seneste eksport: ${new Date(lastBackupAt).toLocaleString('da-DK')}` : 'Ingen backup er eksporteret endnu i denne browser.'}
            </p>
          </div>
        </section>

        <section className="cm-settings-card">
          <div className="cm-settings-section-heading-row">
            <h2 className="cm-settings-section-heading !mb-0">
              <ChefHat size={14} /> Dit niveau i køkkenet
            </h2>
            <button
              type="button"
              onClick={() => setShowLevelHelp(true)}
              className="cm-settings-inline-help"
              aria-label="Sådan virker niveauerne i køkkenet"
            >
              <Info size={14} />
            </button>
          </div>
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
        </section>

        <section className="cm-settings-card">
          <h2 className="cm-settings-section-heading">
            <Palette size={14} /> Tema og årstid
          </h2>

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
        </section>

        <section className="cm-settings-card">
          <h2 className="cm-settings-section-heading">
            <Thermometer size={14} /> Præferencer
          </h2>

          <div className="cm-settings-row mb-8">
            <div className="cm-settings-copy">
              <p className="font-serif text-lg text-forest-dark italic">Udseende</p>
              <p className="text-xs text-forest-mid italic opacity-70">Gælder hele appen i denne browser.</p>
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

          <div className="cm-settings-row">
            <div className="cm-settings-copy">
              <p className="font-serif text-lg text-forest-dark italic">Temperatur</p>
              <p className="text-xs text-forest-mid italic opacity-70">Styrer hvordan temperatur vises i opskrifter og cook mode.</p>
            </div>
            <div className="cm-settings-segmented">
              <button data-active className="cm-settings-segment-button">°C</button>
              <button className="cm-settings-segment-button">°F</button>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-start gap-3 mb-4">
              <ChefHat size={14} className="text-forest-mid mt-1" />
              <div>
                <p className="font-serif text-lg text-forest-dark italic">Import med eller uden AI</p>
                <p className="text-xs text-forest-mid italic opacity-70">Styrer hvor meget hjælp linkimport må bruge i denne browser.</p>
              </div>
            </div>
            <div className="grid gap-3 mb-8">
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

            <div className="mb-8">
              <div className="flex items-start gap-3 mb-4">
                <Sparkles size={14} className="text-forest-mid mt-1" />
                <div>
                  <p className="font-serif text-lg text-forest-dark italic">AI efter linkimport</p>
                  <p className="text-xs text-forest-mid italic opacity-70">Styrer om linkimport også må køre et ekstra AI-trin bagefter.</p>
                </div>
              </div>
              <div className="cm-settings-row">
                <div className="cm-settings-copy">
                  <p className="font-serif text-lg text-forest-dark italic">{autoAiImportEnhancement ? 'AI-forbedring aktiv' : 'Kun grundimport'}</p>
                  <p className="text-xs text-forest-mid opacity-75">
                    Til: linkimport prøver også AI bagefter. Fra: import stopper efter grundimport, hvis siden allerede virker.
                  </p>
                </div>
                <SettingsToggle enabled={autoAiImportEnhancement} onChange={setAutoAiImportEnhancement} />
              </div>
            </div>

            {aiDisabledReason && (
              <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-900">AI-status</p>
                <p className="mt-2 text-sm text-amber-900">{aiDisabledReason}</p>
                <p className="mt-2 text-xs text-amber-900/80">Import med struktureret data, manuel oprettelse og cook mode virker stadig uden AI.</p>
              </div>
            )}

            <div className="mb-8">
              <div className="flex items-start gap-3 mb-4">
                <Sparkles size={14} className="text-forest-mid mt-1" />
                <div>
                  <p className="font-serif text-lg text-forest-dark italic">Ernæring og stregkode</p>
                  <p className="text-xs text-forest-mid italic opacity-70">Gælder kun i denne browser.</p>
                </div>
              </div>
              <div className="cm-settings-row">
                <div className="cm-settings-copy">
                  <p className="font-serif text-lg text-forest-dark italic">{nutritionToolsEnabled ? 'Funktion aktiv' : 'Funktion skjult'}</p>
                  <p className="text-xs text-forest-mid opacity-75">
                    Til: opskriftssider kan vise produktdata, stregkodeopslag og AI-makroestimat. Fra: de elementer skjules.
                  </p>
                </div>
                <SettingsToggle enabled={nutritionToolsEnabled} onChange={setNutritionToolsEnabled} />
              </div>

              {nutritionToolsEnabled && (
                <>
                  <div className="cm-settings-row cm-settings-row--subtle mt-4">
                    <div className="cm-settings-copy">
                      <p className="font-serif text-lg text-forest-dark italic">{recipeNutritionVisible ? 'Produktdata vises' : 'Produktdata skjules'}</p>
                      <p className="text-xs text-forest-mid opacity-75">Styrer om produktdata kan vises på opskriftssider.</p>
                    </div>
                    <SettingsToggle enabled={recipeNutritionVisible} onChange={setRecipeNutritionVisible} />
                  </div>

                  {recipeNutritionVisible && (
                    <div className="cm-settings-row cm-settings-row--subtle mt-4">
                      <div className="cm-settings-copy">
                        <p className="font-serif text-lg text-forest-dark italic">{recipeNutritionEstimateVisible ? 'AI-makroestimat vises' : 'AI-makroestimat skjules'}</p>
                        <p className="text-xs text-forest-mid opacity-75">Styrer om AI-kortet med kcal og makroer kan vises på opskriftssider.</p>
                      </div>
                      <SettingsToggle enabled={recipeNutritionEstimateVisible} onChange={setRecipeNutritionEstimateVisible} />
                    </div>
                  )}

                  {recipeNutritionVisible && (
                    <div className="cm-settings-row cm-settings-row--subtle mt-4">
                      <div className="cm-settings-copy">
                        <p className="font-serif text-lg text-forest-dark italic">{recipeNutritionExpandedByDefault ? 'Produktdata starter åbent' : 'Produktdata starter lukket'}</p>
                        <p className="text-xs text-forest-mid opacity-75">Gælder kun når produktdata er synligt på opskriftssiden.</p>
                      </div>
                      <SettingsToggle enabled={recipeNutritionExpandedByDefault} onChange={setRecipeNutritionExpandedByDefault} />
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex items-start gap-3 mb-4">
              <Type size={14} className="text-forest-mid mt-1" />
              <div>
                <p className="font-serif text-lg text-forest-dark italic">Forberedelses-trin i cook mode</p>
                <p className="text-xs text-forest-mid italic opacity-70">Styrer om cook mode starter med et trin til at finde og klargøre ingredienser.</p>
              </div>
            </div>
            <div className="cm-settings-row mb-8">
              <div className="cm-settings-copy">
                <p className="font-serif text-lg text-forest-dark italic">{includePrep ? 'Forberedelses-trin aktivt' : 'Forberedelses-trin skjult'}</p>
                <p className="text-xs text-forest-mid opacity-75">
                  Til: cook mode starter med et ekstra forberedelsestrin. Fra: cook mode går direkte til første tilberedningstrin.
                </p>
              </div>
              <SettingsToggle enabled={includePrep} onChange={setIncludePrep} />
            </div>

            <div className="flex items-start gap-3 mb-4">
              <Type size={14} className="text-forest-mid mt-1" />
              <div>
                <p className="font-serif text-lg text-forest-dark italic">Tekst i cook mode</p>
                <p className="text-xs text-forest-mid italic opacity-70">Styrer tekststørrelsen for trin og hjælpetekst i cook mode.</p>
              </div>
            </div>
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
                    <p className="cm-settings-choice-card__description text-xs text-forest-mid opacity-75">Vises som cirka {COOK_FONT_META[size].px}px i cook mode.</p>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <SupportInfoCard
          appVersion={appVersion}
          isOnline={isOnline}
          hasCloudAccount={Boolean(user)}
          cloudSyncStatus={cloudSyncStatus}
          cloudSyncMessage={cloudSyncMessage}
          cloudLastSyncAt={cloudLastSyncAt}
          aiDisabledReason={aiDisabledReason}
        />

        <section className="cm-settings-card">
          <h2 className="cm-settings-section-heading">
            <Info size={14} /> Om appen
          </h2>

          <div className="space-y-5 text-sm text-forest-dark leading-relaxed font-serif italic">
            <div className="cm-surface-secondary rounded-2xl p-4 not-italic">
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

            <p>
              <strong className="text-forest-dark not-italic font-bold text-xs uppercase tracking-widest">CookMoxs v1 Showcase</strong> er din personlige madlavningsassistent.
            </p>
            <p className="opacity-80">
              Når en opskrift angiver varme, for eksempel &quot;Induktion - 5&quot;, antager appen et standard induktionskomfur på skala 1-9.
            </p>
            <p className="opacity-80">
              Appen er lavet til at importere opskrifter, tilpasse dem og gøre cook mode rolig at bruge i praksis.
            </p>
          </div>
        </section>

        <HouseholdSettingsCard user={user} isOnline={isOnline} />
        <LearningFeedbackCard />
        <LearningProfileTransparencyCard />
      </div>

      {showLevelHelp && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/35 p-4 backdrop-blur-sm sm:items-center">
          <div className="glass-brushed w-full max-w-md rounded-[2rem] border border-black/5 bg-white/95 p-6 shadow-2xl dark:border-white/10 dark:bg-[#1A221E]/96">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="cm-settings-section-heading !mb-3">
                  <ChefHat size={14} /> Niveau i køkkenet
                </p>
                <h3 className="font-serif text-2xl italic text-forest-dark dark:text-white">Sådan virker niveauerne</h3>
                <p className="mt-2 text-sm text-forest-mid dark:text-white/80">
                  Niveauet påvirker især cook mode og AI-hjælp: hvor detaljerede trin er, hvor meget køkkensprog der bruges, og hvor meget hjælp der gives undervejs.
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
