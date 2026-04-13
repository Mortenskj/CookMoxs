import { Copy, Info, LifeBuoy } from 'lucide-react';
import { useState } from 'react';
import { SUPPORT_INFO } from '../config/supportInfo';
import { buildSupportDiagnosticsSnapshot, buildSupportReportText } from '../services/supportDiagnosticsService';

interface SupportInfoCardProps {
  appVersion?: string;
  isOnline?: boolean;
  hasCloudAccount?: boolean;
  cloudSyncStatus?: 'idle' | 'syncing' | 'saved' | 'error';
  cloudSyncMessage?: string | null;
  cloudLastSyncAt?: string | null;
  aiDisabledReason?: string | null;
}

export function SupportInfoCard({
  appVersion,
  isOnline = true,
  hasCloudAccount = false,
  cloudSyncStatus = 'idle',
  cloudSyncMessage,
  cloudLastSyncAt,
  aiDisabledReason,
}: SupportInfoCardProps) {
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const diagnostics = buildSupportDiagnosticsSnapshot({
    isOnline,
    hasCloudAccount,
    cloudSyncStatus,
    cloudSyncMessage,
    cloudLastSyncAt,
    aiDisabledReason,
  });

  const supportReport = buildSupportReportText({
    appVersion,
    isOnline,
    hasCloudAccount,
    cloudSyncStatus,
    cloudSyncMessage,
    cloudLastSyncAt,
    aiDisabledReason,
  });

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(supportReport);
        setCopyMessage('Supportinfo er kopieret.');
        return;
      }

      setCopyMessage('Din browser kan ikke kopiere automatisk lige nu.');
    } catch {
      setCopyMessage('Supportinfo kunne ikke kopieres lige nu.');
    }
  };

  return (
    <section className="glass-brushed p-8 rounded-[2.5rem] border border-black/5 shadow-sm bg-white/40">
      <h2 className="text-xs font-bold text-forest-mid uppercase tracking-widest mb-6 flex items-center gap-3 opacity-60 text-engraved">
        <LifeBuoy size={14} /> {SUPPORT_INFO.title}
      </h2>

      <div className="rounded-2xl border border-black/5 bg-white/50 p-4">
        <div className="flex items-start gap-3">
          <Info size={16} className="text-forest-mid mt-0.5" />
          <div>
            <p className="font-serif text-lg text-forest-dark italic">Lettere beta-hjælp</p>
            <p className="mt-2 text-xs text-forest-mid leading-relaxed opacity-80">
              {SUPPORT_INFO.reportHelpText}
            </p>
          </div>
        </div>
      </div>

      <div className={`mt-5 rounded-2xl border p-4 ${diagnostics.overallState === 'problem' ? 'border-red-200 bg-red-50/70' : diagnostics.overallState === 'attention' ? 'border-amber-200 bg-amber-50/70' : 'border-emerald-200 bg-emerald-50/70'}`}>
        <p className="text-xs font-bold uppercase tracking-widest text-forest-mid opacity-70">Supportstatus</p>
        <p className="mt-2 text-sm text-forest-dark">{diagnostics.overallSummary}</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-forest-mid">
        <div className="rounded-2xl bg-white/55 px-4 py-3">
          <p className="font-bold uppercase tracking-widest opacity-60">Version</p>
          <p className="mt-2 text-sm text-forest-dark">CookMoxs {appVersion || 'dev'}</p>
        </div>
        <div className="rounded-2xl bg-white/55 px-4 py-3">
          <p className="font-bold uppercase tracking-widest opacity-60">Netværk</p>
          <p className="mt-2 text-sm text-forest-dark">{isOnline ? 'Online' : 'Offline'}</p>
        </div>
        <div className="rounded-2xl bg-white/55 px-4 py-3">
          <p className="font-bold uppercase tracking-widest opacity-60">Cloud-status</p>
          <p className="mt-2 text-sm text-forest-dark">
            {cloudSyncStatus === 'saved' ? 'OK' : cloudSyncStatus === 'syncing' ? 'Arbejder' : cloudSyncStatus === 'error' ? 'Fejl' : 'Lokal'}
          </p>
        </div>
        <div className="rounded-2xl bg-white/55 px-4 py-3">
          <p className="font-bold uppercase tracking-widest opacity-60">Seneste sync</p>
          <p className="mt-2 text-sm text-forest-dark">
            {cloudLastSyncAt ? new Date(cloudLastSyncAt).toLocaleString('da-DK') : 'Ukendt'}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {diagnostics.items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-black/5 bg-white/50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-forest-mid opacity-60">{item.label}</p>
                <p className="mt-2 text-sm text-forest-dark">{item.summary}</p>
                {item.detail && (
                  <p className="mt-2 text-xs text-forest-mid leading-relaxed opacity-80">{item.detail}</p>
                )}
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${item.state === 'problem' ? 'bg-red-100 text-red-800' : item.state === 'attention' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                {item.state === 'problem' ? 'Problem' : item.state === 'attention' ? 'Obs' : 'OK'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-black/5 bg-white/50 p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-forest-mid opacity-60">Supportvej</p>
        <p className="mt-2 text-sm text-forest-mid leading-relaxed">
          {SUPPORT_INFO.reportPathHint}
        </p>
        <p className="mt-2 text-xs text-forest-mid leading-relaxed opacity-75">
          {SUPPORT_INFO.diagnosticsHint}
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-black/5 bg-white/50 p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-forest-mid opacity-60">{SUPPORT_INFO.privacyHelpTitle}</p>
        <div className="mt-3 space-y-2 text-sm text-forest-mid leading-relaxed">
          {SUPPORT_INFO.privacyHelpItems.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </div>

      <button
        onClick={() => void handleCopy()}
        className="mt-5 w-full px-5 py-3 text-xs font-bold uppercase tracking-widest rounded-2xl bg-forest-dark text-white shadow-sm flex items-center justify-center gap-2"
      >
        <Copy size={14} /> {SUPPORT_INFO.reportActionLabel}
      </button>

      {copyMessage && (
        <div className="mt-4 rounded-2xl border border-black/5 bg-white/50 p-4 text-sm text-forest-mid">
          {copyMessage}
        </div>
      )}
    </section>
  );
}
