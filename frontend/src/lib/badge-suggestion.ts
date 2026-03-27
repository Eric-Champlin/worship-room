export interface BadgeSuggestion {
  text: string
  link: string
}

export function getBadgeSuggestion(badgeId: string, category: string): BadgeSuggestion | null {
  // No suggestion for level or special badges
  if (category === 'level' || category === 'special') return null

  // Streak badges
  if (category === 'streak') {
    return { text: 'Keep it going! Try a reading plan →', link: '/grow?tab=plans' }
  }

  // Challenge badges
  if (category === 'challenge') {
    return { text: 'Keep growing! Try a new plan →', link: '/grow?tab=plans' }
  }

  // Community badges
  if (category === 'community') {
    return { text: 'Join a challenge together →', link: '/grow?tab=challenges' }
  }

  // Activity badges — match by ID prefix (order matters: check longer/specific prefixes first)
  if (category === 'activity') {
    if (badgeId.startsWith('first_prayerwall') || badgeId.startsWith('pray_wall_') || badgeId.startsWith('first_pray_wall')) {
      return { text: 'Join a challenge together →', link: '/grow?tab=challenges' }
    }
    if (badgeId.startsWith('first_prayer') || badgeId.startsWith('prayer_')) {
      return { text: 'Try audio-guided prayer →', link: '/daily?tab=pray' }
    }
    if (badgeId.startsWith('first_journal') || badgeId.startsWith('journal_')) {
      return { text: 'Explore Bible highlighting →', link: '/bible' }
    }
    if (badgeId.startsWith('first_meditate') || badgeId.startsWith('meditate_') || badgeId.startsWith('meditation_')) {
      return { text: 'Check your meditation trends →', link: '/insights' }
    }
    if (badgeId.startsWith('first_listen') || badgeId.startsWith('listen_')) {
      return { text: 'Discover ambient scenes →', link: '/music' }
    }
    if (badgeId.startsWith('first_plan') || badgeId.startsWith('plans_')) {
      return { text: 'Start another plan →', link: '/grow?tab=plans' }
    }
    if (badgeId.startsWith('bible_book_')) {
      return { text: 'Start a reading plan on what you read →', link: '/grow?tab=plans' }
    }
  }

  return null
}
