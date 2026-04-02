import type { LucideIcon } from 'lucide-react'
import { BookOpen, Heart, Headphones, Users, Sprout } from 'lucide-react'

export interface FeatureTab {
  id: string
  label: string
  icon: LucideIcon
  title: string
  description: string
  highlights: string[]
}

export const FEATURE_TABS: FeatureTab[] = [
  {
    id: 'devotional',
    label: 'Daily Devotional',
    icon: BookOpen,
    title: 'Start Each Day with Purpose',
    description:
      'A fresh devotional every morning — an inspiring quote, a scripture passage, and a reflection that ties everything together. Complete your quiet time in just 10 minutes.',
    highlights: [
      '50 devotionals across every season of the church year',
      'Liturgical calendar awareness — content shifts with Advent, Lent, Easter',
      'Journal and pray directly from the devotional',
    ],
  },
  {
    id: 'prayer',
    label: 'AI Prayer',
    icon: Heart,
    title: 'Prayers That Know Your Heart',
    description:
      "Tell us how you're feeling, and we'll generate a personalized prayer just for you — with ambient worship music that plays as the words appear, one by one.",
    highlights: [
      'AI-generated prayers tailored to your exact situation',
      'Karaoke-style text reveal with ambient soundscape',
      'Copy, share, or continue the conversation',
    ],
  },
  {
    id: 'meditation',
    label: 'Meditation & Sound',
    icon: Headphones,
    title: 'Your Sanctuary of Sound',
    description:
      '24 ambient sounds with crossfade mixing, 6 guided meditation types, and a full sleep library — scripture readings, bedtime stories, and rest routines.',
    highlights: [
      'Mix multiple sounds into your perfect atmosphere',
      'Breathing exercises, gratitude reflections, psalm readings',
      'Sleep timer with gentle fade-out',
    ],
  },
  {
    id: 'prayer-wall',
    label: 'Prayer Wall',
    icon: Users,
    title: 'Pray Together, Heal Together',
    description:
      "A community prayer wall where you can share what's on your heart, lift others up in prayer, and feel the warmth of knowing someone is praying for you.",
    highlights: [
      'Share prayer requests and receive community support',
      'Question of the Day sparks meaningful discussions',
      'Grace-based — never performative, always warm',
    ],
  },
  {
    id: 'growth',
    label: 'Your Growth',
    icon: Sprout,
    title: 'Watch Yourself Grow',
    description:
      'Track your spiritual journey with a visual growth garden, reading plans, seasonal challenges, and mood insights that reflect your progress back to you.',
    highlights: [
      '10 reading plans from 7 to 21 days',
      'Seasonal challenges tied to Advent, Lent, Easter, and more',
      'A living garden that grows as you do',
    ],
  },
]
