export interface LevelDefinition {
  level: number;
  name: string;
  threshold: number;
}

export const LEVEL_THRESHOLDS: LevelDefinition[] = [
  { level: 1, name: 'Seedling', threshold: 0 },
  { level: 2, name: 'Sprout', threshold: 100 },
  { level: 3, name: 'Blooming', threshold: 500 },
  { level: 4, name: 'Flourishing', threshold: 1500 },
  { level: 5, name: 'Oak', threshold: 4000 },
  { level: 6, name: 'Lighthouse', threshold: 10000 },
];

// Lucide icon component names for each level (temporary — Spec 7/8 may introduce custom icons)
export const LEVEL_ICON_NAMES: Record<number, string> = {
  1: 'Sprout',       // Seedling level
  2: 'Leaf',         // Sprout level
  3: 'Flower2',      // Blooming level
  4: 'TreePine',     // Flourishing level
  5: 'Trees',        // Oak level
  6: 'Landmark',     // Lighthouse level
} as const;

export function getLevelForPoints(points: number): {
  level: number;
  name: string;
  pointsToNextLevel: number;
} {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i].threshold) {
      const nextThreshold = LEVEL_THRESHOLDS[i + 1]?.threshold ?? null;
      return {
        level: LEVEL_THRESHOLDS[i].level,
        name: LEVEL_THRESHOLDS[i].name,
        pointsToNextLevel: nextThreshold !== null ? nextThreshold - points : 0,
      };
    }
  }
  return { level: 1, name: 'Seedling', pointsToNextLevel: 100 };
}
