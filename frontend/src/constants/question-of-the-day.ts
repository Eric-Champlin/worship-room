/**
 * @deprecated As of Spec 3.9 (2026-04-29). The Question of the Day rotation
 * lives on the backend at `GET /api/v1/qotd/today`. The frontend now fetches
 * via `useQotdToday()` (hooks/useQotdToday.ts).
 *
 * This file remains shipped as the **offline / API-failure fallback path** —
 * `useQotdToday` calls `getTodaysQuestion()` here when the backend is
 * unreachable, returns a non-200 response, or returns 404 QOTD_UNAVAILABLE.
 *
 * The file MUST stay in sync with the backend production seed (Liquibase
 * changeset `2026-04-29-001-seed-qotd-questions-production.xml`) for
 * offline / online consistency. When Phase 9.2 adds liturgical-season-aware
 * rotation server-side, this file's `getTodaysQuestion` will diverge from the
 * server response on named-season dates — that is documented in Spec 3.9 D1
 * and is the deferred regression.
 *
 * Removal of this file is deferred to a future Phase 4 offline-first
 * architecture spec that settles on a different fallback story (e.g.,
 * service-worker-cached API responses).
 */
import type { LiturgicalSeasonId } from '@/constants/liturgical-calendar'
import { getLiturgicalSeason, getDayWithinSeason } from '@/constants/liturgical-calendar'

export interface QuestionOfTheDay {
  id: string
  text: string
  theme: 'faith_journey' | 'practical' | 'reflective' | 'encouraging' | 'community' | 'seasonal'
  hint?: string
  liturgicalSeason?: LiturgicalSeasonId
}

export const QUESTION_THEMES = [
  'faith_journey',
  'practical',
  'reflective',
  'encouraging',
  'community',
  'seasonal',
] as const

export const QUESTION_OF_THE_DAY_POOL: QuestionOfTheDay[] = [
  // --- Faith Journey (10) ---
  {
    id: 'qotd-1',
    text: 'What Bible verse has meant the most to you this year?',
    theme: 'faith_journey',
    hint: 'Think about a verse that spoke to you during a specific season.',
  },
  {
    id: 'qotd-2',
    text: 'How has your prayer life changed over the years?',
    theme: 'faith_journey',
  },
  {
    id: 'qotd-3',
    text: 'What was the moment you first felt called to follow Jesus?',
    theme: 'faith_journey',
    hint: 'It could be a big event or a quiet realization.',
  },
  {
    id: 'qotd-4',
    text: 'What spiritual practice has helped you grow the most this year?',
    theme: 'faith_journey',
  },
  {
    id: 'qotd-5',
    text: 'How do you handle seasons of doubt in your faith?',
    theme: 'faith_journey',
    hint: 'Doubt is part of the journey for many believers.',
  },
  {
    id: 'qotd-6',
    text: 'What is one thing you wish someone had told you early in your faith journey?',
    theme: 'faith_journey',
  },
  {
    id: 'qotd-7',
    text: 'What hymn or worship song has shaped your faith the most?',
    theme: 'faith_journey',
    hint: 'Think about a song that brings you back to a meaningful moment.',
  },
  {
    id: 'qotd-8',
    text: 'How has God surprised you in the last year?',
    theme: 'faith_journey',
  },
  {
    id: 'qotd-9',
    text: 'What book of the Bible are you most drawn to right now, and why?',
    theme: 'faith_journey',
    hint: 'Sometimes a particular book speaks to our current season.',
  },
  {
    id: 'qotd-10',
    text: 'What does "walking by faith, not by sight" look like in your everyday life?',
    theme: 'faith_journey',
  },

  // --- Practical (10) ---
  {
    id: 'qotd-11',
    text: 'How do you make time for God in a busy schedule?',
    theme: 'practical',
    hint: 'Share a routine or habit that helps you stay connected.',
  },
  {
    id: 'qotd-12',
    text: 'What is your favorite way to memorize Scripture?',
    theme: 'practical',
  },
  {
    id: 'qotd-13',
    text: 'How do you bring your faith into your workplace or school?',
    theme: 'practical',
    hint: 'Small actions can have a big impact.',
  },
  {
    id: 'qotd-14',
    text: 'What is one practical way you serve others in your daily routine?',
    theme: 'practical',
  },
  {
    id: 'qotd-15',
    text: 'How do you stay consistent with Bible reading when life gets hectic?',
    theme: 'practical',
    hint: 'What tools or plans have worked for you?',
  },
  {
    id: 'qotd-16',
    text: 'What does your morning quiet time look like?',
    theme: 'practical',
  },
  {
    id: 'qotd-17',
    text: 'How do you teach your children or younger family members about faith?',
    theme: 'practical',
    hint: 'Even small conversations can plant seeds.',
  },
  {
    id: 'qotd-18',
    text: 'What is one way you practice generosity in everyday life?',
    theme: 'practical',
  },
  {
    id: 'qotd-19',
    text: 'How do you choose which devotional or Bible plan to follow?',
    theme: 'practical',
  },
  {
    id: 'qotd-20',
    text: 'What is a simple habit that has deepened your relationship with God?',
    theme: 'practical',
    hint: 'Sometimes the smallest changes make the biggest difference.',
  },

  // --- Reflective (10) ---
  {
    id: 'qotd-21',
    text: 'When was the last time you felt God\'s presence clearly?',
    theme: 'reflective',
    hint: 'Think about a moment this week where you felt peace.',
  },
  {
    id: 'qotd-22',
    text: 'What does forgiveness mean to you, and who have you needed to forgive?',
    theme: 'reflective',
  },
  {
    id: 'qotd-23',
    text: 'How has a difficult season ultimately strengthened your faith?',
    theme: 'reflective',
    hint: 'Looking back, what did God teach you through it?',
  },
  {
    id: 'qotd-24',
    text: 'What does it mean to you to "be still and know that I am God"?',
    theme: 'reflective',
  },
  {
    id: 'qotd-25',
    text: 'What is a prayer you prayed that was answered differently than you expected?',
    theme: 'reflective',
    hint: 'God\'s answer is sometimes better than what we asked for.',
  },
  {
    id: 'qotd-26',
    text: 'How do you experience God in nature or the world around you?',
    theme: 'reflective',
  },
  {
    id: 'qotd-27',
    text: 'What part of the Gospel story resonates most deeply with you right now?',
    theme: 'reflective',
    hint: 'Different seasons draw us to different parts of the story.',
  },
  {
    id: 'qotd-28',
    text: 'How has worship changed the way you see a problem you are facing?',
    theme: 'reflective',
  },
  {
    id: 'qotd-29',
    text: 'What is a lesson you keep learning over and over in your walk with God?',
    theme: 'reflective',
  },
  {
    id: 'qotd-30',
    text: 'If you could sit down with any person from the Bible, who would it be and why?',
    theme: 'reflective',
    hint: 'What question would you ask them?',
  },

  // --- Encouraging (10) ---
  {
    id: 'qotd-31',
    text: 'What is one thing God has taught you recently?',
    theme: 'encouraging',
    hint: 'It might be something small but meaningful.',
  },
  {
    id: 'qotd-32',
    text: 'What is a blessing you almost overlooked today?',
    theme: 'encouraging',
  },
  {
    id: 'qotd-33',
    text: 'How has God shown His faithfulness in your life this month?',
    theme: 'encouraging',
    hint: 'Sometimes faithfulness shows up in unexpected ways.',
  },
  {
    id: 'qotd-34',
    text: 'What is a promise from Scripture that you are holding onto right now?',
    theme: 'encouraging',
  },
  {
    id: 'qotd-35',
    text: 'What is one way God has provided for you when you least expected it?',
    theme: 'encouraging',
    hint: 'Sharing stories of provision encourages others.',
  },
  {
    id: 'qotd-36',
    text: 'What makes you grateful to be part of the body of Christ?',
    theme: 'encouraging',
  },
  {
    id: 'qotd-37',
    text: 'What is a kind word or encouragement someone shared with you that you still remember?',
    theme: 'encouraging',
    hint: 'Words of encouragement can last a lifetime.',
  },
  {
    id: 'qotd-38',
    text: 'How do you remind yourself of God\'s goodness on hard days?',
    theme: 'encouraging',
  },
  {
    id: 'qotd-39',
    text: 'What answered prayer are you most thankful for?',
    theme: 'encouraging',
  },
  {
    id: 'qotd-40',
    text: 'What does joy look like in your life right now?',
    theme: 'encouraging',
    hint: 'Joy does not always mean happiness — it can be a deep peace.',
  },

  // --- Community (10) ---
  {
    id: 'qotd-41',
    text: 'How has another believer encouraged you this week?',
    theme: 'community',
    hint: 'Even a simple text or smile can make a difference.',
  },
  {
    id: 'qotd-42',
    text: 'What does Christian community mean to you?',
    theme: 'community',
  },
  {
    id: 'qotd-43',
    text: 'How do you support a friend who is going through a tough season?',
    theme: 'community',
    hint: 'Sometimes just showing up is enough.',
  },
  {
    id: 'qotd-44',
    text: 'What is the most meaningful way your church has served your community?',
    theme: 'community',
  },
  {
    id: 'qotd-45',
    text: 'Who is someone you would like to pray for today, and why?',
    theme: 'community',
    hint: 'Lifting others up in prayer is a gift.',
  },
  {
    id: 'qotd-46',
    text: 'How do you welcome newcomers into your faith community?',
    theme: 'community',
  },
  {
    id: 'qotd-47',
    text: 'What is one thing you have learned from a fellow believer recently?',
    theme: 'community',
    hint: 'We grow stronger when we learn from each other.',
  },
  {
    id: 'qotd-48',
    text: 'How do you stay connected with your church family during busy seasons?',
    theme: 'community',
  },
  {
    id: 'qotd-49',
    text: 'What role does accountability play in your spiritual growth?',
    theme: 'community',
  },
  {
    id: 'qotd-50',
    text: 'How has this online community helped you in your faith journey?',
    theme: 'community',
    hint: 'Share how connecting with others here has impacted you.',
  },

  // --- Seasonal (10) ---
  {
    id: 'qotd-51',
    text: 'What are you praying for this season?',
    theme: 'seasonal',
    hint: 'Seasons change, and so do our prayers.',
  },
  {
    id: 'qotd-52',
    text: 'What is a New Year resolution you made for your spiritual life?',
    theme: 'seasonal',
  },
  {
    id: 'qotd-53',
    text: 'How do you celebrate Easter in a way that deepens your faith?',
    theme: 'seasonal',
    hint: 'What traditions or practices are meaningful to you?',
  },
  {
    id: 'qotd-54',
    text: 'What does Advent or the Christmas season teach you about waiting on God?',
    theme: 'seasonal',
  },
  {
    id: 'qotd-55',
    text: 'How do you practice gratitude during the Thanksgiving season?',
    theme: 'seasonal',
    hint: 'Gratitude is a discipline, not just a holiday.',
  },
  {
    id: 'qotd-56',
    text: 'What is a Bible passage that feels especially relevant to the season you are in?',
    theme: 'seasonal',
  },
  {
    id: 'qotd-57',
    text: 'How do you find rest during the busy holiday season?',
    theme: 'seasonal',
    hint: 'Rest is not laziness — it is obedience.',
  },
  {
    id: 'qotd-58',
    text: 'What spiritual goal are you working toward this month?',
    theme: 'seasonal',
  },
  {
    id: 'qotd-59',
    text: 'How has the changing of the seasons reminded you of God\'s faithfulness?',
    theme: 'seasonal',
    hint: 'Creation itself declares His glory.',
  },
  {
    id: 'qotd-60',
    text: 'What is one thing you want to surrender to God before this year ends?',
    theme: 'seasonal',
  },

  // --- Liturgical Season Questions (12) ---

  // Advent (3)
  {
    id: 'qotd-61',
    text: 'What are you most anticipating about the coming of Christ this Advent season?',
    theme: 'seasonal',
    liturgicalSeason: 'advent',
    hint: 'Advent is a season of waiting and hope.',
  },
  {
    id: 'qotd-62',
    text: 'How are you preparing your heart for Christmas this Advent?',
    theme: 'seasonal',
    liturgicalSeason: 'advent',
  },
  {
    id: 'qotd-63',
    text: 'What does the theme of hope mean to you during this Advent season?',
    theme: 'seasonal',
    liturgicalSeason: 'advent',
    hint: 'Hope is one of the four Advent themes: hope, peace, joy, and love.',
  },

  // Lent (3)
  {
    id: 'qotd-64',
    text: 'What spiritual practice are you taking on or giving up this Lenten season?',
    theme: 'seasonal',
    liturgicalSeason: 'lent',
    hint: 'Lent is a season of self-examination and renewal.',
  },
  {
    id: 'qotd-65',
    text: 'How is God drawing you closer to Himself during this season of Lent?',
    theme: 'seasonal',
    liturgicalSeason: 'lent',
  },
  {
    id: 'qotd-66',
    text: 'What area of your life is God inviting you to surrender this Lent?',
    theme: 'seasonal',
    liturgicalSeason: 'lent',
    hint: 'Surrender is not defeat — it is trust.',
  },

  // Easter (3)
  {
    id: 'qotd-67',
    text: 'How does the resurrection of Jesus give you hope in your daily life?',
    theme: 'seasonal',
    liturgicalSeason: 'easter',
    hint: 'Easter is not just a day — it is a season of celebration.',
  },
  {
    id: 'qotd-68',
    text: 'What area of your life feels like it needs resurrection right now?',
    theme: 'seasonal',
    liturgicalSeason: 'easter',
  },
  {
    id: 'qotd-69',
    text: 'How are you celebrating the new life that Easter represents?',
    theme: 'seasonal',
    liturgicalSeason: 'easter',
    hint: 'New life can show up in unexpected places.',
  },

  // Christmas (3)
  {
    id: 'qotd-70',
    text: 'What does the birth of Jesus mean for your life today?',
    theme: 'seasonal',
    liturgicalSeason: 'christmas',
    hint: 'Christmas is the celebration of God entering our world.',
  },
  {
    id: 'qotd-71',
    text: 'How are you sharing the love of Christ with others this Christmas season?',
    theme: 'seasonal',
    liturgicalSeason: 'christmas',
  },
  {
    id: 'qotd-72',
    text: 'What gift of God are you most grateful for this Christmas?',
    theme: 'seasonal',
    liturgicalSeason: 'christmas',
    hint: 'The greatest gift is not under the tree.',
  },
]

export function getTodaysQuestion(date: Date = new Date()): QuestionOfTheDay {
  const { currentSeason, isNamedSeason } = getLiturgicalSeason(date)

  if (isNamedSeason) {
    const seasonalQuestions = QUESTION_OF_THE_DAY_POOL.filter(
      (q) => q.liturgicalSeason === currentSeason.id,
    )
    if (seasonalQuestions.length > 0) {
      const dayInSeason = getDayWithinSeason(currentSeason.id, date)
      // After all seasonal questions shown, fall back to general pool
      if (dayInSeason < seasonalQuestions.length) {
        return seasonalQuestions[dayInSeason]
      }
    }
  }

  // Fallback: general pool rotation
  const year = date.getFullYear()
  const dayOfYear = Math.floor(
    (Date.UTC(year, date.getMonth(), date.getDate()) - Date.UTC(year, 0, 0)) /
      (1000 * 60 * 60 * 24),
  )
  return QUESTION_OF_THE_DAY_POOL[dayOfYear % QUESTION_OF_THE_DAY_POOL.length]
}
