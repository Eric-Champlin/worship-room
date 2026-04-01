import type { ActivityType, MoodLabel } from '@/types/dashboard'

interface ActivityPrayerLine {
  activity: ActivityType
  line: string
}

export const ACTIVITY_PRAYER_LINES: ActivityPrayerLine[] = [
  { activity: 'devotional', line: 'Thank you for meeting me in Your Word this morning.' },
  { activity: 'readingPlan', line: 'Thank you for the time I spent in Your Word today.' },
  { activity: 'pray', line: 'Thank you for hearing my prayers today.' },
  { activity: 'journal', line: 'Thank you for the space to pour out my heart in my journal.' },
  { activity: 'meditate', line: 'Thank you for the stillness I found in meditation.' },
  { activity: 'prayerWall', line: 'Thank you for the courage to share my heart with others.' },
  { activity: 'challenge', line: 'Thank you for another step in this journey.' },
  { activity: 'gratitude', line: 'Thank you for opening my eyes to the blessings around me.' },
]

export const MOOD_PRAYER_LINES: Record<MoodLabel, string> = {
  Struggling: "I'm hurting tonight, Lord. Hold me close as I sleep.",
  Heavy: 'This day was heavy, but You carried me through. I give it all to You.',
  Okay: "Today was ordinary, and that's okay. Thank you for the quiet blessings.",
  Good: 'I felt Your goodness today. Let this peace carry into my dreams.',
  Thriving: 'My heart is full tonight. Thank you for this beautiful day.',
}

export const GENERIC_NO_ACTIVITY_LINE =
  "Thank you for bringing me through this day, even the parts I can't put into words."

const OPENING = 'Lord, thank you for this day.'

const CLOSING = `As I rest tonight, I trust You with everything I carry.
Give me peaceful sleep and a heart ready for tomorrow.
In Jesus' name, Amen.`

const MAX_ACTIVITY_LINES = 3

export interface BuildEveningPrayerParams {
  todayActivities: Record<string, boolean>
  eveningMoodLabel: MoodLabel | null
}

export function buildEveningPrayer(params: BuildEveningPrayerParams): string {
  const { todayActivities, eveningMoodLabel } = params

  const activityLines = ACTIVITY_PRAYER_LINES.filter(
    ({ activity }) => todayActivities[activity],
  )
    .slice(0, MAX_ACTIVITY_LINES)
    .map(({ line }) => line)

  const bodyLines =
    activityLines.length > 0 ? activityLines : [GENERIC_NO_ACTIVITY_LINE]

  const sections: string[] = [OPENING, ...bodyLines]

  if (eveningMoodLabel) {
    sections.push(MOOD_PRAYER_LINES[eveningMoodLabel])
  }

  sections.push(CLOSING)

  return sections.join('\n\n')
}
