import type { LiturgicalSeasonId } from '@/constants/liturgical-calendar'
import { getLiturgicalSeason, getDayWithinSeason } from '@/constants/liturgical-calendar'

export interface VerseOfTheDay {
  text: string
  reference: string
  theme: 'hope' | 'comfort' | 'strength' | 'praise' | 'trust' | 'peace'
  season?: LiturgicalSeasonId
}

/**
 * 60-verse pool for Verse of the Day.
 * First 30: existing DAILY_VERSES from daily-experience-mock-data.ts (mapped to 6 themes).
 * Next 30: new WEB translation verses (5 per theme), no duplicates with any existing codebase references.
 */
export const VERSE_OF_THE_DAY_POOL: VerseOfTheDay[] = [
  // --- Existing 30 from DAILY_VERSES (theme-mapped) ---
  {
    text: 'In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God. And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus.',
    reference: 'Philippians 4:6-7',
    theme: 'peace',
  },
  {
    text: '"For I know the thoughts that I think toward you," says Yahweh, "thoughts of peace, and not of evil, to give you hope and a future."',
    reference: 'Jeremiah 29:11',
    theme: 'hope',
    season: 'advent',
  },
  {
    text: 'He heals the broken in heart, and binds up their wounds.',
    reference: 'Psalm 147:3',
    theme: 'comfort',
  },
  {
    text: '"Come to me, all you who labor and are heavily burdened, and I will give you rest. Take my yoke upon you and learn from me, for I am gentle and humble in heart; and you will find rest for your souls. For my yoke is easy, and my burden is light."',
    reference: 'Matthew 11:28-30',
    theme: 'comfort',
  },
  {
    text: 'Give thanks to Yahweh, for he is good, for his loving kindness endures forever.',
    reference: 'Psalm 107:1',
    theme: 'praise',
  },
  {
    text: 'But those who wait for Yahweh will renew their strength. They will mount up with wings like eagles. They will run, and not be weary. They will walk, and not faint.',
    reference: 'Isaiah 40:31',
    theme: 'strength',
    season: 'advent',
  },
  {
    text: "Trust in Yahweh with all your heart, and don't lean on your own understanding. In all your ways acknowledge him, and he will make your paths straight.",
    reference: 'Proverbs 3:5-6',
    theme: 'trust',
  },
  {
    text: 'Yahweh is near to those who have a broken heart, and saves those who have a crushed spirit.',
    reference: 'Psalm 34:18',
    theme: 'comfort',
    season: 'lent',
  },
  {
    text: "Don't be grieved, for the joy of Yahweh is your strength.",
    reference: 'Nehemiah 8:10',
    theme: 'praise',
  },
  {
    text: 'bearing with one another, and forgiving each other, if any man has a complaint against any; even as Christ forgave you, so you also do.',
    reference: 'Colossians 3:13',
    theme: 'peace',
    season: 'holy-week',
  },
  {
    text: "You will keep whoever's mind is steadfast in perfect peace, because he trusts in you.",
    reference: 'Isaiah 26:3',
    theme: 'peace',
  },
  {
    text: 'Now may the God of hope fill you with all joy and peace in believing, that you may abound in hope in the power of the Holy Spirit.',
    reference: 'Romans 15:13',
    theme: 'hope',
    season: 'christmas',
  },
  {
    text: 'But he was pierced for our transgressions. He was crushed for our iniquities. The punishment that brought our peace was on him; and by his wounds we are healed.',
    reference: 'Isaiah 53:5',
    theme: 'comfort',
    season: 'holy-week',
  },
  {
    text: 'casting all your worries on him, because he cares for you.',
    reference: '1 Peter 5:7',
    theme: 'comfort',
  },
  {
    text: 'In everything give thanks, for this is the will of God in Christ Jesus toward you.',
    reference: '1 Thessalonians 5:18',
    theme: 'praise',
  },
  {
    text: 'I can do all things through Christ, who strengthens me.',
    reference: 'Philippians 4:13',
    theme: 'strength',
  },
  {
    text: 'When I am afraid, I will put my trust in you. In God, I praise his word. In God, I put my trust. I will not be afraid. What can flesh do to me?',
    reference: 'Psalm 56:3-4',
    theme: 'trust',
  },
  {
    text: 'He will wipe away every tear from their eyes. Death will be no more; neither will there be mourning, nor crying, nor pain any more. The first things have passed away.',
    reference: 'Revelation 21:4',
    theme: 'comfort',
    season: 'easter',
  },
  {
    text: 'You will show me the path of life. In your presence is fullness of joy. In your right hand there are pleasures forever more.',
    reference: 'Psalm 16:11',
    theme: 'praise',
  },
  {
    text: 'And be kind to one another, tender hearted, forgiving each other, just as God also in Christ forgave you.',
    reference: 'Ephesians 4:32',
    theme: 'peace',
  },
  {
    text: "Peace I leave with you. My peace I give to you; not as the world gives, I give to you. Don't let your heart be troubled, neither let it be fearful.",
    reference: 'John 14:27',
    theme: 'peace',
    season: 'christmas',
  },
  {
    text: 'We know that all things work together for good for those who love God, for those who are called according to his purpose.',
    reference: 'Romans 8:28',
    theme: 'hope',
    season: 'easter',
  },
  {
    text: 'And the prayer of faith will heal him who is sick, and the Lord will raise him up. If he has committed sins, he will be forgiven.',
    reference: 'James 5:15',
    theme: 'comfort',
  },
  {
    text: 'In the multitude of my thoughts within me, your comforts delight my soul.',
    reference: 'Psalm 94:19',
    theme: 'comfort',
  },
  {
    text: 'Enter into his gates with thanksgiving, and into his courts with praise. Give thanks to him, and bless his name.',
    reference: 'Psalm 100:4',
    theme: 'praise',
  },
  {
    text: "Be strong and courageous. Don't be afraid or scared of them, for Yahweh your God himself is who goes with you. He will not fail you nor forsake you.",
    reference: 'Deuteronomy 31:6',
    theme: 'strength',
  },
  {
    text: 'Commit your way to Yahweh. Trust also in him, and he will do this.',
    reference: 'Psalm 37:5',
    theme: 'trust',
  },
  {
    text: 'My flesh and my heart fails, but God is the strength of my heart and my portion forever.',
    reference: 'Psalm 73:26',
    theme: 'comfort',
    season: 'lent',
  },
  {
    text: 'rejoicing in hope, enduring in troubles, continuing steadfastly in prayer.',
    reference: 'Romans 12:12',
    theme: 'hope',
  },
  {
    text: '"For if you forgive men their trespasses, your heavenly Father will also forgive you."',
    reference: 'Matthew 6:14',
    theme: 'peace',
    season: 'lent',
  },

  // --- 30 New WEB Translation Verses (5 per theme) ---

  // Hope (5)
  {
    text: 'Why are you in despair, my soul? Why are you disturbed within me? Hope in God! For I shall still praise him, the saving health of my countenance, and my God.',
    reference: 'Psalm 42:11',
    theme: 'hope',
    season: 'advent',
  },
  {
    text: 'Not only this, but we also rejoice in our sufferings, knowing that suffering produces perseverance; and perseverance, proven character; and proven character, hope.',
    reference: 'Romans 5:3-4',
    theme: 'hope',
    season: 'lent',
  },
  {
    text: 'Now faith is assurance of things hoped for, proof of things not seen.',
    reference: 'Hebrews 11:1',
    theme: 'hope',
    season: 'easter',
  },
  {
    text: 'I wait for Yahweh. My soul waits. I hope in his word.',
    reference: 'Psalm 130:5',
    theme: 'hope',
    season: 'advent',
  },
  {
    text: '"There is hope for your latter end," says Yahweh. "Your children will come again to their own border."',
    reference: 'Jeremiah 31:17',
    theme: 'hope',
    season: 'advent',
  },

  // Comfort (5)
  {
    text: 'Blessed be the God and Father of our Lord Jesus Christ, the Father of mercies and God of all comfort, who comforts us in all our affliction, that we may be able to comfort those who are in any affliction, through the comfort with which we ourselves are comforted by God.',
    reference: '2 Corinthians 1:3-4',
    theme: 'comfort',
  },
  {
    text: 'Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me. Your rod and your staff, they comfort me.',
    reference: 'Psalm 23:4',
    theme: 'comfort',
  },
  {
    text: 'Blessed are those who mourn, for they shall be comforted.',
    reference: 'Matthew 5:4',
    theme: 'comfort',
    season: 'lent',
  },
  {
    text: 'Sing, heavens, and be joyful, earth! Break out into singing, mountains! For Yahweh has comforted his people, and will have compassion on his afflicted.',
    reference: 'Isaiah 49:13',
    theme: 'comfort',
  },
  {
    text: 'The righteous cry, and Yahweh hears, and delivers them out of all their troubles.',
    reference: 'Psalm 34:17',
    theme: 'comfort',
  },

  // Strength (5)
  {
    text: "Yahweh, the Lord, is my strength. He makes my feet like deer's feet, and enables me to go in high places.",
    reference: 'Habakkuk 3:19',
    theme: 'strength',
  },
  {
    text: 'the God who arms me with strength, and makes my way perfect.',
    reference: 'Psalm 18:32',
    theme: 'strength',
  },
  {
    text: "For God didn't give us a spirit of fear, but of power, love, and self-control.",
    reference: '2 Timothy 1:7',
    theme: 'strength',
  },
  {
    text: 'Finally, be strong in the Lord and in the strength of his might.',
    reference: 'Ephesians 6:10',
    theme: 'strength',
  },
  {
    text: 'Yahweh is my strength and my shield. My heart has trusted in him, and I am helped. Therefore my heart greatly rejoices. With my song I will thank him.',
    reference: 'Psalm 28:7',
    theme: 'strength',
  },

  // Praise (5)
  {
    text: 'Let everything that has breath praise Yah! Praise Yahweh!',
    reference: 'Psalm 150:6',
    theme: 'praise',
  },
  {
    text: 'Praise Yahweh, my soul! All that is within me, praise his holy name!',
    reference: 'Psalm 103:1',
    theme: 'praise',
  },
  {
    text: "Oh come, let's sing to Yahweh. Let's shout aloud to the rock of our salvation!",
    reference: 'Psalm 95:1',
    theme: 'praise',
  },
  {
    text: 'Because your loving kindness is better than life, my lips shall praise you.',
    reference: 'Psalm 63:3',
    theme: 'praise',
  },
  {
    text: 'Sing to Yahweh a new song! Sing to Yahweh, all the earth!',
    reference: 'Psalm 96:1',
    theme: 'praise',
    season: 'christmas',
  },

  // Trust (5)
  {
    text: 'Some trust in chariots, and some in horses, but we trust in the name of Yahweh our God.',
    reference: 'Psalm 20:7',
    theme: 'trust',
  },
  {
    text: 'Those who know your name will put their trust in you, for you, Yahweh, have not forsaken those who seek you.',
    reference: 'Psalm 9:10',
    theme: 'trust',
  },
  {
    text: 'Yahweh is good, a stronghold in the day of trouble. He knows those who take refuge in him.',
    reference: 'Nahum 1:7',
    theme: 'trust',
  },
  {
    text: 'Trust in him at all times, you people. Pour out your heart before him. God is a refuge for us.',
    reference: 'Psalm 62:8',
    theme: 'trust',
  },
  {
    text: 'Behold, God is my salvation. I will trust, and will not be afraid; for Yah, Yahweh, is my strength and song; and he has become my salvation.',
    reference: 'Isaiah 12:2',
    theme: 'trust',
  },

  // Lent — additional seasonal verses (repentance, preparation, sacrifice, wilderness, renewal, drawing near)
  {
    text: 'Draw near to God, and he will draw near to you. Cleanse your hands, you sinners. Purify your hearts, you double-minded.',
    reference: 'James 4:8',
    theme: 'trust',
    season: 'lent',
  },
  {
    text: 'Create in me a clean heart, O God. Renew a right spirit within me.',
    reference: 'Psalm 51:10',
    theme: 'hope',
    season: 'lent',
  },
  {
    text: 'Search me, God, and know my heart. Try me, and know my thoughts. See if there is any wicked way in me, and lead me in the everlasting way.',
    reference: 'Psalm 139:23-24',
    theme: 'trust',
    season: 'lent',
  },
  {
    text: "Rend your heart, and not your garments, and turn to Yahweh, your God; for he is gracious and merciful, slow to anger, and abundant in loving kindness, and relents from sending calamity.",
    reference: 'Joel 2:13',
    theme: 'comfort',
    season: 'lent',
  },
  {
    text: '"Yet even now," says Yahweh, "turn to me with all your heart, and with fasting, and with weeping, and with mourning."',
    reference: 'Joel 2:12',
    theme: 'hope',
    season: 'lent',
  },
  {
    text: 'He has shown you, O man, what is good. What does Yahweh require of you, but to act justly, to love mercy, and to walk humbly with your God?',
    reference: 'Micah 6:8',
    theme: 'peace',
    season: 'lent',
  },
  {
    text: 'For we don\'t have a high priest who can\'t be touched with the feeling of our infirmities, but one who has been in all points tempted like we are, yet without sin.',
    reference: 'Hebrews 4:15',
    theme: 'strength',
    season: 'lent',
  },
  {
    text: '"If my people who are called by my name will humble themselves, pray, seek my face, and turn from their wicked ways, then I will hear from heaven, will forgive their sin, and will heal their land."',
    reference: '2 Chronicles 7:14',
    theme: 'hope',
    season: 'lent',
  },
  {
    text: 'Therefore let us also, seeing we are surrounded by so great a cloud of witnesses, lay aside every weight and the sin which so easily entangles us, and let us run with perseverance the race that is set before us.',
    reference: 'Hebrews 12:1',
    theme: 'strength',
    season: 'lent',
  },
  {
    text: 'He made him who knew no sin to be sin on our behalf, so that in him we might become the righteousness of God.',
    reference: '2 Corinthians 5:21',
    theme: 'comfort',
    season: 'lent',
  },

  // Peace (5)
  {
    text: 'I have told you these things, that in me you may have peace. In the world you have trouble; but cheer up! I have overcome the world.',
    reference: 'John 16:33',
    theme: 'peace',
    season: 'easter',
  },
  {
    text: "for God's Kingdom is not eating and drinking, but righteousness, peace, and joy in the Holy Spirit.",
    reference: 'Romans 14:17',
    theme: 'peace',
    season: 'pentecost',
  },
  {
    text: 'The work of righteousness will be peace, and the effect of righteousness, quietness and confidence forever.',
    reference: 'Isaiah 32:17',
    theme: 'peace',
  },
  {
    text: 'Now may the Lord of peace himself give you peace at all times in all ways. The Lord be with you all.',
    reference: '2 Thessalonians 3:16',
    theme: 'peace',
  },
  {
    text: 'I will hear what God, Yahweh, will speak, for he will speak peace to his people, his saints; but let them not turn again to folly.',
    reference: 'Psalm 85:8',
    theme: 'peace',
  },
]

/**
 * Returns the Verse of the Day for a given date. Deterministic — same date always returns same verse.
 * During named liturgical seasons, prioritizes seasonal verses (cycling within the season).
 * Falls back to general pool rotation during Ordinary Time or if no seasonal verses exist.
 */
export function getTodaysVerse(date: Date = new Date()): VerseOfTheDay {
  const { currentSeason, isNamedSeason } = getLiturgicalSeason(date)

  if (isNamedSeason) {
    const seasonalVerses = VERSE_OF_THE_DAY_POOL.filter((v) => v.season === currentSeason.id)
    if (seasonalVerses.length > 0) {
      const dayInSeason = getDayWithinSeason(currentSeason.id, date)
      return seasonalVerses[dayInSeason % seasonalVerses.length]
    }
  }

  // Fallback: general pool rotation
  const year = date.getFullYear()
  const dayOfYear = Math.floor(
    (Date.UTC(year, date.getMonth(), date.getDate()) - Date.UTC(year, 0, 0)) /
      (1000 * 60 * 60 * 24),
  )
  return VERSE_OF_THE_DAY_POOL[dayOfYear % VERSE_OF_THE_DAY_POOL.length]
}
