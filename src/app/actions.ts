"use server";

import {
  adjustDifficulty as adjustDifficultyAdaptive,
  type AdjustDifficultyInput,
  type AdjustDifficultyOutput,
} from '@/ai/flows/adaptive-difficulty';

export async function getAdaptiveDifficulty(input: AdjustDifficultyInput): Promise<AdjustDifficultyOutput> {
  try {
    const result = await adjustDifficultyAdaptive(input);
    return result;
  } catch (error) {
    console.error("Error getting adaptive difficulty:", error);
    // Return default/safe values in case of AI error
    return {
      enemySpawnRate: 1,
      enemyAttackPower: 1,
      enemySpeed: 1,
      powerUpFrequency: 0.1,
    };
  }
}
