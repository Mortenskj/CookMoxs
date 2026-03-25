import { useEffect, useMemo, useState } from 'react';
import { Home, Users } from 'lucide-react';
import {
  createHousehold,
  inviteHouseholdMember,
  listenToAccessibleHouseholds,
} from '../services/householdService';
import type { Household, HouseholdMember, ShareRole } from '../types';

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

const getCurrentUserRole = (household: Household, userId?: string) => {
  if (!userId) return null;
  if (household.ownerUID === userId) return 'owner';
  if (household.adminUids?.includes(userId)) return 'admin';
  if (household.memberUids?.includes(userId)) return 'member';
  return household.members?.find((member) => member.uid === userId)?.role || null;
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
  const [inviteRoleByHousehold, setInviteRoleByHousehold] = useState<Record<string, ShareRole>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setHouseholds([]);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = listenToAccessibleHouseholds(user.uid, (nextHouseholds) => {
      setHouseholds(nextHouseholds);
      setLoading(false);
    }, () => {
      setError('Husstandsdata kunne ikke hentes lige nu.');
      setLoading(false);
    });

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
        role: inviteRoleByHousehold[householdId] === 'editor' ? 'admin' : 'member',
      });
      setInviteEmailByHousehold((prev) => ({ ...prev, [householdId]: '' }));
      setStatusMessage('Invitationen er gemt i husstanden.');
    } catch {
      setError('Invitationen kunne ikke gemmes.');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <section className="glass-brushed p-8 rounded-[2.5rem] border border-black/5 shadow-sm bg-white/40">
      <h2 className="text-xs font-bold text-forest-mid uppercase tracking-widest mb-6 flex items-center gap-3 opacity-60 text-engraved">
        <Users size={14} /> Husstand
      </h2>

      {!user ? (
        <div className="rounded-2xl border border-black/5 bg-white/50 p-4">
          <p className="font-serif text-lg text-forest-dark italic">Log ind for at bruge husstande</p>
          <p className="mt-2 text-xs text-forest-mid opacity-80">Her kommer den mindste household-flade: opret en husstand, se medlemmer og deres roller.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {!isOnline && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-900">Offline</p>
              <p className="mt-2 text-sm text-amber-900">Husstandsændringer kræver internetforbindelse. Du kan stadig se den seneste husstandsstatus, hvis den er hentet.</p>
            </div>
          )}

          {ownedHouseholds.length === 0 && (
            <div className="rounded-2xl border border-black/5 bg-white/50 p-4">
              <p className="font-serif text-lg text-forest-dark italic">Opret din første husstand</p>
              <p className="mt-1 text-xs text-forest-mid opacity-80">Brug husstande til familie- eller hjemmedeling uden at brede UI ud endnu.</p>
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <input
                  value={householdName}
                  onChange={(event) => setHouseholdName(event.target.value)}
                  placeholder="Fx Familien Madsen"
                  className="flex-1 rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm text-forest-dark outline-none focus:border-forest-mid"
                />
                <button
                  onClick={() => void handleCreateHousehold()}
                  disabled={!householdName.trim() || !isOnline || busyKey === 'create'}
                  className="px-5 py-3 text-xs font-bold uppercase tracking-widest rounded-2xl bg-forest-dark text-white shadow-sm disabled:opacity-50"
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

            return (
              <div key={household.id} className="rounded-[2rem] border border-black/5 bg-white/55 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-serif text-xl text-forest-dark italic">{household.name}</p>
                    <p className="mt-1 text-xs text-forest-mid opacity-80">
                      {currentRole === 'owner' ? 'Du ejer denne husstand.' : currentRole === 'admin' ? 'Du er admin i denne husstand.' : 'Du er medlem af denne husstand.'}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-700">
                    {members.length} medlemmer
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {members.map((member, index) => (
                    <div key={`${household.id}-${member.uid || member.email || index}`} className="rounded-2xl border border-black/5 bg-white/60 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-forest-dark">{member.displayName || member.email || 'Ukendt medlem'}</p>
                          <p className="text-xs text-forest-mid opacity-75">{member.email || member.uid || 'Afventer invitation'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-forest-dark text-white">
                            {roleLabel[member.role]}
                          </span>
                          <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${member.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {statusLabel[member.status]}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {canInvite && (
                  <div className="mt-4 rounded-2xl border border-black/5 bg-white/45 p-4">
                    <div className="flex items-center gap-2 mb-3 text-forest-mid">
                      <Home size={14} />
                      <p className="text-xs font-bold uppercase tracking-widest">Inviter til husstand</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        value={inviteEmailByHousehold[household.id] || ''}
                        onChange={(event) => setInviteEmailByHousehold((prev) => ({ ...prev, [household.id]: event.target.value }))}
                        placeholder="navn@email.dk"
                        className="flex-1 rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm text-forest-dark outline-none focus:border-forest-mid"
                      />
                      <select
                        value={inviteRoleByHousehold[household.id] || 'viewer'}
                        onChange={(event) => setInviteRoleByHousehold((prev) => ({ ...prev, [household.id]: event.target.value as ShareRole }))}
                        className="rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm text-forest-dark outline-none focus:border-forest-mid"
                      >
                        <option value="viewer">Medlem</option>
                        <option value="editor">Admin</option>
                      </select>
                      <button
                        onClick={() => void handleInvite(household.id)}
                        disabled={!inviteEmailByHousehold[household.id]?.trim() || !isOnline || busyKey === `invite:${household.id}`}
                        className="px-5 py-3 text-xs font-bold uppercase tracking-widest rounded-2xl bg-forest-dark text-white shadow-sm disabled:opacity-50"
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

          {statusMessage && <p className="text-sm text-emerald-800">{statusMessage}</p>}
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>
      )}
    </section>
  );
}
