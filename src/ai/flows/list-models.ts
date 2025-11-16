'use server';

/**
 * @fileOverview A flow to list available GenAI models.
 */

import { ai } from '@/ai/genkit';
import { listModels } from 'genkit';
import { z } from 'genkit';

const ListModelsOutputSchema = z.object({
  models: z.array(
    z.object({
      name: z.string().describe('The full name of the model.'),
      label: z.string().describe('A user-friendly label for the model.'),
      supports: z.string().describe('What the model supports (e.g., generate).'),
    })
  ).describe('An array of available models.'),
});
export type ListModelsOutput = z.infer<typeof ListModelsOutputSchema>;

export async function listAvailableModels(): Promise<ListModelsOutput> {
  return listModelsFlow();
}

const listModelsFlow = ai.defineFlow(
  {
    name: 'listModelsFlow',
    outputSchema: ListModelsOutputSchema,
  },
  async () => {
    const models = await listModels();
    
    const formattedModels = models.map(m => ({
        name: m.name,
        label: m.label,
        supports: m.supports.map(s => s).join(', ')
    }));

    return { models: formattedModels };
  }
);
