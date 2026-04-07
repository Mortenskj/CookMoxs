import { useEffect, useMemo, useState } from 'react';
import { Home, Shield, ShieldCheck, Trash2, Users } from 'lucide-react';
import {
  createHousehold,
  inviteHouseholdMember,
  listenToAccessibleHouseholds,
  removeHouseholdMember,
  updateHouseholdMemberRole,
} from '../services/householdService';
import type { Household, HouseholdMember } from '../types';

interface HouseholdSettingsCardProps {
  user: any;
  isOnline?: boolean;
}

const roleLabel: Record<HouseholdMember['role'], string> = {
  owner: 'Ejer',
  admin: 'Admin',
  member: 'Medlem',
};

const statusLabel: Record<HouseholdMember['status'], string> = {
  active: 'Aktiv',
  invited: 'Inviteret',
};

type ManageableHouseholdRole = Exclude<HouseholdMember['role'], 'owner'>;

const getCurrentUserRole = (household: Household, userId?: string) => {
  if (!userId) return null;
  if (household.ownerUID === userId) return 'owner';
  if (household.adminUids?.includes(userId)) return 'admin';
  if (household.memberUids?.includes(userId)) return 'member';
  return household.members?.find((member) => member.uid === userId)?.role || null;
};

const getMemberKey = (member: HouseholdMember) => member.uid || member.email || `${member.role}-${member.status}`;

const getMemberRef = (member: HouseholdMember) => ({
  uid: member.uid,
  email: member.email,
});

const canManageMember = (currentRole: HouseholdMember['role'] | null, member: HouseholdMember) => {
  if (!currentRole || member.role === 'owner') return false;
  if (currentRole === 'owner') return true;
  if (currentRole === 'admin') return member.role === 'member';
  return false;
};

const sortMembers = (members: HouseholdMember[] = []) =>
  [...members].sort((a, b) => {
    const rank = { owner: 0, admin: 1, member: 2 };
    const statusRank = { active: 0, invited: 1 };
    return rank[a.role] - rank[b.role] || statusRank[a.status] - statusRank[b.status] || (a.email || '').localeCompare(b.email || '');
  });

export function HouseholdSettingsCard({ user, isOnline = true }: HouseholdSettingsCardProps) {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [householdName, setHouseholdName] = useState('');
  const [inviteEmailByHousehold, setInviteEmailByHousehold] = useState<Record<string, string>>({});
  const [inviteRoleByHousehold, setInviteRoleByHousehold] = useState<Record<string, ManageableHouseholdRole>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setHouseholds([]);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = listenToAccessibleHouseholds(
      user.uid,
      (nextHouseholds) => {
        setHouseholds(nextHouseholds);
        setLoading(false);
      },
      () => {
        setError('Husstandsdata kunne ikke hentes lige nu.');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  const ownedHouseholds = useMemo(
    () => households.filter((household) => household.ownerUID === user?.uid),
    [households, user],
  );

  const handleCreateHousehold = async () => {
    if (!user?.uid || !householdName.trim() || !isOnline) return;

    setBusyKey('create');
    setError(null);
    setStatusMessage(null);

    try {
      await createHousehold({
        name: householdName,
        ownerUID: user.uid,
        ownerEmail: user.email,
        ownerDisplayName: user.displayName,
      });
      setHouseholdName('');
      setStatusMessage('Husstanden er oprettet.');
    } catch {
      setError('Husstanden kunne ikke oprettes.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleInvite = async (householdId: string) => {
    const email = inviteEmailByHousehold[householdId]?.trim();
    if (!email || !isOnline) return;

    setBusyKey(`invite:${householdId}`);
    setError(null);
    setStatusMessage(null);

    try {
      await inviteHouseholdMember(householdId, {
        email,
        role: inviteRoleByHousehold[householdId] || 'member',
      });
      setInviteEmailByHousehold((prev) => ({ ...prev, [householdId]: '' }));
      setStatusMessage('Invitationen er sendt til husstanden.');
    } catch {
      setError('Invitationen kunne ikke gemmes.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleRoleChange = async (householdId: string, member: HouseholdMember, role: ManageableHouseholdRole) => {
    if (!isOnline) return;

    const memberKey = getMemberKey(member);
    setBusyKey(`role:${householdId}:${memberKey}`);
    setError(null);
    setStatusMessage(null);

    try {
      await updateHouseholdMemberRole(householdId, getMemberRef(member), role);
      setStatusMessage(`${member.displayName || member.email || 'Medlemmet'} er nu ${roleLabel[role].toLowerCase()} i husstanden.`);
    } catch {
      setError('Rollen kunne ikke opdateres.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleRemoveMember = async (householdId: string, member: HouseholdMember) => {
    if (!isOnline) return;

    const memberKey = getMemberKey(member);
    setBusyKey(`remove:${householdId}:${memberKey}`);
    setError(null);
    setStatusMessage(null);

    try {
      await removeHouseholdMember(householdId, getMemberRef(member));
      setStatusMessage(member.status === 'invited' ? 'Invitationen er fjernet.' : 'Medlemmet er fjernet.');
    } catch {
      setError(member.status === 'invited' ? 'Invitationen kunne ikke fjernes.' : 'Medlemmet kunne ikke fjernes.');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <section className="glass-brushed p-8 rounded-[2.5rem]">
      <h2 className="cm-settings-section-heading">
        <Users size={14} /> Husstand
      </h2>

      {!user ? (
        <div className="cm-surface-secondary rounded-2xl p-4">
          <p className="font-serif text-lg text-forest-dark italic">Log ind for at bruge husstande</p>
          <p className="mt-2 text-xs text-forest-mid opacity-80">Her kan du oprette en husstand, invitere medlemmer og styre roller.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {!isOnline && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-900">Offline</p>
              <p className="mt-2 text-sm text-amber-900">Husstandsændringer kræver internet. Du kan stadig se den seneste hentede status.</p>
            </div>
          )}

          {ownedHouseholds.length === 0 && (
            <div className="cm-surface-secondary rounded-2xl p-4">
              <p className="font-serif text-lg text-forest-dark italic">Opret din første husstand</p>
              <p className="mt-1 text-xs text-forest-mid opacity-80">Brug husstanden til at samle familiens opskrifter og roller ét sted.</p>
              <div className="cm-settings-inline-form cm-settings-inline-form--create mt-4">
                <input
                  value={householdName}
                  onChange={(event) => setHouseholdName(event.target.value)}
                  placeholder="Fx Familien Madsen"
                  className="cm-settings-field"
                />
                <button
                  onClick={() => void handleCreateHousehold()}
                  disabled={!householdName.trim() || !isOnline || busyKey === 'create'}
                  className="btn-heath disabled:opacity-50"
                >
                  Opret husstand
                </button>
              </div>
            </div>
          )}

          {loading && households.length === 0 && (
            <p className="text-sm text-forest-mid italic opacity-80">Henter husstandsstatus...</p>
          )}

          {households.map((household) => {
            const currentRole = getCurrentUserRole(household, user.uid);
            const canInvite = currentRole === 'owner' || currentRole === 'admin';
            const members = sortMembers(household.members);
            const activeMembers = members.filter((member) => member.status === 'active');
            const invitedMembers = members.filter((member) => member.status === 'invited');

            return (
              <div key={household.id} className="cm-surface-secondary rounded-[2rem] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-serif text-xl text-forest-dark italic">{household.name}</p>
                    <p className="mt-1 text-xs text-forest-mid opacity-80">
                      {currentRole === 'owner' ? 'Du ejer denne husstand.' : currentRole === 'admin' ? 'Du er admin i denne husstand.' : 'Du er medlem af denne husstand.'}
                    </p>
                  </div>
                  <div className="cm-settings-badge-stack">
                    <span className="shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-700">
                      {members.length} medlemmer
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-forest-mid opacity-60">Aktive medlemmer</p>
                      <span className="text-[11px] text-forest-mid opacity-70">{activeMembers.length}</span>
                    </div>
                    <div className="space-y-3">
                      {activeMembers.map((member) => {
                        const memberKey = getMemberKey(member);
                        const canManage = canManageMember(currentRole, member);
                        const isUpdatingRole = busyKey === `role:${household.id}:${memberKey}`;
                        const isRemoving = busyKey === `remove:${household.id}:${memberKey}`;

                        return (
                          <div key={`${household.id}-${memberKey}`} className="cm-surface-secondary rounded-2xl p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-forest-dark">{member.displayName || member.email || 'Ukendt medlem'}</p>
                                <p className="text-xs text-forest-mid opacity-75">{member.email || member.uid || 'Afventer invitation'}</p>
                              </div>
                              <div className="cm-settings-badge-stack">
                                <span className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-forest-dark text-white">
                                  {roleLabel[member.role]}
                                </span>
                                <span className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-emerald-100 text-emerald-800">
                                  {statusLabel[member.status]}
                                </span>
                              </div>
                            </div>

                            {canManage ? (
                              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                <div className="cm-settings-segmented flex-1">
                                  <button
                                    onClick={() => void handleRoleChange(household.id, member, 'member')}
                                    disabled={!isOnline || isUpdatingRole || member.role === 'member'}
                                    data-active={member.role === 'member'}
                                    className="cm-settings-segment-button flex-1 disabled:opacity-50"
                                  >
                                    <Shield size={12} /> Medlem
                                  </button>
                                  <button
                                    onClick={() => void handleRoleChange(household.id, member, 'admin')}
                                    disabled={!isOnline || isUpdatingRole || member.role === 'admin'}
                                    data-active={member.role === 'admin'}
                                    className="cm-settings-segment-button flex-1 disabled:opacity-50"
                                  >
                                    <ShieldCheck size={12} /> Admin
                                  </button>
                                </div>
                                <button
                                  onClick={() => void handleRemoveMember(household.id, member)}
                                  disabled={!isOnline || isRemoving}
                                  className="btn-wood-light text-red-700 disabled:opacity-50"
                                >
                                  <Trash2 size={12} /> Fjern
                                </button>
                              </div>
                            ) : (
                              <p className="mt-3 text-xs text-forest-mid opacity-70">
                                {member.role === 'owner'
                                  ? 'Ejeren styres ikke fra denne flade.'
                                  : currentRole === 'admin'
                                    ? 'Admins kan kun ændre almindelige medlemmer.'
                                    : 'Kun ejer eller admin kan ændre medlemmer.'}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-forest-mid opacity-60">Invitationer</p>
                      <span className="text-[11px] text-forest-mid opacity-70">{invitedMembers.length}</span>
                    </div>
                    {invitedMembers.length > 0 ? (
                      <div className="space-y-3">
                        {invitedMembers.map((member) => {
                          const memberKey = getMemberKey(member);
                          const canManage = canManageMember(currentRole, member);
                          const isUpdatingRole = busyKey === `role:${household.id}:${memberKey}`;
                          const isRemoving = busyKey === `remove:${household.id}:${memberKey}`;

                          return (
                            <div key={`${household.id}-${memberKey}`} className="cm-surface-secondary rounded-2xl p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium text-forest-dark">{member.displayName || member.email || 'Invitation uden navn'}</p>
                                  <p className="text-xs text-forest-mid opacity-75">{member.email || 'Afventer invitation'}</p>
                                </div>
                                <div className="cm-settings-badge-stack">
                                  <span className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-forest-dark text-white">
                                    {roleLabel[member.role]}
                                  </span>
                                  <span className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-amber-100 text-amber-800">
                                    {statusLabel[member.status]}
                                  </span>
                                </div>
                              </div>

                              {canManage ? (
                                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                  <div className="cm-settings-segmented flex-1">
                                    <button
                                      onClick={() => void handleRoleChange(household.id, member, 'member')}
                                      disabled={!isOnline || isUpdatingRole || member.role === 'member'}
                                      data-active={member.role === 'member'}
                                      className="cm-settings-segment-button flex-1 disabled:opacity-50"
                                    >
                                      <Shield size={12} /> Medlem
                                    </button>
                                    <button
                                      onClick={() => void handleRoleChange(household.id, member, 'admin')}
                                      disabled={!isOnline || isUpdatingRole || member.role === 'admin'}
                                      data-active={member.role === 'admin'}
                                      className="cm-settings-segment-button flex-1 disabled:opacity-50"
                                    >
                                      <ShieldCheck size={12} /> Admin
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => void handleRemoveMember(household.id, member)}
                                    disabled={!isOnline || isRemoving}
                                    className="btn-wood-light text-red-700 disabled:opacity-50"
                                  >
                                    <Trash2 size={12} /> Fjern
                                  </button>
                                </div>
                              ) : (
                                <p className="mt-3 text-xs text-forest-mid opacity-70">
                                  {currentRole === 'admin'
                                    ? 'Admins kan kun ændre invitationer til almindelige medlemmer.'
                                    : 'Kun ejer eller admin kan ændre invitationer.'}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-black/5 bg-white/45 p-3">
                        <p className="text-sm text-forest-mid opacity-80">Ingen ventende invitationer lige nu.</p>
                      </div>
                    )}
                  </div>
                </div>

                {canInvite && (
                  <div className="mt-4 rounded-2xl border border-black/5 bg-white/45 p-4">
                    <div className="flex items-center gap-2 mb-3 text-forest-mid">
                      <Home size={14} />
                      <p className="text-xs font-bold uppercase tracking-widest">Inviter til husstand</p>
                    </div>
                    <div className="cm-settings-inline-form cm-settings-inline-form--invite cm-household-invite-form">
                      <input
                        value={inviteEmailByHousehold[household.id] || ''}
                        onChange={(event) => setInviteEmailByHousehold((prev) => ({ ...prev, [household.id]: event.target.value }))}
                        placeholder="navn@email.dk"
                        className="cm-settings-field"
                      />
                      <select
                        value={inviteRoleByHousehold[household.id] || 'member'}
                        onChange={(event) => setInviteRoleByHousehold((prev) => ({ ...prev, [household.id]: event.target.value as ManageableHouseholdRole }))}
                        className="cm-settings-select"
                      >
                        <option value="member">Medlem</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        onClick={() => void handleInvite(household.id)}
                        disabled={!inviteEmailByHousehold[household.id]?.trim() || !isOnline || busyKey === `invite:${household.id}`}
                        className="btn-heath disabled:opacity-50"
                      >
                        Inviter
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {!loading && households.length === 0 && ownedHouseholds.length > 0 && (
            <p className="text-sm text-forest-mid italic opacity-80">Ingen husstandsdata fundet endnu.</p>
          )}

          {(statusMessage || error) && (
            <div className="cm-household-status-stack">
              {statusMessage && <p className="cm-settings-status-message cm-settings-status-message--success">{statusMessage}</p>}
              {error && <p className="cm-settings-status-message cm-settings-status-message--error">{error}</p>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
