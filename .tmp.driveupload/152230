import React, { useMemo, useState } from 'react';
import { Home, Lock, Shield, Trash2, X } from 'lucide-react';
import { OwnershipBadge } from '../OwnershipBadge';
import { getFolderOwnershipDisplay } from '../../services/ownershipLabelService';
import type { Folder } from '../../types';

interface ShareFolderModalProps {
  folder: Folder;
  currentUser: any;
  onClose: () => void;
  onShare: (folderId: string, email: string) => void;
  onRemoveShare: (folderId: string, email: string) => void;
  onSetPermissionState: (folderId: string, state: 'private' | 'shared_view') => void;
}

export function ShareFolderModal({
  folder,
  currentUser,
  onClose,
  onShare,
  onRemoveShare,
  onSetPermissionState,
}: ShareFolderModalProps) {
  const [shareEmail, setShareEmail] = useState('');

  const shared = useMemo(() => folder.sharedWith || [], [folder.sharedWith]);
  const ownership = getFolderOwnershipDisplay(folder, currentUser);

  const modeOptions = [
    { state: 'private' as const, label: 'Privat', icon: <Lock size={14} /> },
    { state: 'shared_view' as const, label: 'Delt visning', icon: <Shield size={14} /> },
  ];

  return (
    <div className="cm-dialog-backdrop fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="cm-dialog-surface glass-brushed bg-white/90 dark:bg-black/90 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-serif text-forest-dark cm-light-surface-ink italic text-engraved">Del mappe</h3>
          <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-black/5 bg-white/50 p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-xs font-bold text-forest-mid cm-light-surface-ink-muted uppercase tracking-widest opacity-60">Nuværende synlighed</p>
                <p className="font-serif text-lg text-forest-dark cm-light-surface-ink italic mt-1">{folder.name}</p>
              </div>
              <OwnershipBadge ownership={ownership} />
            </div>
            <p className="text-sm text-forest-mid cm-light-surface-ink-muted">{ownership.detail}</p>
          </div>

          <div>
            <label className="text-xs font-bold text-forest-mid cm-light-surface-ink-muted uppercase tracking-widest mb-3 block opacity-60">Synlighed</label>
            <div className="grid grid-cols-2 gap-3">
              {modeOptions.map((option) => {
                const active = ownership.state === option.state;
                return (
                  <button
                    key={option.state}
                    onClick={() => onSetPermissionState(folder.id, option.state)}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${
                      active
                        ? 'bg-forest-dark text-white shadow-md'
                        : 'glass-brushed dark:bg-black/20 text-forest-mid cm-light-surface-ink-muted'
                    }`}
                  >
                    {option.icon}
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-forest-mid cm-light-surface-ink-muted opacity-75">
              Deling opretter kun visningsadgang.
            </p>
          </div>

          {ownership.state === 'household' && (
            <div className="rounded-2xl border border-black/5 bg-white/40 p-4 text-sm text-forest-mid cm-light-surface-ink-muted">
              <div className="flex items-start gap-2">
                <Home size={16} className="mt-0.5 shrink-0" />
                <p>Husstandsmapper styres af husstandens medlemskab og ikke af denne delingsflade.</p>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-forest-mid cm-light-surface-ink-muted uppercase tracking-widest mb-2 block opacity-60">E-mail adresse</label>
            <input
              type="email"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              placeholder="bruger@eksempel.dk"
              className="w-full glass-brushed dark:bg-black/20 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-forest-mid/10"
            />
          </div>

          <button
            onClick={() => {
              if (shareEmail.trim()) {
                onShare(folder.id, shareEmail.trim());
                setShareEmail('');
              }
            }}
            className="w-full btn-botanical py-4 rounded-xl text-sm font-bold uppercase tracking-widest shadow-lg"
          >
            Tilføj visningsadgang
          </button>

          {shared.length ? (
            <div className="pt-4 border-t border-black/5 dark:border-white/10">
              <label className="text-xs font-bold text-forest-mid cm-light-surface-ink-muted uppercase tracking-widest mb-3 block opacity-60">Adgang lige nu</label>
              <div className="space-y-3">
                {shared.map((share, index) => (
                  <div key={`${share.email}-${index}`} className="rounded-2xl border border-black/5 bg-white/45 p-3">
                    <div className="flex justify-between items-center gap-3 text-xs">
                      <div className="min-w-0 pr-2">
                        <span className="text-forest-dark cm-light-surface-ink font-medium truncate block">{share.email}</span>
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-sky-800">
                          <Shield size={10} /> Visning
                        </span>
                      </div>
                      <button
                        onClick={() => onRemoveShare(folder.id, share.email)}
                        className="p-2 text-red-700 hover:bg-red-50 rounded-full transition-colors"
                        title="Fjern adgang"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-black/5 bg-white/40 p-4 text-sm text-forest-mid cm-light-surface-ink-muted">
              Mappen er privat lige nu. Tilføj den første person ovenfor for at begynde at dele den som visning.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
