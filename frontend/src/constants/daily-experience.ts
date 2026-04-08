export const DAILY_COMPLETION_KEY = 'wr_daily_completion'
export const JOURNAL_DRAFT_KEY = 'wr_journal_draft'
export const PRAYER_DRAFT_KEY = 'wr_prayer_draft'
export const JOURNAL_MILESTONES_KEY = 'wr_journal_milestones'
export const JOURNAL_MODE_KEY = 'wr_journal_mode'
export const SPOTIFY_PLAYLIST_URL =
  'https://open.spotify.com/playlist/5Ux99VLE8cG7W656CjR2si'
export const SPOTIFY_EMBED_BASE = 'https://open.spotify.com/embed/track'

export const MEDITATION_TYPES = [
  {
    id: 'breathing',
    title: 'Breathing Exercise',
    icon: 'Wind',
    description: 'A guided 4-7-8 breathing pattern with scripture',
    time: '2-10 min',
  },
  {
    id: 'soaking',
    title: 'Scripture Soaking',
    icon: 'BookOpen',
    description: 'Sit quietly with a single verse and let it sink in',
    time: '2-10 min',
  },
  {
    id: 'gratitude',
    title: 'Gratitude Reflection',
    icon: 'Heart',
    description: "Name the things you're thankful for today",
    time: '5 min',
  },
  {
    id: 'acts',
    title: 'ACTS Prayer Walk',
    icon: 'Footprints',
    description:
      'A four-step guided prayer through Adoration, Confession, Thanksgiving, and Supplication',
    time: '10-15 min',
  },
  {
    id: 'psalm',
    title: 'Psalm Reading',
    icon: 'Scroll',
    description: 'Read through a Psalm slowly, one verse at a time',
    time: '5-10 min',
  },
  {
    id: 'examen',
    title: 'Examen',
    icon: 'Search',
    description: 'A five-step evening reflection on your day with God',
    time: '10-15 min',
  },
] as const


export const DEFAULT_PRAYER_CHIPS = [
  "I'm struggling with...",
  'Help me forgive...',
  'I feel lost about...',
] as const

export const BREATHING_PHASES = {
  breatheIn: { label: 'Breathe in', duration: 4 },
  hold: { label: 'Hold', duration: 7 },
  breatheOut: { label: 'Breathe out', duration: 8 },
} as const

export const VERSE_FRAMINGS = {
  pray: 'What do you want to say to God about this?',
  journal: 'What comes up as you sit with this?',
  meditate: '',
} as const

export const DURATION_OPTIONS = [2, 5, 10] as const
