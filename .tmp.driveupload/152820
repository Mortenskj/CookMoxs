import { ArrowLeft, Info, Thermometer, Settings, LogIn, LogOut, User, Palette, Moon, Sun, ChefHat, Download, Upload, Cloud, Type, Sparkles } from 'lucide-react';
import { COOKING_LEVELS, LEVEL_META, type UserLevel } from '../config/cookingLevels';
import { COOK_FONT_META, COOK_FONT_SIZES, type CookFontSize } from '../config/cookDisplay';
import { IMPORT_PREFERENCE_OPTIONS, type ImportPreference } from '../config/importPreferences';
import { SEASONAL_THEME_OPTIONS } from '../config/seasonalThemes';
import { useNutritionToolsEnabled } from '../hooks/useNutritionToolsEnabled';
import { NutritionLookupCard } from './NutritionLookupCard';
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
  cookFontSize: CookFontSize;
  setCookFontSize: (size: CookFontSize) => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
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
      className={`relative inline-flex h-12 w-22 items-center rounded-full border border-black/5 p-1.5 transition-all shadow-inner ${
        enabled ? 'bg-forest-dark/85' : 'bg-white/70'
      }`}
    >
      <span
        className={`absolute top-1/2 h-9 w-9 -translate-y-1/2 rounded-full transition-all ${
          enabled ? 'left-[calc(100%-2.625rem)] bg-white shadow-md' : 'left-1.5 bg-forest-dark shadow-sm'
        }`}
      />
    </button>
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
  cookFontSize,
  setCookFontSize,
  onExportBackup,
  onImportBackup,
  lastBackupAt,
  cloudSyncStatus = 'idle',
  cloudSyncMessage,
  cloudLastSyncAt,
  authErrorMessage,
  appVersion,
  isOnline = true,
  aiDisabledReason,
}: SettingsViewProps) {
  const { enabled: nutritionToolsEnabled, setEnabled: setNutritionToolsEnabled } = useNutritionToolsEnabled();

  return (
    <div className="p-4 pb-32 max-w-md mx-auto min-h-screen herbal-pattern">
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
        <section className="glass-brushed p-8 rounded-[2.5rem] border border-black/5 shadow-sm bg-white/40">
          <h2 className="text-xs font-bold text-forest-mid uppercase tracking-widest mb-6 flex items-center gap-3 opacity-60 text-engraved">
            <User size={14} /> Konto
          </h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-serif text-lg text-forest-dark italic">Google Login</p>
              <p className="text-xs text-forest-mid italic opacity-70">
                {user ? `Logget ind som ${user.displayName || user.email}` : 'Log ind for at gemme og dele opskrifter'}
              </p>
            </div>
            <div className="flex">
              {user ? (
                <button
                  onClick={onLogout}
                  className="px-5 py-2 text-xs font-bold uppercase tracking-widest rounded-xl bg-forest-dark text-white shadow-sm flex items-center gap-2 hover:bg-forest-mid transition-colors"
                >
                  <LogOut size={14} /> Log ud
                </button>
              ) : (
                <button
                  onClick={onLogin}
                  className="px-5 py-2 text-xs font-bold uppercase tracking-widest rounded-xl bg-forest-dark text-white shadow-sm flex items-center gap-2 hover:bg-forest-mid transition-colors"
                >
                  <LogIn size={14} /> Log ind
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

        <section className="glass-brushed p-8 rounded-[2.5rem] border border-black/5 shadow-sm bg-white/40">
          <h2 className="text-xs font-bold text-forest-mid uppercase tracking-widest mb-6 flex items-center gap-3 opacity-60 text-engraved">
            <Cloud size={14} /> Data og backup
          </h2>

          <div className="space-y-5">
            <div className="rounded-2xl bg-white/50 border border-black/5 p-4">
              <p className="font-serif text-lg text-forest-dark italic mb-1">Cloud er synkronisering - ikke rigtig backup</p>
              <p className="text-xs text-forest-mid leading-relaxed opacity-80">
                Når du er logget ind, ligger dine data i skyen via Firestore. Men hvis noget bliver overskrevet eller slettet ved en fejl,
                er det stadig den samme aktuelle sandhed. Eksport giver dig et særskilt gendannelsespunkt.
              </p>
            </div>

            <div className="rounded-2xl border border-black/5 bg-white/50 p-4 flex items-start justify-between gap-4">
              <div>
                <p className="font-serif text-lg text-forest-dark italic mb-1">Cloud-status</p>
                <p className="text-xs text-forest-mid leading-relaxed opacity-80">
                  {cloudSyncMessage || (user ? 'Cloud aktiv' : 'Kun lokal lagring aktiv')}
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
              <button
                onClick={onExportBackup}
                className="flex-1 px-5 py-3 text-xs font-bold uppercase tracking-widest rounded-2xl bg-forest-dark text-white shadow-sm flex items-center justify-center gap-2 hover:bg-forest-mid transition-colors"
              >
                <Download size={14} /> Eksportér backup
              </button>
              <button
                onClick={onImportBackup}
                className="flex-1 px-5 py-3 text-xs font-bold uppercase tracking-widest rounded-2xl border border-black/10 text-forest-dark shadow-sm flex items-center justify-center gap-2 hover:bg-white/60 transition-colors"
              >
                <Upload size={14} /> Gendan backup
              </button>
            </div>

            <p className="text-xs text-forest-mid italic opacity-70">
              {lastBackupAt ? `Seneste eksport: ${new Date(lastBackupAt).toLocaleString('da-DK')}` : 'Ingen lokal backup eksporteret endnu i denne browser.'}
            </p>
          </div>
        </section>

        <section className="glass-brushed p-8 rounded-[2.5rem] border border-black/5 shadow-sm bg-white/40">
          <h2 className="text-xs font-bold text-forest-mid uppercase tracking-widest mb-6 flex items-center gap-3 opacity-60 text-engraved">
            <ChefHat size={14} /> Dit niveau i køkkenet
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {COOKING_LEVELS.map((level) => {
              const selected = userLevel === level;
              return (
                <button
                  key={level}
                  onClick={() => setUserLevel(level)}
                  className={`p-4 rounded-2xl border transition-all text-left ${selected ? 'border-forest-dark bg-white/70 shadow-md' : 'border-black/5 bg-white/20 hover:bg-white/40'}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-serif text-base text-forest-dark italic">{level}</span>
                    {selected && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-forest-dark">Aktiv</span>
                    )}
                  </div>
                  <p className="text-xs text-forest-mid leading-relaxed opacity-80">
                    {LEVEL_META[level].cookIntro}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="glass-brushed p-8 rounded-[2.5rem] border border-black/5 shadow-sm bg-white/40">
          <h2 className="text-xs font-bold text-forest-mid uppercase tracking-widest mb-6 flex items-center gap-3 opacity-60 text-engraved">
            <Palette size={14} /> Tema (Årstider)
          </h2>

          <div className="grid grid-cols-2 gap-4">
            {SEASONAL_THEME_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => setTheme(option.id)}
                className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${theme === option.id ? 'border-forest-dark bg-white/60 shadow-md' : 'border-black/5 bg-white/20 hover:bg-white/40'}`}
              >
                <div
                  className="w-12 h-12 rounded-full shadow-inner border border-black/10"
                  style={{ backgroundColor: option.swatch }}
                ></div>
                <span className="font-serif text-sm text-forest-dark italic">{option.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="glass-brushed p-8 rounded-[2.5rem] border border-black/5 shadow-sm bg-white/40">
          <h2 className="text-xs font-bold text-forest-mid uppercase tracking-widest mb-6 flex items-center gap-3 opacity-60 text-engraved">
            <Thermometer size={14} /> Præferencer
          </h2>

          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="font-serif text-lg text-forest-dark italic">Udseende</p>
              <p className="text-xs text-forest-mid italic opacity-70">Lyst eller mørkt tema</p>
            </div>
            <div className="flex bg-white/40 rounded-2xl p-1.5 border border-black/5 glass-brushed shadow-inner">
              <button
                onClick={() => onDarkModeChange(false)}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${!isDarkMode ? 'bg-forest-dark text-white shadow-sm' : 'text-forest-mid hover:bg-white/40'}`}
              >
                <Sun size={14} />
              </button>
              <button
                onClick={() => onDarkModeChange(true)}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${isDarkMode ? 'bg-forest-dark text-white shadow-sm' : 'text-forest-mid hover:bg-white/40'}`}
              >
                <Moon size={14} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-serif text-lg text-forest-dark italic">Temperatur</p>
              <p className="text-xs text-forest-mid italic opacity-70">Vælg din foretrukne enhed</p>
            </div>
            <div className="flex bg-white/40 rounded-2xl p-1.5 border border-black/5 glass-brushed shadow-inner">
              <button className="px-5 py-2 text-xs font-bold uppercase tracking-widest rounded-xl bg-forest-dark text-white shadow-sm">°C</button>
              <button className="px-5 py-2 text-xs font-bold uppercase tracking-widest rounded-xl text-forest-mid hover:bg-white/40 transition-all">°F</button>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-start gap-3 mb-4">
              <ChefHat size={14} className="text-forest-mid mt-1" />
              <div>
                <p className="font-serif text-lg text-forest-dark italic">Import med eller uden AI</p>
                <p className="text-xs text-forest-mid italic opacity-70">Vælg om opskriftimport skal forbedres automatisk eller holde sig til grundimport.</p>
              </div>
            </div>
            <div className="grid gap-3 mb-8">
              {IMPORT_PREFERENCE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setImportPreference(option.value)}
                  className={`p-4 rounded-2xl border transition-all text-left ${importPreference === option.value ? 'border-forest-dark bg-white/70 shadow-md' : 'border-black/5 bg-white/20 hover:bg-white/40'}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-serif text-sm text-forest-dark italic">{option.label}</span>
                    {importPreference === option.value && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-forest-dark">Aktiv</span>
                    )}
                  </div>
                  <p className="text-xs text-forest-mid opacity-75">{option.description}</p>
                </button>
              ))}
            </div>
            <div className="mb-8">
              <div className="flex items-start gap-3 mb-4">
                <Sparkles size={14} className="text-forest-mid mt-1" />
                <div>
                  <p className="font-serif text-lg text-forest-dark italic">AI-tilpas efter linkimport</p>
                  <p className="text-xs text-forest-mid italic opacity-70">Til test: kør altid en AI-berigelse oven på vellykket grundimport af links.</p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-white/50 p-4">
                <div>
                  <p className="font-serif text-lg text-forest-dark italic">{autoAiImportEnhancement ? 'Altid aktiv' : 'Kun grundimport'}</p>
                  <p className="text-xs text-forest-mid opacity-75">
                    Når den er slået til, kræver linkimport også en efterfølgende AI-tilpasning, så du kan teste hele importkæden.
                  </p>
                </div>
                <SettingsToggle
                  enabled={autoAiImportEnhancement}
                  onChange={setAutoAiImportEnhancement}
                />
              </div>
            </div>
            {aiDisabledReason && (
              <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-900">AI-status</p>
                <p className="mt-2 text-sm text-amber-900">{aiDisabledReason}</p>
                <p className="mt-2 text-xs text-amber-900/80">Linkimport med struktureret data, manuel oprettelse og cook mode virker stadig.</p>
              </div>
            )}

            <div className="mb-8">
              <div className="flex items-start gap-3 mb-4">
                <Sparkles size={14} className="text-forest-mid mt-1" />
                <div>
                  <p className="font-serif text-lg text-forest-dark italic">Ernæring og stregkode</p>
                  <p className="text-xs text-forest-mid italic opacity-70">Slå produktopslag og opskriftsnær nutrition til eller fra i denne browser.</p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-white/50 p-4">
                <div>
                  <p className="font-serif text-lg text-forest-dark italic">{nutritionToolsEnabled ? 'Modul aktivt' : 'Modul skjult'}</p>
                  <p className="text-xs text-forest-mid opacity-75">
                    Når modulet er slået fra, skjules nutrition-opslag i Indstillinger og på opskriftssiden.
                  </p>
                </div>
                <SettingsToggle
                  enabled={nutritionToolsEnabled}
                  onChange={setNutritionToolsEnabled}
                />
              </div>
            </div>

            <div className="flex items-start gap-3 mb-4">
              <Type size={14} className="text-forest-mid mt-1" />
              <div>
                <p className="font-serif text-lg text-forest-dark italic">Tekst i cook mode</p>
                <p className="text-xs text-forest-mid italic opacity-70">Vælg en fast tekststørrelse til madlavningstrin</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {COOK_FONT_SIZES.map((size) => (
                <button
                  key={size}
                  onClick={() => setCookFontSize(size)}
                  className={`p-4 rounded-2xl border transition-all text-left ${cookFontSize === size ? 'border-forest-dark bg-white/70 shadow-md' : 'border-black/5 bg-white/20 hover:bg-white/40'}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-serif text-sm text-forest-dark italic">{COOK_FONT_META[size].label}</span>
                    <span className="text-xs font-bold uppercase tracking-widest text-forest-mid">{COOK_FONT_META[size].preview}</span>
                  </div>
                  <p className="text-xs text-forest-mid opacity-75">Forhåndsvisning i ca. {COOK_FONT_META[size].px}px</p>
                </button>
              ))}
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

        <section className="glass-brushed p-8 rounded-[2.5rem] border border-black/5 shadow-sm bg-white/40">
          <h2 className="text-xs font-bold text-forest-mid uppercase tracking-widest mb-6 flex items-center gap-3 opacity-60 text-engraved">
            <Info size={14} /> Om appen
          </h2>

          <div className="space-y-5 text-sm text-forest-dark leading-relaxed font-serif italic">
            <div className="rounded-2xl border border-black/5 bg-white/50 p-4 not-italic">
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
              Når en opskrift angiver varme (f.eks. "Induktion - 5"), antager vi, at du bruger et standard induktionskomfur (skala 1-9).
            </p>
            <p className="opacity-80">
              Appen er designet til at gøre det nemt at importere opskrifter fra nettet, tilpasse dem til dine behov, og have en rolig, fokuseret oplevelse, når du står i køkkenet.
            </p>
          </div>
        </section>

        <HouseholdSettingsCard user={user} isOnline={isOnline} />
        <LearningFeedbackCard />
        <LearningProfileTransparencyCard />
        {nutritionToolsEnabled ? <NutritionLookupCard isOnline={isOnline} /> : null}
      </div>
    </div>
  );
}
