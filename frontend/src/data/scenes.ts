import type { ScenePreset } from '@/types/music'

export const SCENE_PRESETS: ScenePreset[] = [
  {
    id: 'garden-of-gethsemane',
    name: 'Garden of Gethsemane',
    description:
      'Olive trees rustle in a warm evening breeze. Distant crickets and gentle wind carry you into the quiet place where Jesus prayed.',
    artworkFilename: 'garden-of-gethsemane.svg',
    sounds: [
      { soundId: 'night-crickets', volume: 0.55 },
      { soundId: 'gentle-wind', volume: 0.35 },
      { soundId: 'night-garden', volume: 0.45 },
      { soundId: 'singing-bowl', volume: 0.15 },
    ],
    tags: {
      mood: ['contemplative'],
      activity: ['prayer'],
      intensity: 'very_calm',
      scriptureTheme: ['trust'],
    },
    animationCategory: 'pulse',
  },
  {
    id: 'still-waters',
    name: 'Still Waters',
    description:
      'Beside quiet waters, your soul finds rest. A gentle stream flows through green pastures under a soft sky.',
    artworkFilename: 'still-waters.svg',
    sounds: [
      { soundId: 'flowing-stream', volume: 0.6 },
      { soundId: 'gentle-wind', volume: 0.25 },
      { soundId: 'forest-birds', volume: 0.3 },
      { soundId: 'gentle-harp', volume: 0.15 },
    ],
    tags: {
      mood: ['peaceful'],
      activity: ['prayer'],
      intensity: 'very_calm',
      scriptureTheme: ['comfort'],
    },
    animationCategory: 'drift',
  },
  {
    id: 'midnight-rain',
    name: 'Midnight Rain',
    description:
      'Rain patters against the window as the world sleeps. Wrapped in warmth, you listen to the rhythm of the night.',
    artworkFilename: 'midnight-rain.svg',
    sounds: [
      { soundId: 'gentle-rain', volume: 0.65 },
      { soundId: 'rainy-window', volume: 0.4 },
      { soundId: 'thunder-distant', volume: 0.2 },
    ],
    tags: {
      mood: ['peaceful'],
      activity: ['sleep'],
      intensity: 'very_calm',
      scriptureTheme: ['rest'],
    },
    animationCategory: 'drift',
  },
  {
    id: 'ember-and-stone',
    name: 'Ember & Stone',
    description:
      "A fire crackles in a quiet room. Warmth radiates through the stillness as you settle into God's presence.",
    artworkFilename: 'ember-and-stone.svg',
    sounds: [
      { soundId: 'fireplace', volume: 0.6 },
      { soundId: 'campfire', volume: 0.25 },
      { soundId: 'soft-piano', volume: 0.2 },
      { soundId: 'wind-chimes', volume: 0.1 },
    ],
    tags: {
      mood: ['contemplative'],
      activity: ['relaxation'],
      intensity: 'very_calm',
      scriptureTheme: ['comfort'],
    },
    animationCategory: 'pulse',
  },
  {
    id: 'morning-mist',
    name: 'Morning Mist',
    description:
      'Dawn breaks through a misty forest. Birds begin to sing as dew glistens on every leaf. A new mercy for a new day.',
    artworkFilename: 'morning-mist.svg',
    sounds: [
      { soundId: 'forest-birds', volume: 0.5 },
      { soundId: 'flowing-stream', volume: 0.35 },
      { soundId: 'gentle-wind', volume: 0.3 },
      { soundId: 'flute-meditative', volume: 0.15 },
    ],
    tags: {
      mood: ['uplifting'],
      activity: ['prayer'],
      intensity: 'moderate',
      scriptureTheme: ['praise'],
    },
    animationCategory: 'drift',
  },
  {
    id: 'the-upper-room',
    name: 'The Upper Room',
    description:
      'Silence fills a lamp-lit room. The disciples gather. In the hush between words, the Spirit moves.',
    artworkFilename: 'the-upper-room.svg',
    sounds: [
      { soundId: 'cathedral-reverb', volume: 0.4 },
      { soundId: 'choir-hum', volume: 0.3 },
      { soundId: 'ambient-pads', volume: 0.35 },
      { soundId: 'church-bells', volume: 0.1 },
    ],
    tags: {
      mood: ['contemplative'],
      activity: ['prayer'],
      intensity: 'immersive',
      scriptureTheme: ['trust'],
    },
    animationCategory: 'glow',
  },
  {
    id: 'starfield',
    name: 'Starfield',
    description:
      'Under an endless canopy of stars, you lie still. The universe whispers of its Creator, and you are held.',
    artworkFilename: 'starfield.svg',
    sounds: [
      { soundId: 'night-crickets', volume: 0.4 },
      { soundId: 'gentle-wind', volume: 0.2 },
      { soundId: 'ambient-pads', volume: 0.45 },
      { soundId: 'cello-slow', volume: 0.2 },
    ],
    tags: {
      mood: ['contemplative'],
      activity: ['sleep'],
      intensity: 'very_calm',
      scriptureTheme: ['trust'],
    },
    animationCategory: 'glow',
  },
  {
    id: 'mountain-refuge',
    name: 'Mountain Refuge',
    description:
      'High above the valley, wind sweeps across ancient stone. Here, like Moses, you meet God on the mountain.',
    artworkFilename: 'mountain-refuge.svg',
    sounds: [
      { soundId: 'gentle-wind', volume: 0.55 },
      { soundId: 'flowing-stream', volume: 0.3 },
      { soundId: 'church-bells', volume: 0.15 },
      { soundId: 'acoustic-guitar', volume: 0.2 },
    ],
    tags: {
      mood: ['uplifting'],
      activity: ['prayer'],
      intensity: 'moderate',
      scriptureTheme: ['praise'],
    },
    animationCategory: 'drift',
  },
  {
    id: 'peaceful-study',
    name: 'Peaceful Study',
    description:
      'A calm, non-distracting atmosphere for focused reading. Soft piano and gentle streams guide your mind into the Word.',
    artworkFilename: 'peaceful-study.svg',
    sounds: [
      { soundId: 'soft-piano', volume: 0.3 },
      { soundId: 'gentle-wind', volume: 0.2 },
      { soundId: 'flowing-stream', volume: 0.25 },
    ],
    tags: {
      mood: ['peaceful'],
      activity: ['bible-reading', 'study'],
      intensity: 'very_calm',
      scriptureTheme: ['comfort'],
    },
    animationCategory: 'drift',
  },
  {
    id: 'evening-scripture',
    name: 'Evening Scripture',
    description:
      'A warm evening atmosphere for winding down with the Word. Crickets chirp softly as a fire crackles nearby.',
    artworkFilename: 'evening-scripture.svg',
    sounds: [
      { soundId: 'night-crickets', volume: 0.25 },
      { soundId: 'fireplace', volume: 0.3 },
      { soundId: 'ambient-pads', volume: 0.2 },
    ],
    tags: {
      mood: ['contemplative'],
      activity: ['bible-reading', 'sleep'],
      intensity: 'very_calm',
      scriptureTheme: ['rest'],
    },
    animationCategory: 'pulse',
  },
  {
    id: 'sacred-space',
    name: 'Sacred Space',
    description:
      'A reverent, church-like atmosphere. Cathedral echoes and a distant choir hum fill the stillness around you.',
    artworkFilename: 'sacred-space.svg',
    sounds: [
      { soundId: 'cathedral-reverb', volume: 0.2 },
      { soundId: 'choir-hum', volume: 0.15 },
      { soundId: 'church-bells', volume: 0.1 },
    ],
    tags: {
      mood: ['contemplative'],
      activity: ['bible-reading', 'prayer'],
      intensity: 'immersive',
      scriptureTheme: ['trust'],
    },
    animationCategory: 'glow',
  },
]

/** First 3 scenes are featured at the top of the browse area */
export const FEATURED_SCENE_IDS = [
  'garden-of-gethsemane',
  'still-waters',
  'midnight-rain',
] as const

/** Lookup a scene by ID */
export const SCENE_BY_ID = new Map<string, ScenePreset>(
  SCENE_PRESETS.map((s) => [s.id, s]),
)
