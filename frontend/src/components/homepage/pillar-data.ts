import type { LucideIcon } from 'lucide-react'
import { Heart, TrendingUp, Users } from 'lucide-react'

export type PillarAccent = 'purple' | 'emerald' | 'amber'
export type GlowVariant = 'left' | 'right' | 'center'

export interface PillarFeature {
  name: string
  description: string
  previewKey: string
}

export interface Pillar {
  id: string
  title: string
  subtitle: string
  icon: LucideIcon
  accent: PillarAccent
  glowVariant: GlowVariant
  features: PillarFeature[]
}

export const ACCENT_CLASSES: Record<
  PillarAccent,
  { text: string; bg: string; border: string; ring: string }
> = {
  purple: {
    text: 'text-purple-400',
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/30',
    ring: 'ring-purple-500/20',
  },
  emerald: {
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/30',
    ring: 'ring-emerald-500/20',
  },
  amber: {
    text: 'text-amber-400',
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/30',
    ring: 'ring-amber-500/20',
  },
}

export const PILLARS: Pillar[] = [
  {
    id: 'healing',
    title: 'Healing',
    subtitle: 'Daily practices for your inner life',
    icon: Heart,
    accent: 'purple',
    glowVariant: 'left',
    features: [
      {
        name: 'Devotionals',
        description:
          'A fresh devotional every morning -- an inspiring quote, scripture, and reflection tied to the current season of the church year. Advent, Lent, Easter, and ordinary time each bring their own rhythm.',
        previewKey: 'devotional',
      },
      {
        name: 'AI Prayer',
        description:
          "Tell us what's on your heart, and receive a personalized prayer generated just for you -- with ambient sound that plays as the words appear one by one. It's like having a prayer partner who always knows what to say.",
        previewKey: 'ai-prayer',
      },
      {
        name: 'Journaling',
        description:
          "Write freely or follow guided prompts rooted in scripture. Your entries are private, safe, and always here when you need to look back and see how far you've come.",
        previewKey: 'journaling',
      },
      {
        name: 'Meditation',
        description:
          'Six guided meditation types -- breathing exercises, scripture soaking, gratitude reflections, ACTS prayer, psalm readings, and the daily examen. Each one meets you where you are.',
        previewKey: 'meditation',
      },
      {
        name: 'Mood Check-in',
        description:
          'Start each day by sharing how you\'re feeling. Your mood shapes everything -- the verse you see, the content recommended, and the gentle care the app shows you.',
        previewKey: 'mood-checkin',
      },
      {
        name: 'Evening Reflection',
        description:
          'Before you sleep, look back on your day. Name your highlights, log gratitude, and close with a gentle prayer. Your streak stays alive, and tomorrow starts with intention.',
        previewKey: 'evening-reflection',
      },
    ],
  },
  {
    id: 'growth',
    title: 'Growth',
    subtitle: 'Tools to measure and celebrate progress',
    icon: TrendingUp,
    accent: 'emerald',
    glowVariant: 'right',
    features: [
      {
        name: 'Reading Plans',
        description:
          '10 multi-day plans covering anxiety, grief, gratitude, identity, forgiveness, trust, hope, healing, purpose, and relationships. Each day brings a passage, reflection, prayer, and action step.',
        previewKey: 'reading-plans',
      },
      {
        name: 'Seasonal Challenges',
        description:
          'Join community-wide challenges tied to Advent, Lent, Easter, Pentecost, and the New Year. 110 days of guided content that moves with the church calendar.',
        previewKey: 'seasonal-challenges',
      },
      {
        name: 'Growth Garden',
        description:
          "A living illustration on your dashboard that grows as you do. Your garden reflects your faith level, streak, and the activities you practice most. It's your spiritual journey, visualized.",
        previewKey: 'growth-garden',
      },
      {
        name: 'Badges & Faith Points',
        description:
          'Every prayer, journal entry, chapter read, and meditation earns faith points. Hit milestones to unlock badges that celebrate your consistency, courage, and growth.',
        previewKey: 'badges-points',
      },
      {
        name: 'Insights',
        description:
          'See your spiritual patterns over time -- mood trends, activity correlations, and weekly summaries that help you understand how your practices are shaping your inner life.',
        previewKey: 'insights',
      },
    ],
  },
  {
    id: 'community',
    title: 'Community',
    subtitle: "You don't have to walk alone",
    icon: Users,
    accent: 'amber',
    glowVariant: 'center',
    features: [
      {
        name: 'Prayer Wall',
        description:
          "Share what's on your heart and lift others up in prayer. When someone prays for your request, you feel it -- a gentle notification that someone cares. This isn't social media. It's sacred space.",
        previewKey: 'prayer-wall',
      },
      {
        name: 'Friends & Encouragement',
        description:
          "Add friends, send encouragement, and see how your community is growing together. Gentle nudges for friends who've been away -- because sometimes knowing someone noticed is enough.",
        previewKey: 'friends-encouragement',
      },
      {
        name: 'Local Support',
        description:
          'Find churches, Christian counselors, and Celebrate Recovery meetings near you. Because sometimes healing needs a hand to hold, not just a screen to touch.',
        previewKey: 'local-support',
      },
    ],
  },
]
