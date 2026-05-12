// frontend/src/constants/prayer-receipt-verses.ts
//
// 60 curated WEB scripture verses for the Prayer Receipt feature.
// Selection criteria (Gate-29 / D-Verses):
// - WEB translation only
// - Gift-not-guilt test passes
// - Reads naturally to a user receiving prayer
// - Avoid: heavy law/judgment passages, prosperity-gospel framings, conditional promises

export type PrayerReceiptVerse = {
  reference: string
  text: string
}

export const PRAYER_RECEIPT_VERSES: ReadonlyArray<PrayerReceiptVerse> = [
  { reference: 'Numbers 6:24', text: 'Yahweh bless you, and keep you.' },
  { reference: 'Numbers 6:26', text: 'Yahweh lift up his face toward you, and give you peace.' },
  { reference: 'Deuteronomy 31:6', text: 'Be strong and courageous. Don\'t be afraid or scared of them; for Yahweh your God himself is who goes with you. He will not fail you nor forsake you.' },
  { reference: 'Joshua 1:9', text: 'Be strong and courageous. Don\'t be afraid. Don\'t be dismayed, for Yahweh your God is with you wherever you go.' },
  { reference: 'Psalm 16:8', text: 'I have set Yahweh always before me. Because he is at my right hand, I shall not be moved.' },
  { reference: 'Psalm 18:2', text: 'Yahweh is my rock, my fortress, and my deliverer; my God, my rock, in whom I take refuge.' },
  { reference: 'Psalm 23:1', text: 'Yahweh is my shepherd: I shall lack nothing.' },
  { reference: 'Psalm 27:1', text: 'Yahweh is my light and my salvation. Whom shall I fear? Yahweh is the strength of my life. Of whom shall I be afraid?' },
  { reference: 'Psalm 28:7', text: 'Yahweh is my strength and my shield. My heart has trusted in him, and I am helped.' },
  { reference: 'Psalm 30:5', text: 'His favor is for a lifetime. Weeping may stay for the night, but joy comes in the morning.' },
  { reference: 'Psalm 34:18', text: 'Yahweh is near to those who have a broken heart, and saves those who have a crushed spirit.' },
  { reference: 'Psalm 36:7', text: 'How precious is your loving kindness, God! The children of men take refuge under the shadow of your wings.' },
  { reference: 'Psalm 46:1', text: 'God is our refuge and strength, a very present help in trouble.' },
  { reference: 'Psalm 46:10', text: 'Be still, and know that I am God.' },
  { reference: 'Psalm 55:22', text: 'Cast your burden on Yahweh and he will sustain you. He will never allow the righteous to be moved.' },
  { reference: 'Psalm 56:3', text: 'When I am afraid, I will put my trust in you.' },
  { reference: 'Psalm 73:26', text: 'My flesh and my heart fails, but God is the strength of my heart and my portion forever.' },
  { reference: 'Psalm 86:5', text: 'For you, Lord, are good, and ready to forgive, abundant in loving kindness to all those who call on you.' },
  { reference: 'Psalm 91:1', text: 'He who dwells in the secret place of the Most High will rest in the shadow of the Almighty.' },
  { reference: 'Psalm 91:11', text: 'For he will put his angels in charge of you, to guard you in all your ways.' },
  { reference: 'Psalm 116:7', text: 'Return to your rest, my soul, for Yahweh has dealt bountifully with you.' },
  { reference: 'Psalm 121:1', text: 'I will lift up my eyes to the hills. Where does my help come from?' },
  { reference: 'Psalm 138:7', text: 'Though I walk in the middle of trouble, you will revive me. Your right hand will save me.' },
  { reference: 'Psalm 139:10', text: 'Even there your hand will lead me, and your right hand will hold me.' },
  { reference: 'Psalm 147:3', text: 'He heals the broken in heart, and binds up their wounds.' },
  { reference: 'Proverbs 18:10', text: 'Yahweh\'s name is a strong tower: the righteous run to him, and are safe.' },
  { reference: 'Isaiah 26:3', text: 'You will keep whoever\'s mind is steadfast in perfect peace, because he trusts in you.' },
  { reference: 'Isaiah 40:29', text: 'He gives power to the weak. He increases the strength of him who has no might.' },
  { reference: 'Isaiah 40:31', text: 'Those who wait for Yahweh will renew their strength. They will mount up with wings like eagles. They will run, and not be weary. They will walk, and not faint.' },
  { reference: 'Isaiah 41:10', text: 'Don\'t you be afraid, for I am with you. Don\'t be dismayed, for I am your God. I will strengthen you. I will help you. I will uphold you with my right hand.' },
  { reference: 'Isaiah 43:2', text: 'When you pass through the waters, I will be with you; and through the rivers, they will not overflow you.' },
  { reference: 'Isaiah 49:15', text: 'Can a woman forget her nursing child? Yes, these may forget, yet I will not forget you.' },
  { reference: 'Jeremiah 29:11', text: 'For I know the thoughts that I think toward you, says Yahweh, thoughts of peace, and not of evil, to give you hope and a future.' },
  { reference: 'Jeremiah 31:3', text: 'I have loved you with an everlasting love. Therefore I have drawn you with loving kindness.' },
  { reference: 'Lamentations 3:22', text: 'It is because of Yahweh\'s loving kindnesses that we are not consumed, because his compassion doesn\'t fail.' },
  { reference: 'Lamentations 3:23', text: 'They are new every morning. Great is your faithfulness.' },
  { reference: 'Zephaniah 3:17', text: 'Yahweh, your God, is among you, a mighty one who will save. He will rejoice over you with joy. He will calm you in his love. He will rejoice over you with singing.' },
  { reference: 'Matthew 5:4', text: 'Blessed are those who mourn, for they shall be comforted.' },
  { reference: 'Matthew 6:26', text: 'See the birds of the sky, that they don\'t sow, neither do they reap. Your heavenly Father feeds them. Aren\'t you of much more value than they?' },
  { reference: 'Matthew 11:28', text: 'Come to me, all you who labor and are heavily burdened, and I will give you rest.' },
  { reference: 'Matthew 28:20', text: 'I am with you always, even to the end of the age.' },
  { reference: 'John 14:1', text: 'Don\'t let your heart be troubled. Believe in God. Believe also in me.' },
  { reference: 'John 14:27', text: 'Peace I leave with you. My peace I give to you; not as the world gives, give I to you. Don\'t let your heart be troubled, neither let it be fearful.' },
  { reference: 'John 16:33', text: 'I have told you these things, that in me you may have peace. In the world you have trouble; but cheer up! I have overcome the world.' },
  { reference: 'Romans 8:28', text: 'We know that all things work together for good for those who love God, for those who are called according to his purpose.' },
  { reference: 'Romans 8:39', text: 'Neither height, nor depth, nor any other created thing, will be able to separate us from God\'s love, which is in Christ Jesus our Lord.' },
  { reference: 'Romans 15:13', text: 'Now may the God of hope fill you with all joy and peace in believing, that you may abound in hope, in the power of the Holy Spirit.' },
  { reference: '1 Corinthians 13:7', text: 'Love bears all things, believes all things, hopes all things, endures all things.' },
  { reference: '2 Corinthians 1:3', text: 'Blessed be the God and Father of our Lord Jesus Christ, the Father of mercies and God of all comfort.' },
  { reference: '2 Corinthians 12:9', text: 'My grace is sufficient for you, for my power is made perfect in weakness.' },
  { reference: 'Ephesians 3:20', text: 'Now to him who is able to do exceedingly abundantly above all that we ask or think, according to the power that works in us.' },
  { reference: 'Philippians 4:7', text: 'And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus.' },
  { reference: 'Philippians 4:13', text: 'I can do all things through Christ, who strengthens me.' },
  { reference: 'Philippians 4:19', text: 'My God will supply every need of yours according to his riches in glory in Christ Jesus.' },
  { reference: '2 Timothy 1:7', text: 'For God didn\'t give us a spirit of fear, but of power, love, and self-control.' },
  { reference: 'Hebrews 4:16', text: 'Let\'s therefore draw near with boldness to the throne of grace, that we may receive mercy, and may find grace for help in time of need.' },
  { reference: 'Hebrews 13:8', text: 'Jesus Christ is the same yesterday, today, and forever.' },
  { reference: '1 Peter 5:7', text: 'Casting all your worries on him, because he cares for you.' },
  { reference: '1 John 3:1', text: 'Behold, how great a love the Father has bestowed on us, that we should be called children of God!' },
  { reference: 'Revelation 21:4', text: 'He will wipe away every tear from their eyes. Death will be no more; neither will there be mourning, nor crying, nor pain any more.' },
] as const

// Length invariant (exactly 60 entries — Gate-29) is enforced by
// `prayer-receipt-verses.test.ts`. We deliberately do NOT throw at module
// load: a count mismatch should fail CI, not crash the running app for
// every user the moment a verse is accidentally deleted.

/**
 * Returns the verse for the given date based on UTC day-of-year mod 60.
 * Same UTC day → same verse for every user worldwide.
 */
export function getTodaysVerse(date: Date = new Date()): PrayerReceiptVerse {
  const startOfYearUtc = Date.UTC(date.getUTCFullYear(), 0, 0)
  const todayUtc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  const dayOfYear = Math.floor((todayUtc - startOfYearUtc) / 86_400_000)
  return PRAYER_RECEIPT_VERSES[(dayOfYear - 1) % 60]
}
