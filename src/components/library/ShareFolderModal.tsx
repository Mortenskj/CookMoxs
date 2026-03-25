import React, { useMemo, useState } from 'react';
import { Shield, ShieldCheck, X } from 'lucide-react';
import type { Folder } from '../../types';

interface ShareFolderModalProps {
  folder: Folder;
  onClose: () => void;
  onShare: (folderId: string, email: string, role: 'viewer' | 'editor') => void;
}

export function ShareFolderModal({ folder, onClose, onShare }: ShareFolderModalProps) {
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState<'viewer' | 'editor'>('viewer');

  const shared = useMemo(() => folder.sharedWith || [], [folder.sharedWith]);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="glass-brushed bg-white/90 dark:bg-black/90 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-serif text-forest-dark dark:text-white italic text-engraved">Del mappe</h3>
          <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-widest mb-2 block opacity-60">E-mail adresse</label>
            <input
              type="email"
              value={shareEmail}
              onChange={e => setShareEmail(e.target.value)}
              placeholder="bruger@eksempel.dk"
              className="w-full glass-brushed dark:bg-black/20 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-forest-mid/10"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-widest mb-2 block opacity-60">Rolle</label>
            <div className="flex gap-2">
              <button
                onClick={() => setShareRole('viewer')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${shareRole === 'viewer' ? 'bg-forest-dark text-white shadow-md' : 'glass-brushed dark:bg-black/20 text-forest-mid dark:text-white/70'}`}
              >
                <Shield size={14} /> Se
              </button>
              <button
                onClick={() => setShareRole('editor')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${shareRole === 'editor' ? 'bg-forest-dark text-white shadow-md' : 'glass-brushed dark:bg-black/20 text-forest-mid dark:text-white/70'}`}
              >
                <ShieldCheck size={14} /> Rediger
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              if (shareEmail.trim()) {
                onShare(folder.id, shareEmail.trim(), shareRole);
                setShareEmail('');
                onClose();
              }
            }}
            className="w-full btn-botanical py-4 rounded-xl text-sm font-bold uppercase tracking-widest shadow-lg"
          >
            Del nu
          </button>

          {shared.length ? (
            <div className="pt-4 border-t border-black/5 dark:border-white/10">
              <label className="text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-widest mb-3 block opacity-60">Delt med</label>
              <div className="space-y-3">
                {shared.map((s, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="text-forest-dark dark:text-white font-medium truncate pr-2">{s.email}</span>
                    <span className="text-forest-mid dark:text-white/70 opacity-60 italic">{s.role === 'editor' ? 'Redaktør' : 'Læser'}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
