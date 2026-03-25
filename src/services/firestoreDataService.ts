import { collection, deleteDoc, doc as firestoreDoc, onSnapshot, or, query, setDoc, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, sanitizeData } from '../firebase';
import type { Folder, Recipe } from '../types';

export function listenToUserRecipes(userId: string, onData: (recipes: Recipe[]) => void) {
  const recipesQuery = query(collection(db, 'recipes'), where('authorUID', '==', userId));
  return onSnapshot(recipesQuery, (snapshot) => {
    const recipes: Recipe[] = [];
    snapshot.forEach((doc) => recipes.push(doc.data() as Recipe));
    onData(recipes);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'recipes');
  });
}

export function listenToAccessibleFolders(userId: string, onData: (folders: Folder[]) => void) {
  const foldersQuery = query(
    collection(db, 'folders'),
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
    handleFirestoreError(error, OperationType.LIST, 'folders');
  });
}

export function listenToSharedRecipes(folderIds: string[], onData: (recipes: Recipe[]) => void) {
  const unsubscribers: Array<() => void> = [];
  const collected = new Map<string, Recipe>();

  const emit = () => onData(Array.from(collected.values()));

  for (let i = 0; i < folderIds.length; i += 10) {
    const chunk = folderIds.slice(i, i + 10);
    const sharedQuery = query(collection(db, 'recipes'), where('folderId', 'in', chunk));
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
      handleFirestoreError(error, OperationType.LIST, 'recipes_shared');
    });
    unsubscribers.push(unsub);
  }

  return () => unsubscribers.forEach((unsub) => unsub());
}

export async function saveFolder(folder: Folder) {
  try {
    await setDoc(firestoreDoc(db, 'folders', folder.id), sanitizeData(folder));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `folders/${folder.id}`);
  }
}

export async function deleteFolder(folderId: string) {
  try {
    await deleteDoc(firestoreDoc(db, 'folders', folderId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `folders/${folderId}`);
  }
}

export async function saveRecipe(recipe: Recipe) {
  try {
    await setDoc(firestoreDoc(db, 'recipes', recipe.id), sanitizeData(recipe));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `recipes/${recipe.id}`);
  }
}

export async function deleteRecipe(recipeId: string) {
  try {
    await deleteDoc(firestoreDoc(db, 'recipes', recipeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `recipes/${recipeId}`);
  }
}
