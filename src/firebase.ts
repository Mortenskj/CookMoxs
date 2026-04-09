import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, onSnapshot, query, where, deleteDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

interface FirebaseAppletConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
}

const typedFirebaseConfig = firebaseConfig as FirebaseAppletConfig;

export const app = initializeApp(typedFirebaseConfig);

// Initialize Firestore with the specific database ID
export const db = typedFirebaseConfig.firestoreDatabaseId
  ? getFirestore(app, typedFirebaseConfig.firestoreDatabaseId)
  : getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
export const analyticsPromise: Promise<Analytics | null> =
  typeof window !== 'undefined' && typeof document !== 'undefined' && Boolean(typedFirebaseConfig.measurementId)
    ? isSupported()
        .then((supported) => (supported ? getAnalytics(app) : null))
        .catch(() => null)
    : Promise.resolve(null);

export { signInWithPopup, signOut, onAuthStateChanged };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  code?: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo?: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function getFirestoreErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error && typeof (error as { code?: unknown }).code === 'string') {
    return (error as { code: string }).code;
  }
  return undefined;
}

export function createFirestoreErrorInfo(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  return {
    error: error instanceof Error ? error.message : String(error),
    code: getFirestoreErrorCode(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
}

export function sanitizeData(data: any): any {
  if (data === null || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }

  const sanitized: any = {};
  for (const key in data) {
    if (data[key] !== undefined) {
      sanitized[key] = sanitizeData(data[key]);
    }
  }
  return sanitized;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = createFirestoreErrorInfo(error, operationType, path);
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
