import { collection, deleteDoc, doc as firestoreDoc, onSnapshot, or, query, setDoc, where } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '../config/householdModel';
import { createFirestoreErrorInfo, db, handleFirestoreError, OperationType, sanitizeData, type FirestoreErrorInfo } from '../firebase';
import type { Folder, Household, Recipe } from '../types';

export type RecipeDocument = Recipe;
export type FolderDocument = Folder;
export type HouseholdDocument = Household;

export function listenToUserRecipes(userId: string, onData: (recipes: Recipe[]) => void, onError?: (error: FirestoreErrorInfo) => void) {
  const recipesQuery = query(collection(db, FIRESTORE_COLLECTIONS.recipes), where('authorUID', '==', userId));
  return onSnapshot(recipesQuery, (snapshot) => {
    const recipes: Recipe[] = [];
    snapshot.forEach((doc) => recipes.push(doc.data() as Recipe));
    onData(recipes);
  }, (error) => {
    const errInfo = createFirestoreErrorInfo(error, OperationType.LIST, 'recipes');
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    onError?.(errInfo);
  });
}

export function listenToAccessibleFolders(userId: string, onData: (folders: Folder[]) => void, onError?: (error: FirestoreErrorInfo) => void) {
  const foldersQuery = query(
    collection(db, FIRESTORE_COLLECTIONS.folders),
    or(
      where('ownerUID', '==', userId),
      where('editorUids', 'array-contains', userId),
      where('viewerUids', 'array-contains', userId),
    )
  );

  return onSnapshot(foldersQuery, (snapshot) => {
    const folders: Folder[] = [];
    snapshot.forEach((doc) => folders.push(doc.data() as Folder));
    onData(folders);
  }, (error) => {
    const errInfo = createFirestoreErrorInfo(error, OperationType.LIST, 'folders');
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    onError?.(errInfo);
  });
}

export function listenToSharedRecipes(folderIds: string[], onData: (recipes: Recipe[]) => void, onError?: (error: FirestoreErrorInfo) => void) {
  const unsubscribers: Array<() => void> = [];
  const collected = new Map<string, Recipe>();

  const emit = () => onData(Array.from(collected.values()));

  for (let i = 0; i < folderIds.length; i += 10) {
    const chunk = folderIds.slice(i, i + 10);
    const sharedQuery = query(collection(db, FIRESTORE_COLLECTIONS.recipes), where('folderId', 'in', chunk));
    const unsub = onSnapshot(sharedQuery, (snapshot) => {
      // remove chunk recipes first then re-add from snapshot for correctness
      for (const [id, recipe] of collected.entries()) {
        if (recipe.folderId && chunk.includes(recipe.folderId)) {
          collected.delete(id);
        }
      }
      snapshot.forEach((doc) => {
        const recipe = doc.data() as Recipe;
        collected.set(recipe.id, recipe);
      });
      emit();
    }, (error) => {
      const errInfo = createFirestoreErrorInfo(error, OperationType.LIST, 'recipes_shared');
      console.error('Firestore Error: ', JSON.stringify(errInfo));
      onError?.(errInfo);
    });
    unsubscribers.push(unsub);
  }

  return () => unsubscribers.forEach((unsub) => unsub());
}

export async function saveFolder(folder: Folder) {
  try {
    await setDoc(firestoreDoc(db, FIRESTORE_COLLECTIONS.folders, folder.id), sanitizeData(folder));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `folders/${folder.id}`);
  }
}

export async function deleteFolder(folderId: string) {
  try {
    await deleteDoc(firestoreDoc(db, FIRESTORE_COLLECTIONS.folders, folderId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `folders/${folderId}`);
  }
}

export async function saveRecipe(recipe: Recipe) {
  try {
    await setDoc(firestoreDoc(db, FIRESTORE_COLLECTIONS.recipes, recipe.id), sanitizeData(recipe));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `recipes/${recipe.id}`);
  }
}

export async function deleteRecipe(recipeId: string) {
  try {
    await deleteDoc(firestoreDoc(db, FIRESTORE_COLLECTIONS.recipes, recipeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `recipes/${recipeId}`);
  }
}
