async function request<T>(url: string, body: unknown): Promise<T> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Du er offline. AI-funktioner kræver internetforbindelse.');
  }
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await resp.json().catch(() => null);
  if (!resp.ok) {
    throw new Error(data?.error || 'Der opstod en fejl ved AI-kaldet. Prøv igen om lidt.');
  }
  return data as T;
}

export async function adjustRecipe(recipe: any, instruction: string): Promise<any> {
  const data = await request<{ recipe: any }>('/api/ai/adjust', { recipe, instruction });
  return data.recipe;
}

export async function generateSteps(recipe: any, level?: string): Promise<any> {
  const data = await request<{ recipe: any }>('/api/ai/generate-steps', { recipe, level });
  return data.recipe;
}

export async function fillRest(recipe: any, level?: string): Promise<any> {
  const data = await request<{ recipe: any }>('/api/ai/fill-rest', { recipe, level });
  return data.recipe;
}

export async function generateTips(recipe: any): Promise<string[]> {
  const data = await request<{ tipsAndTricks: string[] }>('/api/ai/generate-tips', { recipe });
  return data.tipsAndTricks;
}

export async function applyPrefix(recipe: any, prefix: string): Promise<any> {
  const data = await request<{ recipe: any }>('/api/ai/apply-prefix', { recipe, prefix });
  return data.recipe;
}

export interface ImportRecipePayload {
  sourceType: 'url' | 'text' | 'file' | 'image';
  textContent?: string;
  isStructuredData?: boolean;
  fileData?: { data: string; mimeType: string };
  level?: string;
}

export async function importRecipe(payload: ImportRecipePayload): Promise<any> {
  const data = await request<{ parsedData: any }>('/api/ai/import', payload);
  return data.parsedData;
}
