import type { LucideIcon } from 'lucide-react'
import {
  Bird,
  TreePine,
  Mountain,
  Sunrise,
  Cross,
  Fish,
  Flame,
  Crown,
  Waves,
  Droplet,
  Anchor,
  Star,
  Landmark,
  Rainbow,
} from 'lucide-react'
import type { BadgeData } from '@/types/dashboard'

// --- Types ---

export type AvatarCategory = 'nature' | 'faith' | 'water' | 'light'

export interface AvatarPreset {
  id: string
  name: string
  category: AvatarCategory
  icon: LucideIcon
  bgColor: string // hex color for circle background
}

export interface UnlockableAvatar {
  id: string
  name: string
  icon: LucideIcon
  gradient: string // CSS linear-gradient
  requiredBadgeId: string | string[]
  unlockCheck: (badges: BadgeData) => boolean
}

// --- Constants ---

export const AVATAR_CATEGORIES: AvatarCategory[] = ['nature', 'faith', 'water', 'light']

export const AVATAR_CATEGORY_LABELS: Record<AvatarCategory, string> = {
  nature: 'Nature',
  faith: 'Faith',
  water: 'Water',
  light: 'Light',
}

export const DEFAULT_AVATAR_ID = 'nature-dove'

// --- 16 Preset Avatars ---

export const AVATAR_PRESETS: AvatarPreset[] = [
  // Nature (green palette)
  { id: 'nature-dove', name: 'Dove', category: 'nature', icon: Bird, bgColor: '#10B981' },
  { id: 'nature-tree', name: 'Tree', category: 'nature', icon: TreePine, bgColor: '#059669' },
  { id: 'nature-mountain', name: 'Mountain', category: 'nature', icon: Mountain, bgColor: '#047857' },
  { id: 'nature-sunrise', name: 'Sunrise', category: 'nature', icon: Sunrise, bgColor: '#34D399' },

  // Faith (purple palette)
  { id: 'faith-cross', name: 'Cross', category: 'faith', icon: Cross, bgColor: '#8B5CF6' },
  { id: 'faith-fish', name: 'Ichthys', category: 'faith', icon: Fish, bgColor: '#7C3AED' },
  { id: 'faith-flame', name: 'Flame', category: 'faith', icon: Flame, bgColor: '#A78BFA' },
  { id: 'faith-crown', name: 'Crown', category: 'faith', icon: Crown, bgColor: '#6D28D9' },

  // Water (blue palette)
  { id: 'water-wave', name: 'Wave', category: 'water', icon: Waves, bgColor: '#3B82F6' },
  { id: 'water-raindrop', name: 'Raindrop', category: 'water', icon: Droplet, bgColor: '#2563EB' },
  { id: 'water-river', name: 'River', category: 'water', icon: Waves, bgColor: '#60A5FA' },
  { id: 'water-anchor', name: 'Anchor', category: 'water', icon: Anchor, bgColor: '#1D4ED8' },

  // Light (warm palette)
  { id: 'light-star', name: 'Star', category: 'light', icon: Star, bgColor: '#F59E0B' },
  { id: 'light-candle', name: 'Candle', category: 'light', icon: Flame, bgColor: '#D97706' },
  { id: 'light-lighthouse', name: 'Lighthouse', category: 'light', icon: Landmark, bgColor: '#FBBF24' },
  { id: 'light-rainbow', name: 'Rainbow', category: 'light', icon: Rainbow, bgColor: '#F97316' },
]

// --- 4 Unlockable Avatars ---

// Badge IDs referenced from constants/dashboard/badges.ts
const STREAK_BADGE_IDS = ['streak_7', 'streak_14', 'streak_30', 'streak_60', 'streak_90', 'streak_180', 'streak_365']

export const UNLOCKABLE_AVATARS: UnlockableAvatar[] = [
  {
    id: 'unlock-golden-dove',
    name: 'Golden Dove',
    icon: Bird,
    gradient: 'linear-gradient(135deg, #D4A017 0%, #FFD700 50%, #B8860B 100%)',
    requiredBadgeId: 'streak_365',
    unlockCheck: (badges) => !!badges.earned['streak_365'],
  },
  {
    id: 'unlock-crystal-tree',
    name: 'Crystal Tree',
    icon: TreePine,
    gradient: 'linear-gradient(135deg, #87CEEB 0%, #E0E8F0 50%, #5B9BD5 100%)',
    requiredBadgeId: 'level_6',
    unlockCheck: (badges) => !!badges.earned['level_6'],
  },
  {
    id: 'unlock-phoenix-flame',
    name: 'Phoenix Flame',
    icon: Flame,
    gradient: 'linear-gradient(135deg, #FF4500 0%, #FF6347 50%, #DC143C 100%)',
    requiredBadgeId: 'full_worship_day',
    unlockCheck: (badges) => (badges.earned['full_worship_day']?.count ?? 0) >= 10,
  },
  {
    id: 'unlock-diamond-crown',
    name: 'Diamond Crown',
    icon: Crown,
    gradient: 'linear-gradient(135deg, #E8E8E8 0%, #FFFFFF 50%, #C0C0C0 100%)',
    requiredBadgeId: STREAK_BADGE_IDS,
    unlockCheck: (badges) => STREAK_BADGE_IDS.every((id) => !!badges.earned[id]),
  },
]

// --- Lookup ---

const PRESET_MAP = new Map<string, AvatarPreset>(
  AVATAR_PRESETS.map((p) => [p.id, p]),
)

const UNLOCKABLE_MAP = new Map<string, UnlockableAvatar>(
  UNLOCKABLE_AVATARS.map((u) => [u.id, u]),
)

export function getAvatarById(id: string): AvatarPreset | UnlockableAvatar | null {
  if (id === 'default') {
    return PRESET_MAP.get(DEFAULT_AVATAR_ID) ?? null
  }
  return PRESET_MAP.get(id) ?? UNLOCKABLE_MAP.get(id) ?? null
}

export function isUnlockableAvatar(avatar: AvatarPreset | UnlockableAvatar): avatar is UnlockableAvatar {
  return 'gradient' in avatar
}

export function isPresetAvatar(avatar: AvatarPreset | UnlockableAvatar): avatar is AvatarPreset {
  return 'bgColor' in avatar && !('gradient' in avatar)
}
