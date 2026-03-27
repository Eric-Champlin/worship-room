import type { LucideIcon } from 'lucide-react'
import {
  Flame,
  Sprout,
  Leaf,
  Flower2,
  TreePine,
  Trees,
  Landmark,
  HandHeart,
  BookOpen,
  Brain,
  Headphones,
  Users,
  Heart,
  Sparkles,
  Crown,
  Target,
  Sun,
  Star,
  Wind,
  MessageCircle,
  Shield,
  HandHelping,
  Compass,
  GraduationCap,
  MapPin,
} from 'lucide-react'
import { BADGE_MAP } from './badges'

// --- Types ---

export interface BadgeIconConfig {
  icon: LucideIcon
  bgColor: string // Tailwind bg class
  textColor: string // Tailwind text class
  glowColor: string // raw rgba for box-shadow
}

// --- Category Defaults ---

const CATEGORY_DEFAULTS: Record<string, BadgeIconConfig> = {
  streak: {
    icon: Flame,
    bgColor: 'bg-amber-500/20',
    textColor: 'text-amber-400',
    glowColor: 'rgba(245,158,11,0.4)',
  },
  level: {
    icon: Sprout,
    bgColor: 'bg-primary/20',
    textColor: 'text-primary-lt',
    glowColor: 'rgba(139,92,246,0.4)',
  },
  activity: {
    icon: Sparkles,
    bgColor: 'bg-amber-400/20',
    textColor: 'text-amber-300',
    glowColor: 'rgba(252,211,77,0.4)',
  },
  community: {
    icon: Users,
    bgColor: 'bg-emerald-500/20',
    textColor: 'text-emerald-400',
    glowColor: 'rgba(52,211,153,0.4)',
  },
  special: {
    icon: Sparkles,
    bgColor: 'bg-amber-400/20',
    textColor: 'text-amber-300',
    glowColor: 'rgba(252,211,77,0.5)',
  },
  challenge: {
    icon: Target,
    bgColor: 'bg-purple-500/20',
    textColor: 'text-purple-400',
    glowColor: 'rgba(168,85,247,0.4)',
  },
  meditation: {
    icon: Brain,
    bgColor: 'bg-indigo-500/20',
    textColor: 'text-indigo-400',
    glowColor: 'rgba(99,102,241,0.4)',
  },
  'prayer-wall': {
    icon: MessageCircle,
    bgColor: 'bg-orange-500/20',
    textColor: 'text-orange-400',
    glowColor: 'rgba(249,115,22,0.4)',
  },
  bible: {
    icon: BookOpen,
    bgColor: 'bg-emerald-500/20',
    textColor: 'text-emerald-400',
    glowColor: 'rgba(52,211,153,0.4)',
  },
  gratitude: {
    icon: Heart,
    bgColor: 'bg-rose-400/20',
    textColor: 'text-rose-400',
    glowColor: 'rgba(251,113,133,0.4)',
  },
  'local-support': {
    icon: MapPin,
    bgColor: 'bg-cyan-500/20',
    textColor: 'text-cyan-400',
    glowColor: 'rgba(6,182,212,0.4)',
  },
  listening: {
    icon: Headphones,
    bgColor: 'bg-teal-500/20',
    textColor: 'text-teal-400',
    glowColor: 'rgba(20,184,166,0.4)',
  },
}

// --- Explicit Badge → Icon Mapping ---

const BADGE_ICON_MAP: Record<string, BadgeIconConfig> = {
  // Streak badges
  streak_7: {
    icon: Flame,
    bgColor: 'bg-amber-500/20',
    textColor: 'text-amber-400',
    glowColor: 'rgba(245,158,11,0.4)',
  },
  streak_14: {
    icon: Flame,
    bgColor: 'bg-amber-500/20',
    textColor: 'text-amber-400',
    glowColor: 'rgba(245,158,11,0.4)',
  },
  streak_30: {
    icon: Flame,
    bgColor: 'bg-amber-500/20',
    textColor: 'text-amber-400',
    glowColor: 'rgba(245,158,11,0.4)',
  },
  streak_60: {
    icon: Flame,
    bgColor: 'bg-amber-500/20',
    textColor: 'text-amber-400',
    glowColor: 'rgba(245,158,11,0.4)',
  },
  streak_90: {
    icon: Flame,
    bgColor: 'bg-amber-500/20',
    textColor: 'text-amber-400',
    glowColor: 'rgba(245,158,11,0.4)',
  },
  streak_180: {
    icon: Flame,
    bgColor: 'bg-amber-500/20',
    textColor: 'text-amber-400',
    glowColor: 'rgba(245,158,11,0.4)',
  },
  streak_365: {
    icon: Flame,
    bgColor: 'bg-amber-500/20',
    textColor: 'text-amber-400',
    glowColor: 'rgba(245,158,11,0.4)',
  },

  // Level badges
  level_1: {
    icon: Sprout,
    bgColor: 'bg-primary/20',
    textColor: 'text-primary-lt',
    glowColor: 'rgba(139,92,246,0.4)',
  },
  level_2: {
    icon: Leaf,
    bgColor: 'bg-primary/20',
    textColor: 'text-primary-lt',
    glowColor: 'rgba(139,92,246,0.4)',
  },
  level_3: {
    icon: Flower2,
    bgColor: 'bg-primary/20',
    textColor: 'text-primary-lt',
    glowColor: 'rgba(139,92,246,0.4)',
  },
  level_4: {
    icon: TreePine,
    bgColor: 'bg-primary/20',
    textColor: 'text-primary-lt',
    glowColor: 'rgba(139,92,246,0.4)',
  },
  level_5: {
    icon: Trees,
    bgColor: 'bg-primary/20',
    textColor: 'text-primary-lt',
    glowColor: 'rgba(139,92,246,0.4)',
  },
  level_6: {
    icon: Landmark,
    bgColor: 'bg-primary/20',
    textColor: 'text-primary-lt',
    glowColor: 'rgba(139,92,246,0.4)',
  },

  // Prayer badges
  first_prayer: {
    icon: HandHeart,
    bgColor: 'bg-rose-500/20',
    textColor: 'text-rose-400',
    glowColor: 'rgba(244,63,94,0.4)',
  },
  prayer_100: {
    icon: HandHeart,
    bgColor: 'bg-rose-500/20',
    textColor: 'text-rose-400',
    glowColor: 'rgba(244,63,94,0.4)',
  },

  // Journal badges
  first_journal: {
    icon: BookOpen,
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-400',
    glowColor: 'rgba(59,130,246,0.4)',
  },
  journal_50: {
    icon: BookOpen,
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-400',
    glowColor: 'rgba(59,130,246,0.4)',
  },
  journal_100: {
    icon: BookOpen,
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-400',
    glowColor: 'rgba(59,130,246,0.4)',
  },

  // Meditate badges
  first_meditate: {
    icon: Brain,
    bgColor: 'bg-indigo-500/20',
    textColor: 'text-indigo-400',
    glowColor: 'rgba(99,102,241,0.4)',
  },
  meditate_25: {
    icon: Brain,
    bgColor: 'bg-indigo-500/20',
    textColor: 'text-indigo-400',
    glowColor: 'rgba(99,102,241,0.4)',
  },

  // Listen badges
  first_listen: {
    icon: Headphones,
    bgColor: 'bg-teal-500/20',
    textColor: 'text-teal-400',
    glowColor: 'rgba(20,184,166,0.4)',
  },
  listen_50: {
    icon: Headphones,
    bgColor: 'bg-teal-500/20',
    textColor: 'text-teal-400',
    glowColor: 'rgba(20,184,166,0.4)',
  },

  // Reading plan badges
  first_plan: {
    icon: BookOpen,
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-400',
    glowColor: 'rgba(96,165,250,0.3)',
  },
  plans_3: {
    icon: BookOpen,
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-400',
    glowColor: 'rgba(96,165,250,0.3)',
  },
  plans_10: {
    icon: BookOpen,
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-400',
    glowColor: 'rgba(96,165,250,0.4)',
  },

  // Bible book completion badges
  bible_book_1: {
    icon: BookOpen,
    bgColor: 'bg-emerald-500/20',
    textColor: 'text-emerald-400',
    glowColor: 'rgba(52,211,153,0.3)',
  },
  bible_book_5: {
    icon: BookOpen,
    bgColor: 'bg-emerald-500/20',
    textColor: 'text-emerald-400',
    glowColor: 'rgba(52,211,153,0.3)',
  },
  bible_book_10: {
    icon: BookOpen,
    bgColor: 'bg-emerald-500/20',
    textColor: 'text-emerald-300',
    glowColor: 'rgba(52,211,153,0.4)',
  },
  bible_book_66: {
    icon: Crown,
    bgColor: 'bg-amber-500/20',
    textColor: 'text-amber-300',
    glowColor: 'rgba(251,191,36,0.4)',
  },

  // Prayer wall badge
  first_prayerwall: {
    icon: HandHeart,
    bgColor: 'bg-orange-500/20',
    textColor: 'text-orange-400',
    glowColor: 'rgba(249,115,22,0.4)',
  },

  // Community friend badges
  first_friend: {
    icon: Users,
    bgColor: 'bg-emerald-500/20',
    textColor: 'text-emerald-400',
    glowColor: 'rgba(52,211,153,0.4)',
  },
  friends_10: {
    icon: Users,
    bgColor: 'bg-emerald-500/20',
    textColor: 'text-emerald-400',
    glowColor: 'rgba(52,211,153,0.4)',
  },

  // Community encouragement badges
  encourage_10: {
    icon: Heart,
    bgColor: 'bg-pink-500/20',
    textColor: 'text-pink-400',
    glowColor: 'rgba(236,72,153,0.4)',
  },
  encourage_50: {
    icon: Heart,
    bgColor: 'bg-pink-500/20',
    textColor: 'text-pink-400',
    glowColor: 'rgba(236,72,153,0.4)',
  },

  // Welcome badge
  welcome: {
    icon: Sparkles,
    bgColor: 'bg-amber-400/20',
    textColor: 'text-amber-300',
    glowColor: 'rgba(252,211,77,0.5)',
  },

  // Challenge badges — season-specific
  challenge_lent: {
    icon: Heart,
    bgColor: 'bg-purple-700/20',
    textColor: 'text-purple-400',
    glowColor: 'rgba(107,33,168,0.4)',
  },
  challenge_easter: {
    icon: Sun,
    bgColor: 'bg-amber-300/20',
    textColor: 'text-amber-300',
    glowColor: 'rgba(253,230,138,0.4)',
  },
  challenge_pentecost: {
    icon: Flame,
    bgColor: 'bg-red-500/20',
    textColor: 'text-red-400',
    glowColor: 'rgba(220,38,38,0.4)',
  },
  challenge_advent: {
    icon: Star,
    bgColor: 'bg-violet-500/20',
    textColor: 'text-violet-400',
    glowColor: 'rgba(124,58,237,0.4)',
  },
  challenge_newyear: {
    icon: Leaf,
    bgColor: 'bg-emerald-600/20',
    textColor: 'text-emerald-400',
    glowColor: 'rgba(5,150,105,0.4)',
  },
  challenge_first: {
    icon: Target,
    bgColor: 'bg-amber-400/20',
    textColor: 'text-amber-300',
    glowColor: 'rgba(252,211,77,0.4)',
  },
  challenge_master: {
    icon: Crown,
    bgColor: 'bg-amber-400/20',
    textColor: 'text-amber-300',
    glowColor: 'rgba(252,211,77,0.5)',
  },

  // Meditation milestones
  meditate_10: { icon: Wind, bgColor: 'bg-indigo-500/20', textColor: 'text-indigo-400', glowColor: 'rgba(99,102,241,0.4)' },
  meditate_50: { icon: Heart, bgColor: 'bg-indigo-500/20', textColor: 'text-indigo-300', glowColor: 'rgba(99,102,241,0.4)' },
  meditate_100: { icon: Sparkles, bgColor: 'bg-indigo-500/20', textColor: 'text-indigo-300', glowColor: 'rgba(99,102,241,0.5)' },

  // Prayer Wall milestones
  prayerwall_first_post: { icon: MessageCircle, bgColor: 'bg-orange-500/20', textColor: 'text-orange-400', glowColor: 'rgba(249,115,22,0.4)' },
  prayerwall_10_posts: { icon: Shield, bgColor: 'bg-orange-500/20', textColor: 'text-orange-400', glowColor: 'rgba(249,115,22,0.4)' },
  prayerwall_25_intercessions: { icon: HandHelping, bgColor: 'bg-orange-500/20', textColor: 'text-orange-300', glowColor: 'rgba(249,115,22,0.5)' },

  // Bible reading milestones
  bible_first_chapter: { icon: BookOpen, bgColor: 'bg-emerald-500/20', textColor: 'text-emerald-400', glowColor: 'rgba(52,211,153,0.3)' },
  bible_10_chapters: { icon: Compass, bgColor: 'bg-emerald-500/20', textColor: 'text-emerald-400', glowColor: 'rgba(52,211,153,0.3)' },
  bible_25_chapters: { icon: GraduationCap, bgColor: 'bg-emerald-500/20', textColor: 'text-emerald-300', glowColor: 'rgba(52,211,153,0.4)' },

  // Gratitude milestones
  gratitude_7_streak: { icon: Heart, bgColor: 'bg-rose-400/20', textColor: 'text-rose-400', glowColor: 'rgba(251,113,133,0.4)' },
  gratitude_30_days: { icon: Sun, bgColor: 'bg-rose-400/20', textColor: 'text-rose-400', glowColor: 'rgba(251,113,133,0.4)' },
  gratitude_100_days: { icon: Star, bgColor: 'bg-rose-400/20', textColor: 'text-rose-300', glowColor: 'rgba(251,113,133,0.5)' },

  // Local support
  local_first_visit: { icon: MapPin, bgColor: 'bg-cyan-500/20', textColor: 'text-cyan-400', glowColor: 'rgba(6,182,212,0.4)' },

  // Listening
  listen_10_hours: { icon: Headphones, bgColor: 'bg-teal-500/20', textColor: 'text-teal-400', glowColor: 'rgba(20,184,166,0.4)' },

  // Full Worship Day
  full_worship_day: {
    icon: Crown,
    bgColor: 'bg-amber-400/20',
    textColor: 'text-amber-300',
    glowColor: 'rgba(252,211,77,0.5)',
  },
}

// --- Public API ---

export function getBadgeIcon(badgeId: string): BadgeIconConfig {
  // Direct ID lookup
  if (BADGE_ICON_MAP[badgeId]) {
    return BADGE_ICON_MAP[badgeId]
  }

  // Fall back to category default
  const badge = BADGE_MAP[badgeId]
  if (badge && CATEGORY_DEFAULTS[badge.category]) {
    return CATEGORY_DEFAULTS[badge.category]
  }

  // Ultimate fallback
  return CATEGORY_DEFAULTS.special
}

// --- Confetti Colors (from mood palette + white + gold) ---

export const CONFETTI_COLORS: string[] = [
  '#D97706', // amber (Struggling)
  '#C2703E', // copper (Heavy)
  '#8B7FA8', // gray-purple (Okay)
  '#2DD4BF', // teal (Good)
  '#34D399', // green (Thriving)
  '#FFFFFF', // white
  '#FCD34D', // gold/amber-300
]

// --- Level Encouragement Messages ---

export const LEVEL_ENCOURAGEMENT_MESSAGES: Record<number, string> = {
  1: 'Your journey of faith begins',
  2: 'Your faith is taking root',
  3: 'Your spirit is blossoming',
  4: 'Your devotion bears fruit',
  5: 'Deep roots, strong faith',
  6: 'Your light shines for all to see',
}

// --- Streak Milestone Messages ---

export const STREAK_MILESTONE_MESSAGES: Record<number, string> = {
  60: '60 days of faithfulness. God sees your consistency.',
  90: '90 days of unwavering faith. What a journey.',
  180: 'Half a year of daily devotion. Remarkable.',
  365: 'A full year of faith. This is extraordinary.',
}

// Development guard: verify all badge IDs have explicit icon mappings.
// Checked at build time via unit tests (badge-icons.test.ts) instead of runtime console.warn.
