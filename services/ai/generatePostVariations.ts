'use server';

import { generatePostVariations, GeneratePostVariationsInput, GeneratePostVariationsOutput } from '@/core/ai/flows/generate-post-variations';

export async function generatePostVariationsAction(
  input: GeneratePostVariationsInput
): Promise<{ success: boolean; data?: GeneratePostVariationsOutput; error?: string }> {
  try {
    const output = await generatePostVariations(input);
    return { success: true, data: output };
  } catch (e: any) {
    console.error(e);
    return { success: false, error: e.message || 'An unknown error occurred.' };
  }
}
