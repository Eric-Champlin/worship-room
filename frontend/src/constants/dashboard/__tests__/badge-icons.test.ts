import { describe, it, expect } from 'vitest';
import {
  getBadgeIcon,
  CONFETTI_COLORS,
  LEVEL_ENCOURAGEMENT_MESSAGES,
  STREAK_MILESTONE_MESSAGES,
} from '../badge-icons';
import { BADGE_DEFINITIONS } from '../badges';

describe('getBadgeIcon', () => {
  it('every badge ID in BADGE_DEFINITIONS resolves an icon config', () => {
    for (const badge of BADGE_DEFINITIONS) {
      const config = getBadgeIcon(badge.id);
      expect(config).toBeDefined();
      expect(config.icon).toBeDefined();
      expect(config.bgColor).toBeTruthy();
      expect(config.textColor).toBeTruthy();
      expect(config.glowColor).toBeTruthy();
    }
  });

  it('returns correct icon for known badge IDs', () => {
    const streakConfig = getBadgeIcon('streak_7');
    expect(streakConfig.bgColor).toBe('bg-amber-500/20');
    expect(streakConfig.textColor).toBe('text-amber-400');

    const levelConfig = getBadgeIcon('level_2');
    expect(levelConfig.bgColor).toBe('bg-primary/20');
    expect(levelConfig.textColor).toBe('text-primary-lt');
  });

  it('getBadgeIcon returns config for bible_book badges', () => {
    for (const id of ['bible_book_1', 'bible_book_5', 'bible_book_10', 'bible_book_66']) {
      const config = getBadgeIcon(id);
      expect(config).toBeDefined();
      expect(config.icon).toBeDefined();
      expect(config.bgColor).toBeTruthy();
      expect(config.textColor).toBeTruthy();
      expect(config.glowColor).toBeTruthy();
    }
    // bible_book_66 uses Crown icon with amber colors
    const masterConfig = getBadgeIcon('bible_book_66');
    expect(masterConfig.bgColor).toBe('bg-amber-500/20');
    expect(masterConfig.textColor).toBe('text-amber-300');
  });

  it('returns a fallback config for unknown badge IDs', () => {
    const config = getBadgeIcon('nonexistent_badge_xyz');
    expect(config).toBeDefined();
    expect(config.icon).toBeDefined();
    expect(config.bgColor).toBeTruthy();
  });
});

describe('CONFETTI_COLORS', () => {
  it('has at least 5 entries', () => {
    expect(CONFETTI_COLORS.length).toBeGreaterThanOrEqual(5);
  });

  it('has exactly 7 entries', () => {
    expect(CONFETTI_COLORS).toHaveLength(7);
  });

  it('all entries are hex color strings', () => {
    for (const color of CONFETTI_COLORS) {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe('LEVEL_ENCOURAGEMENT_MESSAGES', () => {
  it('has messages for all 6 levels', () => {
    for (let level = 1; level <= 6; level++) {
      expect(LEVEL_ENCOURAGEMENT_MESSAGES[level]).toBeDefined();
      expect(LEVEL_ENCOURAGEMENT_MESSAGES[level]).toBeTruthy();
    }
  });

  it('messages are descriptive strings', () => {
    expect(LEVEL_ENCOURAGEMENT_MESSAGES[1]).toBe('Your journey of faith begins');
    expect(LEVEL_ENCOURAGEMENT_MESSAGES[6]).toBe('Your light shines for all to see');
  });
});

describe('STREAK_MILESTONE_MESSAGES', () => {
  it('has messages for streak milestones 60, 90, 180, 365', () => {
    const milestones = [60, 90, 180, 365];
    for (const milestone of milestones) {
      expect(STREAK_MILESTONE_MESSAGES[milestone]).toBeDefined();
      expect(STREAK_MILESTONE_MESSAGES[milestone]).toBeTruthy();
    }
  });

  it('messages contain the streak number', () => {
    expect(STREAK_MILESTONE_MESSAGES[60]).toContain('60');
    expect(STREAK_MILESTONE_MESSAGES[365]).toContain('year');
  });
});
