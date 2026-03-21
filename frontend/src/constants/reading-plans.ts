import type { PlanDifficulty, PlanTheme } from '@/types/reading-plans'

export const READING_PLAN_PROGRESS_KEY = 'wr_reading_plan_progress'

export const PLAN_THEMES = [
  'anxiety',
  'grief',
  'gratitude',
  'identity',
  'forgiveness',
  'trust',
  'hope',
  'healing',
  'purpose',
  'relationships',
] as const

export const PLAN_THEME_LABELS: Record<PlanTheme, string> = {
  anxiety: 'Anxiety',
  grief: 'Grief',
  gratitude: 'Gratitude',
  identity: 'Identity',
  forgiveness: 'Forgiveness',
  trust: 'Trust',
  hope: 'Hope',
  healing: 'Healing',
  purpose: 'Purpose',
  relationships: 'Relationships',
}

export const PLAN_DIFFICULTY_LABELS: Record<PlanDifficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
}

export const DURATION_FILTER_OPTIONS = [
  { label: 'All', value: null },
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: '21 days', value: 21 },
] as const

export const DIFFICULTY_FILTER_OPTIONS = [
  { label: 'All', value: null },
  { label: 'Beginner', value: 'beginner' as const },
  { label: 'Intermediate', value: 'intermediate' as const },
] as const
