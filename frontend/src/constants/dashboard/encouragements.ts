export const ENCOURAGEMENT_PRESETS = [
  'Praying for you',
  'Keep going!',
  'Proud of you',
  'Thinking of you',
] as const;

export type EncouragementPreset = (typeof ENCOURAGEMENT_PRESETS)[number];

export const MAX_ENCOURAGEMENTS_PER_FRIEND_PER_DAY = 3;
export const NUDGE_COOLDOWN_DAYS = 7;
export const NUDGE_INACTIVE_THRESHOLD_DAYS = 3;
export const MILESTONE_FEED_CAP = 20;
