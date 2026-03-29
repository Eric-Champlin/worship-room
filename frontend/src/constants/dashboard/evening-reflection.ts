export const EVENING_REFLECTION_STORAGE_KEY = 'wr_evening_reflection';
export const EVENING_HOUR_THRESHOLD = 18; // 6 PM

export interface EveningPrayer {
  dayOfWeek: number; // 0=Sunday ... 6=Saturday
  text: string;
}

export interface EveningVerse {
  dayOfWeek: number;
  text: string;
  reference: string;
}

export const EVENING_PRAYERS: EveningPrayer[] = [
  { dayOfWeek: 0, text: 'May the peace of this Lord\'s day stay with you through the night. You have worshipped, you have rested, and God is pleased with your faithfulness. Sleep now in the shelter of His love.' },
  { dayOfWeek: 1, text: 'As this new week begins, release every worry into God\'s hands. He has already gone before you into tomorrow. Tonight, simply rest — you have done enough for today.' },
  { dayOfWeek: 2, text: 'You have carried much today, and God sees every effort. Lay your burdens down at the foot of the cross. His strength will be renewed in you by morning.' },
  { dayOfWeek: 3, text: 'Halfway through the week, pause and breathe. God\'s mercies are new every morning, and tonight His peace guards your heart. You are held, you are known, you are loved.' },
  { dayOfWeek: 4, text: 'Thank you for showing up today — for every prayer whispered, every kindness given, every moment you chose faith over fear. Rest well in the arms of your Father.' },
  { dayOfWeek: 5, text: 'The week is nearly done, and you have persevered. Let gratitude fill your heart as you reflect on God\'s faithfulness. He who began a good work in you will carry it to completion.' },
  { dayOfWeek: 6, text: 'As this day of rest draws to a close, let stillness wash over you. God delights in you — not for what you have done, but for who you are. Sleep deeply, beloved.' },
];

export const EVENING_VERSES: EveningVerse[] = [
  { dayOfWeek: 0, text: 'You will keep whoever\'s mind is steadfast in perfect peace, because he trusts in you.', reference: 'Isaiah 26:3' },
  { dayOfWeek: 1, text: 'In peace I will both lay myself down and sleep, for you, Yahweh alone, make me live in safety.', reference: 'Psalm 4:8' },
  { dayOfWeek: 2, text: 'He who keeps you will not slumber.', reference: 'Psalm 121:3' },
  { dayOfWeek: 3, text: 'When you lie down, you will not be afraid. Yes, you will lie down, and your sleep will be sweet.', reference: 'Proverbs 3:24' },
  { dayOfWeek: 4, text: 'He who dwells in the secret place of the Most High will rest in the shadow of the Almighty.', reference: 'Psalm 91:1' },
  { dayOfWeek: 5, text: 'On my bed I remember you. I think about you in the watches of the night.', reference: 'Psalm 63:6' },
  { dayOfWeek: 6, text: 'Come to me, all you who labor and are heavily burdened, and I will give you rest.', reference: 'Matthew 11:28' },
];

export function getEveningPrayer(): EveningPrayer {
  const day = new Date().getDay();
  return EVENING_PRAYERS[day];
}

export function getEveningVerse(): EveningVerse {
  const day = new Date().getDay();
  return EVENING_VERSES[day];
}
