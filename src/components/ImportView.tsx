import React, { useState, useRef } from 'react';
import { Link, FileText, Camera, FileUp, Loader2, PenTool, ArrowLeft, ArrowRight, Image as ImageIcon } from 'lucide-react';

interface ImportViewProps {
  onImport: (content: string | { data: string, mimeType: string }, type: 'url' | 'text' | 'file' | 'image') => Promise<void>;
  onCreateManual: () => void;
  loading: boolean;
  error: string | null;
}

import { LoadingAnimation } from './LoadingAnimation';

export function ImportView({ onImport, onCreateManual, loading, error }: ImportViewProps) {
  const [activeTab, setActiveTab] = useState<'url' | 'text' | 'file' | 'image' | 'manual' | null>(null);
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (activeTab === 'url' && url) {
      await onImport(url, 'url');
    } else if (activeTab === 'text' && text) {
      await onImport(text, 'text');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'image') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const match = base64String.match(/^data:(.+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const data = match[2];
        await onImport({ data, mimeType }, type);
      }
    };
    reader.readAsDataURL(file);
  };

  const categories = [
    { id: 'url', icon: <Link size={24} />, label: 'Link', description: 'Fra hjemmeside' },
    { id: 'text', icon: <FileText size={24} />, label: 'Tekst', description: 'Kopier & indsæt' },
    { id: 'file', icon: <FileUp size={24} />, label: 'Fil', description: 'PDF eller dok.' },
    { id: 'image', icon: <Camera size={24} />, label: 'Billede', description: 'Scan kogebog' },
    { id: 'manual', icon: <PenTool size={24} />, label: 'Manuelt', description: 'Skriv selv' },
  ];

  if (loading) {
    return (
      <div className="p-4 pb-32 max-w-md mx-auto min-h-screen herbal-pattern flex flex-col items-center justify-center">
        <LoadingAnimation />
      </div>
    );
  }

  if (activeTab) {
    return (
      <div className="p-4 pb-32 max-w-md mx-auto min-h-screen herbal-pattern dark:text-white">
        <div className="flex items-center gap-4 mb-8 pt-4">
          <button 
            onClick={() => setActiveTab(null)}
            className="flex items-center gap-1 p-2 text-forest-mid dark:text-white/70 hover:bg-white/40 dark:hover:bg-white/10 rounded-full transition-colors glass-brushed"
          >
            <ArrowLeft size={22} />
            <span className="text-sm font-medium pr-2">Tilbage</span>
          </button>
          <h1 className="text-3xl font-serif text-forest-dark dark:text-white italic text-engraved">
            {categories.find(c => c.id === activeTab)?.label}
          </h1>
        </div>

        <div className="glass-brushed p-8 rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.05)] border border-black/5 dark:border-white/10">
          {activeTab === 'url' && (
            <div className="space-y-6">
              <label className="block text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-[0.2em] opacity-60 ml-1 text-engraved">Indsæt link</label>
              <input 
                type="url" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && url) handleSubmit();
                }}
                placeholder="https://..."
                className="w-full p-5 bg-white/60 dark:bg-black/40 border border-black/5 dark:border-white/10 rounded-2xl focus:outline-none focus:border-forest-mid dark:focus:border-white/40 transition-all text-forest-dark dark:text-white placeholder-forest-mid/40 dark:placeholder-white/20 font-serif italic shadow-sm"
                autoFocus
              />
              <p className="text-xs text-forest-mid dark:text-white/60 italic opacity-70">Vi henter opskriften og fjerner alt det overflødige.</p>
            </div>
          )}

          {activeTab === 'text' && (
            <div className="space-y-6">
              <label className="block text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-[0.2em] opacity-60 ml-1 text-engraved">Indsæt tekst</label>
              <textarea 
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Kopier og indsæt opskriften her..."
                rows={8}
                className="w-full p-5 bg-white/60 dark:bg-black/40 border border-black/5 dark:border-white/10 rounded-2xl focus:outline-none focus:border-forest-mid dark:focus:border-white/40 transition-all resize-none text-forest-dark dark:text-white placeholder-forest-mid/40 dark:placeholder-white/20 font-serif italic shadow-sm"
                autoFocus
              />
            </div>
          )}

          {activeTab === 'file' && (
            <div className="space-y-6 text-center py-10">
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={(e) => handleFileUpload(e, 'file')}
                accept=".pdf,image/*,.txt,.doc,.docx"
                className="hidden"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="w-20 h-20 bg-white/60 dark:bg-black/40 rounded-full flex items-center justify-center mx-auto mb-4 text-forest-mid dark:text-white/70 border border-black/5 dark:border-white/10 shadow-sm hover:bg-white/80 dark:hover:bg-white/20 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 size={32} className="animate-spin" /> : <FileUp size={32} />}
              </button>
              <p className="text-forest-dark dark:text-white font-serif text-xl italic">Upload PDF eller dokument</p>
              <p className="text-sm text-forest-mid dark:text-white/60 italic opacity-60">Vælg en fil fra din enhed</p>
            </div>
          )}

          {activeTab === 'image' && (
            <div className="space-y-8 text-center py-6">
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
                  disabled={loading}
                  className="glass-brushed p-6 rounded-3xl border border-black/5 dark:border-white/10 flex flex-col items-center gap-3 hover:bg-white/60 dark:hover:bg-white/10 transition-all disabled:opacity-50"
                >
                  <div className="w-12 h-12 bg-forest-dark/10 dark:bg-white/10 rounded-full flex items-center justify-center text-forest-dark dark:text-white">
                    <Camera size={24} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-forest-dark dark:text-white">Kamera</span>
                </button>
                <button 
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={loading}
                  className="glass-brushed p-6 rounded-3xl border border-black/5 dark:border-white/10 flex flex-col items-center gap-3 hover:bg-white/60 dark:hover:bg-white/10 transition-all disabled:opacity-50"
                >
                  <div className="w-12 h-12 bg-forest-dark/10 dark:bg-white/10 rounded-full flex items-center justify-center text-forest-dark dark:text-white">
                    <ImageIcon size={24} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-forest-dark dark:text-white">Galleri</span>
                </button>
              </div>

              {loading && (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={32} className="animate-spin text-forest-mid dark:text-white/70" />
                  <p className="text-sm text-forest-mid dark:text-white/60 italic">Analyserer billede...</p>
                </div>
              )}
              
              <p className="text-forest-dark dark:text-white font-serif text-xl italic">Scan en opskrift</p>
              <p className="text-sm text-forest-mid dark:text-white/60 italic opacity-60">Tag et billede eller vælg fra galleri</p>
            </div>
          )}

          {activeTab === 'manual' && (
            <div className="space-y-6 text-center py-10">
              <div className="w-20 h-20 bg-white/60 dark:bg-black/40 rounded-full flex items-center justify-center mx-auto mb-4 text-forest-mid dark:text-white/70 border border-black/5 dark:border-white/10 shadow-sm">
                <PenTool size={32} />
              </div>
              <p className="text-forest-dark dark:text-white font-serif text-xl italic">Skriv din egen opskrift fra bunden</p>
              <button 
                onClick={onCreateManual}
                className="btn-wood-light mt-6 px-10 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest"
              >
                Start nu
              </button>
            </div>
          )}

          {error && (
            <div className="mt-8 p-5 bg-red-50/50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-sm border border-red-100 dark:border-red-900/30 italic font-serif">
              {error}
            </div>
          )}

          {(activeTab === 'url' || activeTab === 'text') && (
            <button 
              onClick={handleSubmit}
              disabled={loading || (activeTab === 'url' && !url) || (activeTab === 'text' && !text)}
              className="btn-wood-light w-full mt-10 py-5 rounded-2xl font-bold text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-3"
            >
              {loading ? (
                <><Loader2 size={20} className="animate-spin text-forest-mid dark:text-white/70" /> Analyserer...</>
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
    <div className="p-4 pb-32 max-w-md mx-auto min-h-screen herbal-pattern dark:text-white">
      <h1 className="text-3xl font-serif text-forest-dark dark:text-white mb-8 pt-4 italic text-engraved">Ny opskrift</h1>

      <div className="grid grid-cols-2 gap-4">
        {categories.map((cat, index) => (
          <button
            key={cat.id}
            onClick={() => cat.id === 'manual' ? onCreateManual() : setActiveTab(cat.id as any)}
            className={`glass-brushed p-6 rounded-[2rem] border border-black/5 dark:border-white/10 flex flex-col items-center justify-center gap-3 hover:bg-white/60 dark:hover:bg-white/10 transition-all group text-center shadow-sm ${index === 4 ? 'col-span-2' : ''}`}
          >
            <div className="w-16 h-16 bg-forest-dark/5 dark:bg-white/5 rounded-2xl flex items-center justify-center text-forest-mid dark:text-white/70 group-hover:bg-forest-dark dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-all mb-2">
              {cat.icon}
            </div>
            <div>
              <h3 className="text-lg font-serif text-forest-dark dark:text-white italic leading-tight">{cat.label}</h3>
              <p className="text-xs text-forest-mid dark:text-white/60 italic opacity-60 uppercase tracking-widest mt-1">{cat.description}</p>
            </div>
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-8 p-5 bg-red-50/50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-sm border border-red-100 dark:border-red-900/30 italic font-serif">
          {error}
        </div>
      )}
    </div>
  );
}
