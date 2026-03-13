import type { BedtimeStory } from '@/types/music'

export const BEDTIME_STORIES: BedtimeStory[] = [
  {
    id: 'noah-and-the-great-flood',
    title: 'Noah and the Great Flood',
    description:
      'The world grows dark with wickedness, but one faithful man hears God\u2019s voice. As rain begins to fall, Noah\u2019s trust is rewarded with a promise written in the sky.',
    audioFilename: 'stories/noah-and-the-great-flood.mp3',
    durationSeconds: 1080,
    voiceId: 'male',
    lengthCategory: 'medium',
    tags: ['faith', 'trust', 'old-testament', 'obedience'],
  },
  {
    id: 'david-and-the-giant',
    title: 'David and the Giant',
    description:
      'A shepherd boy steps onto a battlefield where warriors tremble. With nothing but a sling and unshakable faith, David faces the impossible.',
    audioFilename: 'stories/david-and-the-giant.mp3',
    durationSeconds: 960,
    voiceId: 'female',
    lengthCategory: 'medium',
    tags: ['courage', 'faith', 'old-testament', 'victory'],
  },
  {
    id: 'daniel-in-the-lions-den',
    title: 'Daniel in the Lions\u2019 Den',
    description:
      'The den is sealed. Lions pace in the darkness. But Daniel kneels in peace, knowing his God has never failed him.',
    audioFilename: 'stories/daniel-in-the-lions-den.mp3',
    durationSeconds: 600,
    voiceId: 'male',
    lengthCategory: 'short',
    tags: ['faith', 'courage', 'old-testament', 'protection'],
  },
  {
    id: 'joseph-and-the-coat-of-many-colors',
    title: 'Joseph and the Coat of Many Colors',
    description:
      'Betrayed by his brothers, sold into slavery, forgotten in prison \u2014 yet Joseph\u2019s story is one of patience, forgiveness, and God\u2019s hidden hand.',
    audioFilename: 'stories/joseph-and-the-coat-of-many-colors.mp3',
    durationSeconds: 1680,
    voiceId: 'female',
    lengthCategory: 'long',
    tags: ['forgiveness', 'patience', 'old-testament', 'providence'],
  },
  {
    id: 'the-good-samaritan',
    title: 'The Good Samaritan',
    description:
      'On a dusty road, a wounded man lies forgotten. Those who should help pass by. Then a stranger \u2014 an unlikely hero \u2014 stops.',
    audioFilename: 'stories/the-good-samaritan.mp3',
    durationSeconds: 540,
    voiceId: 'male',
    lengthCategory: 'short',
    tags: ['compassion', 'love', 'new-testament', 'parable'],
  },
  {
    id: 'the-prodigal-son',
    title: 'The Prodigal Son',
    description:
      'A son demands his inheritance and wanders far from home. But a father\u2019s love does not wander. It waits.',
    audioFilename: 'stories/the-prodigal-son.mp3',
    durationSeconds: 1020,
    voiceId: 'female',
    lengthCategory: 'medium',
    tags: ['forgiveness', 'love', 'new-testament', 'parable', 'grace'],
  },
  {
    id: 'jesus-calms-the-storm',
    title: 'Jesus Calms the Storm',
    description:
      'Waves crash over the bow. The disciples cry out in terror. And in the back of the boat, Jesus sleeps \u2014 until He speaks to the wind.',
    audioFilename: 'stories/jesus-calms-the-storm.mp3',
    durationSeconds: 480,
    voiceId: 'male',
    lengthCategory: 'short',
    tags: ['faith', 'peace', 'new-testament', 'miracles'],
  },
  {
    id: 'the-garden-of-eden',
    title: 'The Garden of Eden',
    description:
      'In the beginning, everything is perfect. Walk through a garden where God Himself comes to visit in the cool of the evening.',
    audioFilename: 'stories/the-garden-of-eden.mp3',
    durationSeconds: 1800,
    voiceId: 'female',
    lengthCategory: 'long',
    tags: ['creation', 'beauty', 'old-testament', 'beginnings'],
  },
  {
    id: 'psalm-23-green-pastures',
    title: "A Journey Through Psalm 23's Green Pastures",
    description:
      'Follow the shepherd along quiet paths, beside still waters, through dark valleys, and into the house of the Lord. A journey through the most beloved psalm.',
    audioFilename: 'stories/psalm-23-green-pastures.mp3',
    durationSeconds: 1200,
    voiceId: 'male',
    lengthCategory: 'medium',
    tags: ['peace', 'comfort', 'psalms', 'guidance'],
  },
  {
    id: 'the-stars-of-abraham',
    title: 'The Stars of Abraham',
    description:
      "On a clear desert night, God leads an old man outside his tent. 'Look up,' He says. 'Count the stars, if you can.' A promise that changed everything.",
    audioFilename: 'stories/the-stars-of-abraham.mp3',
    durationSeconds: 720,
    voiceId: 'female',
    lengthCategory: 'short',
    tags: ['promise', 'faith', 'old-testament', 'hope'],
  },
  {
    id: 'ruth-and-naomis-journey',
    title: "Ruth and Naomi's Journey",
    description:
      'Two women walk a long road together \u2014 one returning home in grief, the other choosing loyalty over comfort. A story of devotion that rewrites destiny.',
    audioFilename: 'stories/ruth-and-naomis-journey.mp3',
    durationSeconds: 1560,
    voiceId: 'male',
    lengthCategory: 'long',
    tags: ['loyalty', 'devotion', 'old-testament', 'love'],
  },
  {
    id: 'elijah-and-the-still-small-voice',
    title: 'Elijah and the Still Small Voice',
    description:
      'The prophet runs. He hides. He begs God to let him die. Then, in the silence after fire and earthquake, God speaks \u2014 not in thunder, but in a whisper.',
    audioFilename: 'stories/elijah-and-the-still-small-voice.mp3',
    durationSeconds: 900,
    voiceId: 'female',
    lengthCategory: 'medium',
    tags: ['listening', 'peace', 'old-testament', 'rest'],
  },
]

export const BEDTIME_STORY_BY_ID = new Map<string, BedtimeStory>(
  BEDTIME_STORIES.map((s) => [s.id, s]),
)
