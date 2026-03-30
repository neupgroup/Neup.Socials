// use server'

/**
 * @fileOverview AI-powered content suggestion tool that analyzes trends and generates engaging copy variations.
 *
 * - generatePostVariations - A function that handles the post variations generation process.
 * - GeneratePostVariationsInput - The input type for the generatePostVariations function.
 * - GeneratePostVariationsOutput - The return type for the generatePostVariations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePostVariationsInputSchema = z.object({
  initialPostIdea: z.string().describe('The initial post idea provided by the user.'),
  platform: z.enum(['Facebook', 'Twitter', 'LinkedIn', 'Instagram']).describe('The social media platform for which the content is being generated.'),
  tone: z.string().optional().describe('The desired tone of the post variations (e.g., professional, funny, informal).'),
  numVariations: z.number().int().min(1).max(5).default(3).describe('The number of post variations to generate.'),
});

export type GeneratePostVariationsInput = z.infer<typeof GeneratePostVariationsInputSchema>;

const GeneratePostVariationsOutputSchema = z.object({
  variations: z.array(z.string()).describe('An array of engaging copy variations for the specified social media platform.'),
});

export type GeneratePostVariationsOutput = z.infer<typeof GeneratePostVariationsOutputSchema>;

export async function generatePostVariations(input: GeneratePostVariationsInput): Promise<GeneratePostVariationsOutput> {
  return generatePostVariationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePostVariationsPrompt',
  input: {schema: GeneratePostVariationsInputSchema},
  output: {schema: GeneratePostVariationsOutputSchema},
  prompt: `You are a social media expert. Generate engaging copy variations for the following post idea, tailored for the specified platform and tone.

Initial Post Idea: {{{initialPostIdea}}}
Platform: {{{platform}}}
Tone: {{tone}}

Ensure each variation is unique and optimized for the platform.

Output {{numVariations}} variations.

Variations:
{{#each (range numVariations)}}
{{@index}}. 
{{/each}}`,
  config: {
    temperature: 0.7,
    maxOutputTokens: 500,
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const generatePostVariationsFlow = ai.defineFlow(
  {
    name: 'generatePostVariationsFlow',
    inputSchema: GeneratePostVariationsInputSchema,
    outputSchema: GeneratePostVariationsOutputSchema,
  },
  async input => {
    // Create an array of numbers from 0 to numVariations - 1 for Handlebars
    const {output} = await prompt(input);
    return output!;
  }
);
