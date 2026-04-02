import type { LucideIcon } from 'lucide-react'
import {
  CreditCard,
  EyeOff,
  HeartHandshake,
  LifeBuoy,
  ShieldOff,
  Sparkles,
} from 'lucide-react'

export interface DifferentiatorItem {
  icon: LucideIcon
  title: string
  description: string
}

export const DIFFERENTIATORS: DifferentiatorItem[] = [
  {
    icon: ShieldOff,
    title: 'Your prayer time is sacred',
    description:
      "No ads. No sponsored content. No interruptions. When you open Worship Room, the only voice you'll hear is the one you came to listen to.",
  },
  {
    icon: EyeOff,
    title: 'Your prayers stay between you and God',
    description:
      "We don't sell your data, track your behavior for advertisers, or share your journal entries with anyone. Your spiritual life is private. Period.",
  },
  {
    icon: CreditCard,
    title: 'Honest from day one',
    description:
      "No hidden fees, no auto-renewing traps buried in fine print, no paywall that appears after you've invested weeks of your heart. You'll always know exactly where you stand.",
  },
  {
    icon: HeartHandshake,
    title: "We'll never guilt you for missing a day",
    description:
      "Life happens. God's grace covers every gap. Your streak has gentle repair, your garden doesn't wilt, and when you come back, we say welcome — not where have you been.",
  },
  {
    icon: Sparkles,
    title: 'Prayers that know your heart',
    description:
      "Tell us how you're feeling, and we'll write a prayer just for you. Not a template. Not a generic blessing. A prayer shaped by your words, your moment, your need.",
  },
  {
    icon: LifeBuoy,
    title: 'A safe space when it matters most',
    description:
      "If you're in crisis, we won't just offer a verse. We'll connect you with the 988 Suicide & Crisis Lifeline, Crisis Text Line, and SAMHSA — because spiritual care and professional help belong together.",
  },
]
