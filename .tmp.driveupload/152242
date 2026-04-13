import React, { useRef, useState } from 'react';
import { ArrowLeft, Camera, FileText, FileUp, Image as ImageIcon, Link, PenTool } from 'lucide-react';
import type { ImportPreference } from '../config/importPreferences';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { usePendingQueue } from '../hooks/usePendingQueue';
import { enqueueOfflineQueueItem } from '../services/offlineQueueService';
import { InlineLoadingGlyph, InlineLoadingLabel, LoadingAnimation } from './LoadingAnimation';

interface ImportViewProps {
  onImport: (content: string | { data: string, mimeType: string }, type: 'url' | 'text' | 'file' | 'image') => Promise<void>;
  onCreateManual: () => void;
  loading: boolean;
  error: string | null;
  importPreference: ImportPreference;
  aiDisabledReason?: string | null;
}

type ImportTab = 'url' | 'text' | 'file' | 'image' | 'manual' | null;

const AI_TEXT_FILE_TABS: ImportTab[] = ['text', 'file'];

export function ImportView({ onImport, onCreateManual, loading, error, importPreference, aiDisabledReason }: ImportViewProps) {
  const [activeTab, setActiveTab] = useState<ImportTab>(null);
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [queueMessage, setQueueMessage] = useState<string | null>(null);
  const [submittingTab, setSubmittingTab] = useState<ImportTab>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const { isOnline } = useNetworkStatus();
  const { pendingCount, isQueueSupported, refreshPendingCount } = usePendingQueue();

  const textAndFileDisabledReason = importPreference === 'basic_only'
    ? 'Du har valgt grundimport uden AI. Brug linkimport eller opret opskriften manuelt.'
    : aiDisabledReason || null;

  const urlDisabledReason = !isOnline && !isQueueSupported
    ? 'Denne browser understøtter ikke offline-køen til links.'
    : null;

  const imageDisabledReason = importPreference === 'basic_only'
    ? 'Du har valgt grundimport uden AI. Billedimport er derfor slået fra.'
    : (!isOnline && !isQueueSupported)
      ? 'Denne browser understøtter ikke offline-køen til billeder.'
      : (isOnline ? aiDisabledReason || null : null);

  const queueOfflineUrl = async (value: string) => {
    await enqueueOfflineQueueItem({
      type: 'url',
      url: value,
      sourceLabel: value,
    });
    await refreshPendingCount();
    setQueueMessage('Linket er gemt offline og venter nu i køen til senere behandling.');
    setUrl('');
  };

  const handleSubmit = async () => {
    if (loading || submittingTab) return;

    setQueueMessage(null);
    if (activeTab === 'url' && url) {
      setSubmittingTab('url');
      if (!isOnline) {
        if (urlDisabledReason) {
          setQueueMessage(urlDisabledReason);
          setSubmittingTab(null);
          return;
        }

        try {
          await queueOfflineUrl(url);
        } catch {
          setQueueMessage('Linket kunne ikke gemmes offline. Prøv igen i denne browser.');
        } finally {
          setSubmittingTab(null);
        }
        return;
      }

      try {
        await onImport(url, 'url');
      } catch {
        // Error state is surfaced by the parent view.
      } finally {
        setSubmittingTab(null);
      }
    } else if (activeTab === 'text' && text && !textAndFileDisabledReason) {
      setSubmittingTab('text');
      try {
        await onImport(text, 'text');
      } catch {
        // Error state is surfaced by the parent view.
      } finally {
        setSubmittingTab(null);
      }
    }
  };

  const queueOfflineImage = async (file: File) => {
    await enqueueOfflineQueueItem({
      type: 'image',
      blob: file,
      mimeType: file.type,
      fileName: file.name,
      sourceLabel: file.name || 'Offline billede',
    });
    await refreshPendingCount();
    setQueueMessage('Billedet er gemt offline og venter nu i køen til senere behandling.');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'image') => {
    if (loading || submittingTab) {
      e.target.value = '';
      return;
    }

    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (type === 'image' && !isOnline) {
      setSubmittingTab('image');
      if (imageDisabledReason) {
        setQueueMessage(imageDisabledReason);
        setSubmittingTab(null);
        return;
      }

      void queueOfflineImage(file).catch(() => {
        setQueueMessage('Billedet kunne ikke gemmes offline. Prøv igen i denne browser.');
      }).finally(() => {
        setSubmittingTab(null);
      });
      return;
    }

    if (type === 'file' && textAndFileDisabledReason) {
      setQueueMessage(textAndFileDisabledReason);
      return;
    }

    if (type === 'image' && imageDisabledReason) {
      setQueueMessage(imageDisabledReason);
      return;
    }

    setQueueMessage(null);
    setSubmittingTab(type);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const match = base64String.match(/^data:(.*?);base64,(.+)$/);
      if (match) {
        let mimeType = match[1];
        const data = match[2];
        // Browsers report empty/generic MIME for .gdoc files — detect by extension
        if ((!mimeType || mimeType === 'application/octet-stream') && file.name.endsWith('.gdoc')) {
          mimeType = 'application/json';
        }
        try {
          await onImport({ data, mimeType }, type);
        } catch {
          // Error state is surfaced by the parent view.
        } finally {
          setSubmittingTab(null);
        }
      } else {
        setSubmittingTab(null);
      }
    };
    reader.onerror = () => {
      setSubmittingTab(null);
    };
    reader.readAsDataURL(file);
  };

  const categories = [
    { id: 'url' as const, icon: <Link size={24} />, label: 'Link', description: isOnline ? 'Fra hjemmeside' : 'Gem offline i kø' },
    { id: 'text' as const, icon: <FileText size={24} />, label: 'Tekst', description: 'Kopier og indsæt' },
    { id: 'file' as const, icon: <FileUp size={24} />, label: 'Fil', description: 'PDF eller dok.' },
    { id: 'image' as const, icon: <Camera size={24} />, label: 'Billede', description: isOnline ? 'Scan kogebog' : 'Gem offline i kø' },
    { id: 'manual' as const, icon: <PenTool size={24} />, label: 'Manuelt', description: 'Skriv selv' },
  ];

  if (loading) {
    return (
      <div className="p-4 pb-32 max-w-md mx-auto min-h-screen flex flex-col items-center justify-center">
        <LoadingAnimation />
      </div>
    );
  }

  if (activeTab) {
    return (
      <div className="p-4 pb-32 max-w-md mx-auto min-h-screen">
        <div className="flex items-center gap-4 mb-8 pt-4">
          <button
            onClick={() => setActiveTab(null)}
            disabled={loading || Boolean(submittingTab)}
            className="flex items-center gap-1 p-2 text-forest-mid cm-light-surface-icon hover:bg-white/40 dark:hover:bg-black/5 rounded-full transition-colors glass-brushed disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft size={22} />
            <span className="text-sm font-medium pr-2">Tilbage</span>
          </button>
          <h1 className="text-3xl font-serif text-forest-dark cm-light-surface-ink italic text-engraved">
            {categories.find(c => c.id === activeTab)?.label}
          </h1>
        </div>

        <div className="glass-brushed p-8 rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.05)] border border-black/5 dark:border-white/10">
          {pendingCount > 0 && (
            <div className="mb-6 rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 text-sm text-amber-900">
              {pendingCount} ventende offline-import{pendingCount === 1 ? '' : 's'} i køen.
            </div>
          )}

          {activeTab === 'url' && (
            <div className="space-y-6">
              {urlDisabledReason && (
                <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 text-sm text-amber-900">
                  {urlDisabledReason}
                </div>
              )}
              {!isOnline && !urlDisabledReason && (
                <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-4 text-sm text-emerald-900">
                  Du er offline. Linket bliver gemt lokalt i køen og kan behandles senere.
                </div>
              )}
              <label className="block text-xs font-bold text-forest-mid cm-light-surface-ink-muted uppercase tracking-[0.2em] opacity-60 dark:opacity-100 ml-1 text-engraved">Indsæt link</label>
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setQueueMessage(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && url) void handleSubmit();
                }}
                placeholder="https://..."
                className="w-full p-5 cm-surface-secondary rounded-2xl focus:outline-none focus:border-forest-mid dark:focus:border-black/20 transition-all text-forest-dark cm-light-surface-ink placeholder-forest-mid/40 cm-light-surface-placeholder font-serif italic"
                autoFocus
                disabled={loading || submittingTab === 'url'}
              />
              <p className="text-xs text-forest-mid cm-light-surface-ink-muted italic opacity-70 dark:opacity-100">
                {isOnline ? 'Vi prøver grundimport først og bruger kun AI, hvis siden kræver det.' : 'Offline links gemmes nu i køen til senere behandling.'}
              </p>
            </div>
          )}

          {activeTab === 'text' && (
            <div className="space-y-6">
              {textAndFileDisabledReason && (
                <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 text-sm text-amber-900">
                  {textAndFileDisabledReason}
                </div>
              )}
              <label className="block text-xs font-bold text-forest-mid cm-light-surface-ink-muted uppercase tracking-[0.2em] opacity-60 dark:opacity-100 ml-1 text-engraved">Indsæt tekst</label>
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setQueueMessage(null);
                }}
                placeholder="Kopier og indsæt opskriften her..."
                rows={8}
                className="w-full p-5 cm-surface-secondary rounded-2xl focus:outline-none focus:border-forest-mid dark:focus:border-black/20 transition-all resize-none text-forest-dark cm-light-surface-ink placeholder-forest-mid/40 cm-light-surface-placeholder font-serif italic"
                autoFocus
                disabled={Boolean(textAndFileDisabledReason) || loading || submittingTab === 'text'}
              />
            </div>
          )}

          {activeTab === 'file' && (
            <div className="space-y-6 text-center py-10">
              {textAndFileDisabledReason && (
                <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 text-sm text-amber-900 text-left">
                  {textAndFileDisabledReason}
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFileUpload(e, 'file')}
                accept=".pdf,image/*,.txt,.doc,.docx,.gdoc"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || Boolean(textAndFileDisabledReason) || Boolean(submittingTab)}
                className="w-20 h-20 cm-surface-secondary rounded-full flex items-center justify-center mx-auto mb-4 text-forest-mid cm-light-surface-icon hover:bg-white/80 dark:hover:bg-black/5 transition-all disabled:opacity-50"
              >
                {submittingTab === 'file' ? <InlineLoadingGlyph className="cm-light-surface-icon" /> : <FileUp size={32} />}
              </button>
              <p className="text-forest-dark cm-light-surface-ink font-serif text-xl italic">Upload PDF eller dokument</p>
              <p className="text-sm text-forest-mid cm-light-surface-ink-muted italic opacity-60 dark:opacity-100">Denne importtype kræver AI.</p>
              <p className="text-xs text-forest-mid cm-light-surface-ink-soft italic opacity-60 dark:opacity-100 mt-1">
                Google Docs? Brug Link-import i stedet — indsæt dokumentets delingslink.
              </p>
              {submittingTab === 'file' && (
                <div className="cm-feedback-enter flex justify-center">
                  <InlineLoadingLabel label="Klargør fil til import" />
                </div>
              )}
            </div>
          )}

          {activeTab === 'image' && (
            <div className="space-y-8 text-center py-6">
              {imageDisabledReason && (
                <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 text-sm text-amber-900 text-left">
                  {imageDisabledReason}
                </div>
              )}
              {!isOnline && !imageDisabledReason && (
                <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-4 text-sm text-emerald-900 text-left">
                  Du er offline. Billeder gemmes lokalt i køen og kan behandles senere.
                </div>
              )}
              <input
                type="file"
                ref={cameraInputRef}
                onChange={(e) => handleFileUpload(e, 'image')}
                accept="image/*"
                capture="environment"
                className="hidden"
              />
              <input
                type="file"
                ref={galleryInputRef}
                onChange={(e) => handleFileUpload(e, 'image')}
                accept="image/*"
                className="hidden"
              />

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                disabled={loading || Boolean(imageDisabledReason) || Boolean(submittingTab)}
                  className="glass-brushed p-6 rounded-3xl border border-black/5 dark:border-white/10 flex flex-col items-center gap-3 hover:bg-white/60 dark:hover:bg-black/5 transition-all disabled:opacity-50"
                >
                  <div className="w-12 h-12 cm-surface-secondary rounded-full flex items-center justify-center text-forest-dark cm-light-surface-ink">
                    <Camera size={24} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-forest-dark cm-light-surface-ink">Kamera</span>
                </button>
                <button
                  onClick={() => galleryInputRef.current?.click()}
                disabled={loading || Boolean(imageDisabledReason) || Boolean(submittingTab)}
                  className="glass-brushed p-6 rounded-3xl border border-black/5 dark:border-white/10 flex flex-col items-center gap-3 hover:bg-white/60 dark:hover:bg-black/5 transition-all disabled:opacity-50"
                >
                  <div className="w-12 h-12 cm-surface-secondary rounded-full flex items-center justify-center text-forest-dark cm-light-surface-ink">
                    <ImageIcon size={24} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-forest-dark cm-light-surface-ink">Galleri</span>
                </button>
              </div>

              {submittingTab === 'image' && (
                <div className="flex flex-col items-center gap-3">
                  <InlineLoadingLabel label={isOnline ? 'Analyserer billede' : 'Gemmer billede i kø'} />
                </div>
              )}

              <p className="text-forest-dark cm-light-surface-ink font-serif text-xl italic">Scan en opskrift</p>
              <p className="text-sm text-forest-mid cm-light-surface-ink-muted italic opacity-60 dark:opacity-100">
                {isOnline ? 'Billedimport kræver AI.' : 'Offline billeder gemmes nu i køen.'}
              </p>
            </div>
          )}

          {activeTab === 'manual' && (
            <div className="space-y-6 text-center py-10">
              <div className="w-20 h-20 cm-surface-secondary rounded-full flex items-center justify-center mx-auto mb-4 text-forest-mid cm-light-surface-icon">
                <PenTool size={32} />
              </div>
              <p className="text-forest-dark cm-light-surface-ink font-serif text-xl italic">Skriv din egen opskrift fra bunden</p>
              <button
                onClick={onCreateManual}
                disabled={loading || Boolean(submittingTab)}
                className="btn-wood-light mt-6 px-10 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start nu
              </button>
            </div>
          )}

          {queueMessage && (
            <div className="cm-feedback-enter mt-8 p-5 bg-emerald-50/60 text-emerald-900 rounded-2xl text-sm border border-emerald-200/70 italic font-serif">
              {queueMessage}
            </div>
          )}

          {error && (
            <div className="cm-feedback-enter mt-8 p-5 bg-red-50/50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-sm border border-red-100 dark:border-red-900/30 italic font-serif">
              {error}
            </div>
          )}

          {(activeTab === 'url' || activeTab === 'text') && (
            <button
              onClick={handleSubmit}
              disabled={loading || Boolean(submittingTab) || (activeTab === 'url' && (!url || Boolean(urlDisabledReason))) || (activeTab === 'text' && (!text || Boolean(textAndFileDisabledReason)))}
              className="btn-wood-light w-full mt-10 py-5 rounded-2xl font-bold text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-3"
            >
              {submittingTab ? (
                <InlineLoadingLabel label={activeTab === 'url' && !isOnline ? 'Gemmer link i kø' : 'Analyserer opskrift'} />
              ) : (
                'Importer opskrift'
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-32 max-w-md mx-auto min-h-screen">
      <h1 className="text-3xl font-serif text-forest-dark cm-light-surface-ink mb-8 pt-4 italic text-engraved">Ny opskrift</h1>

      {pendingCount > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 text-sm text-amber-900">
          {pendingCount} ventende offline-import{pendingCount === 1 ? '' : 's'} gemt lokalt og klar til senere behandling.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {categories.map((cat, index) => {
          const disabled = Boolean((cat.id === 'url' && urlDisabledReason))
            || Boolean(AI_TEXT_FILE_TABS.includes(cat.id) && textAndFileDisabledReason)
            || (cat.id === 'image' && Boolean(imageDisabledReason));

          return (
            <button
              key={cat.id}
              onClick={() => {
                if (disabled) return;
                setQueueMessage(null);
                setSubmittingTab(null);
                cat.id === 'manual' ? onCreateManual() : setActiveTab(cat.id);
              }}
              disabled={disabled || loading || Boolean(submittingTab)}
              className={`glass-brushed p-6 rounded-[2rem] border border-black/5 dark:border-white/10 flex flex-col items-center justify-center gap-3 hover:bg-white/60 dark:hover:bg-black/5 transition-all group text-center shadow-sm ${index === 4 ? 'col-span-2' : ''} ${(disabled || loading || Boolean(submittingTab)) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="w-16 h-16 cm-surface-secondary rounded-2xl flex items-center justify-center text-forest-mid cm-light-surface-icon group-hover:bg-forest-dark dark:group-hover:bg-[#314038] group-hover:text-white dark:group-hover:text-[#F6F2EA] transition-all mb-2 relative">
                {cat.icon}
                {cat.id === 'url' && pendingCount > 0 && (
                  <span className="absolute -right-2 -top-2 min-w-5 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {pendingCount}
                  </span>
                )}
                {cat.id === 'image' && pendingCount > 0 && (
                  <span className="absolute -right-2 -top-2 min-w-5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {pendingCount}
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-serif text-forest-dark cm-light-surface-ink italic leading-tight">{cat.label}</h3>
                <p className="text-xs text-forest-mid cm-light-surface-ink-muted italic opacity-60 dark:opacity-100 uppercase tracking-widest mt-1">{cat.description}</p>
                {AI_TEXT_FILE_TABS.includes(cat.id) && (
                  <p className="text-[10px] text-heath-mid italic uppercase tracking-widest mt-2">Kræver AI</p>
                )}
                {cat.id === 'url' && !isOnline && (
                  <p className="text-[10px] text-emerald-700 italic uppercase tracking-widest mt-2">Offline-klar</p>
                )}
                {cat.id === 'image' && !isOnline && (
                  <p className="text-[10px] text-emerald-700 italic uppercase tracking-widest mt-2">Offline-klar</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {textAndFileDisabledReason && (
        <div className="mt-6 rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 text-sm text-amber-900">
          {textAndFileDisabledReason}
        </div>
      )}

      {urlDisabledReason && (
        <div className="mt-6 rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 text-sm text-amber-900">
          {urlDisabledReason}
        </div>
      )}

      {queueMessage && (
        <div className="cm-feedback-enter mt-6 p-5 bg-emerald-50/60 text-emerald-900 rounded-2xl text-sm border border-emerald-200/70 italic font-serif">
          {queueMessage}
        </div>
      )}

      {error && (
        <div className="cm-feedback-enter mt-8 p-5 bg-red-50/50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-sm border border-red-100 dark:border-red-900/30 italic font-serif">
          {error}
        </div>
      )}
    </div>
  );
}


