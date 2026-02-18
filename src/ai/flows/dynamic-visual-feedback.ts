'use server';

/**
 * @fileOverview Adjusts enemy spawn rates and attack patterns based on player skill.
 *
 * - adjustDifficulty - A function that adjusts the game difficulty.
 * - AdjustDifficultyInput - The input type for the adjustDifficulty function.
 * - AdjustDifficultyOutput - The return type for the adjustDifficulty function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdjustDifficultyInputSchema = z.object({
  playerScore: z
    .number()
    .describe('The current score of the player.'),
  level: z
    .number()
    .describe('The current level of the game.'),
  enemiesDefeated: z
    .number()
    .describe('The number of enemies defeated by the player.'),
  timeElapsed: z
    .number()
    .describe('The time elapsed since the game started in seconds.'),
});
export type AdjustDifficultyInput = z.infer<typeof AdjustDifficultyInputSchema>;

const AdjustDifficultyOutputSchema = z.object({
  spawnRateMultiplier: z
    .number()
    .describe('A multiplier for the enemy spawn rate.'),
  enemyAttackPattern: z
    .string()
    .describe('The attack pattern of the enemies.'),
  powerUpFrequency: z
    .number()
    .describe('The frequency of power-up spawns (0-1).'),
});
export type AdjustDifficultyOutput = z.infer<typeof AdjustDifficultyOutputSchema>;

export async function adjustDifficulty(input: AdjustDifficultyInput): Promise<AdjustDifficultyOutput> {
  return adjustDifficultyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'adjustDifficultyPrompt',
  input: {schema: AdjustDifficultyInputSchema},
  output: {schema: AdjustDifficultyOutputSchema},
  prompt: `You are an AI game master adjusting the difficulty of a space shooter game.

  The player's performance is characterized by the following:
  - Current score: {{{playerScore}}}
  - Current level: {{{level}}}
  - Enemies defeated: {{{enemiesDefeated}}}
  - Time elapsed: {{{timeElapsed}}} seconds

  Based on the player's performance, adjust the game difficulty by setting the following parameters:
  - spawnRateMultiplier: A multiplier for the enemy spawn rate. Higher values mean more frequent spawns. If the player is doing well, increase this. If the player is struggling, decrease it.
  - enemyAttackPattern: Describe the attack pattern of the enemies. Examples: 'aggressive', 'defensive', 'random', 'coordinated'. If the player is doing well, make this more challenging. If the player is struggling, make this easier.
  - powerUpFrequency: The frequency of power-up spawns, ranging from 0 (never) to 1 (very frequent). If the player is struggling, increase this. If the player is doing well, keep this low or moderate.

  Provide the output parameters as a valid JSON object.

  Consider the game's design, that it should reward skilled gameplay, but not overwhelm the player.
`,
});

const adjustDifficultyFlow = ai.defineFlow(
  {
    name: 'adjustDifficultyFlow',
    inputSchema: AdjustDifficultyInputSchema,
    outputSchema: AdjustDifficultyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
