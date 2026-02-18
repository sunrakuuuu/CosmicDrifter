'use server';

/**
 * @fileOverview An AI agent that dynamically adjusts game difficulty based on player skill.
 *
 * - adjustDifficulty - A function that adjusts the game difficulty based on player skill level.
 * - AdjustDifficultyInput - The input type for the adjustDifficulty function.
 * - AdjustDifficultyOutput - The return type for the adjustDifficulty function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdjustDifficultyInputSchema = z.object({
  playerScore: z
    .number()
    .describe('The player score in the current game session.'),
  level: z.number().describe('The current level the player is on.'),
  enemiesDefeated: z
    .number()
    .describe('The number of enemies defeated by the player.'),
  powerUpsCollected: z
    .number()
    .describe('The number of power-ups collected by the player.'),
  gameTime: z
    .number()
    .describe('The time in seconds that the player has been playing.'),
});
export type AdjustDifficultyInput = z.infer<typeof AdjustDifficultyInputSchema>;

const AdjustDifficultyOutputSchema = z.object({
  enemySpawnRate: z
    .number()
    .describe(
      'The rate at which enemies should spawn, higher values mean more enemies.'
    ),
  enemyAttackPower: z
    .number()
    .describe(
      'The attack power of the enemies, higher values mean more damage to the player.'
    ),
  enemySpeed: z
    .number()
    .describe('The speed of the enemies, higher values mean faster enemies.'),
  powerUpFrequency: z
    .number()
    .describe(
      'The frequency at which power-ups should spawn, higher values mean more power-ups.'
    ),
});
export type AdjustDifficultyOutput = z.infer<typeof AdjustDifficultyOutputSchema>;

export async function adjustDifficulty(input: AdjustDifficultyInput): Promise<AdjustDifficultyOutput> {
  return adjustDifficultyFlow(input);
}

const adjustDifficultyPrompt = ai.definePrompt({
  name: 'adjustDifficultyPrompt',
  input: {schema: AdjustDifficultyInputSchema},
  output: {schema: AdjustDifficultyOutputSchema},
  prompt: `You are an expert game balancer AI, adept at analyzing player performance and adjusting game difficulty to maintain engagement without causing frustration.

  Based on the following player statistics, determine the appropriate game difficulty adjustments:

  Player Score: {{{playerScore}}}
  Current Level: {{{level}}}
  Enemies Defeated: {{{enemiesDefeated}}}
  Power-Ups Collected: {{{powerUpsCollected}}}
  Game Time (seconds): {{{gameTime}}}

  Consider these factors when adjusting the difficulty:
  - A high score, many enemies defeated, many power-ups collected, and long game time indicate the player is skilled and the difficulty should be increased.
  - A low score, few enemies defeated, few power-ups collected, and short game time indicate the player is struggling and the difficulty should be decreased.

  Respond with values that dynamically adjust the game to appropriately challenge the player based on their displayed skill.

  Here are the adjustments you can make:
  - enemySpawnRate: The rate at which enemies spawn, higher values mean more enemies.
  - enemyAttackPower: The attack power of the enemies, higher values mean more damage to the player.
  - enemySpeed: The speed of the enemies, higher values mean faster enemies.
  - powerUpFrequency: The frequency at which power-ups spawn, higher values mean more power-ups.
  `,
});

const adjustDifficultyFlow = ai.defineFlow(
  {
    name: 'adjustDifficultyFlow',
    inputSchema: AdjustDifficultyInputSchema,
    outputSchema: AdjustDifficultyOutputSchema,
  },
  async input => {
    const {output} = await adjustDifficultyPrompt(input);
    return output!;
  }
);
