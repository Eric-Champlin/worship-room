import type { RoutineDefinition } from '@/types/storage'

export const ROUTINE_TEMPLATES: RoutineDefinition[] = [
  {
    id: 'template-evening-peace',
    name: 'Evening Peace',
    description: 'Ease into rest with Still Waters and the calming words of Psalm 23.',
    isTemplate: true,
    steps: [
      {
        id: 'ep-step-1',
        type: 'scene',
        contentId: 'still-waters',
        transitionGapMinutes: 0,
      },
      {
        id: 'ep-step-2',
        type: 'scripture',
        contentId: 'psalm-23',
        transitionGapMinutes: 2,
      },
    ],
    sleepTimer: { durationMinutes: 45, fadeDurationMinutes: 15 },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'template-scripture-and-sleep',
    name: 'Scripture & Sleep',
    description:
      'Midnight rain sets the mood while a comforting scripture reading carries you to sleep.',
    isTemplate: true,
    steps: [
      {
        id: 'ss-step-1',
        type: 'scene',
        contentId: 'midnight-rain',
        transitionGapMinutes: 0,
      },
      {
        id: 'ss-step-2',
        type: 'scripture',
        contentId: 'comfort-and-rest', // resolved to random reading at start time
        transitionGapMinutes: 1,
      },
    ],
    sleepTimer: { durationMinutes: 30, fadeDurationMinutes: 10 },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'template-deep-rest',
    name: 'Deep Rest',
    description:
      'A longer wind-down with the Garden of Gethsemane scene and a narrated bedtime story.',
    isTemplate: true,
    steps: [
      {
        id: 'dr-step-1',
        type: 'scene',
        contentId: 'garden-of-gethsemane',
        transitionGapMinutes: 0,
      },
      {
        id: 'dr-step-2',
        type: 'story',
        contentId: 'elijah-and-the-still-small-voice',
        transitionGapMinutes: 5,
      },
    ],
    sleepTimer: { durationMinutes: 90, fadeDurationMinutes: 30 },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'template-bible-before-bed',
    name: 'Bible Before Bed',
    description:
      'Let the Psalms carry you to sleep. Warm ambient sounds set the mood while a Psalm is read aloud — a timeless way to end the day.',
    isTemplate: true,
    steps: [
      {
        id: 'bbb-step-1',
        type: 'scene',
        contentId: 'evening-scripture',
        transitionGapMinutes: 0,
      },
      {
        id: 'bbb-step-2',
        type: 'bible-navigate',
        contentId: 'psalms',
        transitionGapMinutes: 0,
      },
    ],
    sleepTimer: { durationMinutes: 30, fadeDurationMinutes: 10 },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
]
