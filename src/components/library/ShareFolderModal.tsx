import React, { useMemo, useState } from 'react';
import { Home, Lock, Shield, ShieldCheck, Trash2, X } from 'lucide-react';
import { OwnershipBadge } from '../OwnershipBadge';
import { getFolderOwnershipDisplay } from '../../services/ownershipLabelService';
import type { PermissionUiState } from '../../config/permissionUiModel';
import type { Folder } from '../../types';

interface ShareFolderModalProps {
  folder: Folder;
  currentUser: any;
  onClose: () => void;
  onShare: (folderId: string, email: string, role: 'viewer' | 'editor') => void;
  onUpdateRole: (folderId: string, email: string, role: 'viewer' | 'editor') => void;
  onRemoveShare: (folderId: string, email: string) => void;
  onSetPermissionState: (folderId: string, state: 'private' | 'shared_view' | 'shared_edit') => void;
}

export function ShareFolderModal({
  folder,
  currentUser,
  onClose,
  onShare,
  onUpdateRole,
  onRemoveShare,
  onSetPermissionState,
}: ShareFolderModalProps) {
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState<'viewer' | 'editor'>('viewer');

  const shared = useMemo(() => folder.sharedWith || [], [folder.sharedWith]);
  const ownership = getFolderOwnershipDisplay(folder, currentUser);
  const canSwitchSharedMode = shared.length > 0 && ownership.state !== 'household';

  const modeOptions: Array<{
    state: PermissionUiState;
    label: string;
    icon: React.ReactNode;
    disabled?: boolean;
  }> = [
    { state: 'private', label: 'Privat', icon: <Lock size={14} /> },
    { state: 'shared_view', label: 'Delt visning', icon: <Shield size={14} />, disabled: !canSwitchSharedMode && ownership.state !== 'shared_view' },
    { state: 'shared_edit', label: 'Delt redigering', icon: <ShieldCheck size={14} />, disabled: !canSwitchSharedMode && ownership.state !== 'shared_edit' },
    { state: 'household', label: 'Husstand', icon: <Home size={14} />, disabled: true },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="glass-brushed bg-white/90 dark:bg-black/90 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-serif text-forest-dark dark:text-white italic text-engraved">Mappe-tilladelser</h3>
          <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-black/5 bg-white/50 p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-widest opacity-60">Nuværende permission-mode</p>
                <p className="font-serif text-lg text-forest-dark dark:text-white italic mt-1">{folder.name}</p>
              </div>
              <OwnershipBadge ownership={ownership} />
            </div>
            <p className="text-sm text-forest-mid dark:text-white/70">{ownership.detail}</p>
          </div>

          <div>
            <label className="text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-widest mb-3 block opacity-60">Skift mode</label>
            <div className="grid grid-cols-2 gap-3">
              {modeOptions.map((option) => {
                const active = ownership.state === option.state;
                const isHouseholdInfo = option.state === 'household' && ownership.state === 'household';
                return (
                  <button
                    key={option.state}
                    onClick={() => {
                      if (!option.disabled && option.state !== 'household') {
                        onSetPermissionState(folder.id, option.state);
                      }
                    }}
                    disabled={option.disabled && !isHouseholdInfo}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${
                      active
                        ? 'bg-forest-dark text-white shadow-md'
                        : 'glass-brushed dark:bg-black/20 text-forest-mid dark:text-white/70'
                    } disabled:opacity-45`}
                  >
                    {option.icon}
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
            {!canSwitchSharedMode && ownership.state !== 'household' && (
              <p className="mt-3 text-xs text-forest-mid dark:text-white/70 opacity-75">
                Inviter mindst en person for at skifte mellem delt visning og delt redigering.
              </p>
            )}
            {ownership.state === 'household' && (
              <p className="mt-3 text-xs text-forest-mid dark:text-white/70 opacity-75">
                Husstandsmapper styres af husstandens medlemskab og ikke af denne delingsflade.
              </p>
            )}
          </div>

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
            <label className="text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-widest mb-2 block opacity-60">Rolle for ny person</label>
            <div className="flex gap-2">
              <button
                onClick={() => setShareRole('viewer')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${shareRole === 'viewer' ? 'bg-forest-dark text-white shadow-md' : 'glass-brushed dark:bg-black/20 text-forest-mid dark:text-white/70'}`}
              >
                <Shield size={14} /> Visning
              </button>
              <button
                onClick={() => setShareRole('editor')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${shareRole === 'editor' ? 'bg-forest-dark text-white shadow-md' : 'glass-brushed dark:bg-black/20 text-forest-mid dark:text-white/70'}`}
              >
                <ShieldCheck size={14} /> Redigering
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              if (shareEmail.trim()) {
                onShare(folder.id, shareEmail.trim(), shareRole);
                setShareEmail('');
              }
            }}
            className="w-full btn-botanical py-4 rounded-xl text-sm font-bold uppercase tracking-widest shadow-lg"
          >
            Tilføj adgang
          </button>

          {shared.length ? (
            <div className="pt-4 border-t border-black/5 dark:border-white/10">
              <label className="text-xs font-bold text-forest-mid dark:text-white/70 uppercase tracking-widest mb-3 block opacity-60">Adgang lige nu</label>
              <div className="space-y-3">
                {shared.map((share, index) => (
                  <div key={`${share.email}-${index}`} className="rounded-2xl border border-black/5 bg-white/45 p-3">
                    <div className="flex justify-between items-center gap-3 text-xs">
                      <span className="text-forest-dark dark:text-white font-medium truncate pr-2">{share.email}</span>
                      <button
                        onClick={() => onRemoveShare(folder.id, share.email)}
                        className="p-2 text-red-700 hover:bg-red-50 rounded-full transition-colors"
                        title="Fjern adgang"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => onUpdateRole(folder.id, share.email, 'viewer')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${share.role === 'viewer' ? 'bg-forest-dark text-white shadow-md' : 'glass-brushed dark:bg-black/20 text-forest-mid dark:text-white/70'}`}
                      >
                        <Shield size={12} /> Visning
                      </button>
                      <button
                        onClick={() => onUpdateRole(folder.id, share.email, 'editor')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${share.role === 'editor' ? 'bg-forest-dark text-white shadow-md' : 'glass-brushed dark:bg-black/20 text-forest-mid dark:text-white/70'}`}
                      >
                        <ShieldCheck size={12} /> Redigering
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-black/5 bg-white/40 p-4 text-sm text-forest-mid dark:text-white/70">
              Mappen er privat lige nu. Tilføj den første person ovenfor for at begynde at dele den.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
