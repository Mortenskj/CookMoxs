import { collection, deleteDoc, doc as firestoreDoc, getDoc, onSnapshot, or, query, setDoc, where } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '../config/householdModel';
import { createFirestoreErrorInfo, db, handleFirestoreError, OperationType, sanitizeData, type FirestoreErrorInfo } from '../firebase';
import type { Household, HouseholdMember, HouseholdRole } from '../types';

type ManagedHouseholdRole = Exclude<HouseholdRole, 'owner'>;

export interface CreateHouseholdInput {
  id?: string;
  name: string;
  ownerUID: string;
  ownerEmail?: string | null;
  ownerDisplayName?: string | null;
}

export interface HouseholdInviteInput {
  email: string;
  role?: ManagedHouseholdRole;
}

export interface HouseholdMemberRef {
  uid?: string;
  email?: string | null;
}

const normalizeEmail = (email?: string | null) => email?.trim().toLowerCase() || null;

const matchesMember = (member: HouseholdMember, ref: HouseholdMemberRef) => {
  if (ref.uid && member.uid === ref.uid) return true;
  const targetEmail = normalizeEmail(ref.email);
  return !!targetEmail && normalizeEmail(member.email) === targetEmail;
};

const syncMembershipIndexes = (household: Household): Household => {
  const members = household.members || [];
  const adminUids = members
    .filter((member) => member.status === 'active' && member.role === 'admin' && member.uid)
    .map((member) => member.uid as string);
  const memberUids = members
    .filter((member) => member.status === 'active' && member.role === 'member' && member.uid)
    .map((member) => member.uid as string);

  return {
    ...household,
    adminUids,
    memberUids,
    members,
  };
};

export const buildHousehold = ({ id, name, ownerUID, ownerEmail, ownerDisplayName }: CreateHouseholdInput): Household =>
  syncMembershipIndexes({
    id: id || Date.now().toString(),
    name: name.trim(),
    ownerUID,
    members: [{
      uid: ownerUID,
      email: normalizeEmail(ownerEmail),
      displayName: ownerDisplayName || null,
      role: 'owner',
      status: 'active',
      joinedAt: new Date().toISOString(),
    }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

export async function getHousehold(householdId: string) {
  try {
    const snapshot = await getDoc(firestoreDoc(db, FIRESTORE_COLLECTIONS.households, householdId));
    return snapshot.exists() ? snapshot.data() as Household : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `households/${householdId}`);
  }
}

export function listenToAccessibleHouseholds(userId: string, onData: (households: Household[]) => void, onError?: (error: FirestoreErrorInfo) => void) {
  const householdsQuery = query(
    collection(db, FIRESTORE_COLLECTIONS.households),
    or(
      where('ownerUID', '==', userId),
      where('adminUids', 'array-contains', userId),
      where('memberUids', 'array-contains', userId),
    ),
  );

  return onSnapshot(householdsQuery, (snapshot) => {
    const households: Household[] = [];
    snapshot.forEach((doc) => households.push(doc.data() as Household));
    onData(households);
  }, (error) => {
    onError?.(createFirestoreErrorInfo(error, OperationType.LIST, 'households'));
  });
}

export function listenToHousehold(householdId: string, onData: (household: Household | null) => void, onError?: (error: FirestoreErrorInfo) => void) {
  return onSnapshot(firestoreDoc(db, FIRESTORE_COLLECTIONS.households, householdId), (snapshot) => {
    onData(snapshot.exists() ? snapshot.data() as Household : null);
  }, (error) => {
    onError?.(createFirestoreErrorInfo(error, OperationType.GET, `households/${householdId}`));
  });
}

export async function saveHousehold(household: Household) {
  const nextHousehold = syncMembershipIndexes({
    ...household,
    updatedAt: new Date().toISOString(),
  });

  try {
    await setDoc(firestoreDoc(db, FIRESTORE_COLLECTIONS.households, nextHousehold.id), sanitizeData(nextHousehold));
    return nextHousehold;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `households/${nextHousehold.id}`);
  }
}

export async function createHousehold(input: CreateHouseholdInput) {
  const household = buildHousehold(input);
  return saveHousehold(household);
}

export async function inviteHouseholdMember(householdId: string, invite: HouseholdInviteInput) {
  const household = await getHousehold(householdId);
  if (!household) throw new Error('Household not found.');

  const email = normalizeEmail(invite.email);
  if (!email) throw new Error('Invite email is required.');

  const role = invite.role || 'member';
  const existing = household.members?.find((member) => normalizeEmail(member.email) === email);
  const nextMembers = existing
    ? (household.members || []).map((member) => normalizeEmail(member.email) === email ? { ...member, role } : member)
    : [...(household.members || []), { email, role, status: 'invited' as const, invitedAt: new Date().toISOString() }];

  return saveHousehold({ ...household, members: nextMembers });
}

export async function activateHouseholdMembership(householdId: string, memberRef: HouseholdMemberRef & { uid: string; displayName?: string | null }) {
  const household = await getHousehold(householdId);
  if (!household) throw new Error('Household not found.');

  const existing = household.members?.find((member) => matchesMember(member, memberRef));
  if (!existing) throw new Error('Household invite not found.');

  const nextMembers = (household.members || []).map((member) => {
    if (!matchesMember(member, memberRef)) return member;
    return {
      ...member,
      uid: memberRef.uid,
      displayName: memberRef.displayName ?? member.displayName ?? null,
      email: normalizeEmail(memberRef.email) || member.email || null,
      status: 'active' as const,
      joinedAt: member.joinedAt || new Date().toISOString(),
    };
  });

  return saveHousehold({ ...household, members: nextMembers });
}

export async function updateHouseholdMemberRole(householdId: string, memberRef: HouseholdMemberRef, role: ManagedHouseholdRole) {
  const household = await getHousehold(householdId);
  if (!household) throw new Error('Household not found.');

  const nextMembers = (household.members || []).map((member) => {
    if (!matchesMember(member, memberRef) || member.role === 'owner') return member;
    return { ...member, role };
  });

  return saveHousehold({ ...household, members: nextMembers });
}

export async function removeHouseholdMember(householdId: string, memberRef: HouseholdMemberRef) {
  const household = await getHousehold(householdId);
  if (!household) throw new Error('Household not found.');

  const nextMembers = (household.members || []).filter((member) => !matchesMember(member, memberRef) || member.role === 'owner');
  return saveHousehold({ ...household, members: nextMembers });
}

export async function deleteHousehold(householdId: string) {
  try {
    await deleteDoc(firestoreDoc(db, FIRESTORE_COLLECTIONS.households, householdId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `households/${householdId}`);
  }
}
