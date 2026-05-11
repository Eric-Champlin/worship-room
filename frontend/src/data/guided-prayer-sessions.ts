import type { GuidedPrayerSession, GuidedPrayerTheme } from '@/types/guided-prayer'

export const THEME_SCENE_MAP: Record<GuidedPrayerTheme, string> = {
  peace: 'still-waters',
  comfort: 'still-waters',
  gratitude: 'morning-mist',
  morning: 'morning-mist',
  forgiveness: 'garden-of-gethsemane',
  healing: 'garden-of-gethsemane',
  evening: 'starfield',
  strength: 'the-upper-room',
}

export const THEME_ICON_MAP: Record<GuidedPrayerTheme, string> = {
  morning: 'Sunrise',
  evening: 'Moon',
  peace: 'Leaf',
  comfort: 'Heart',
  gratitude: 'Sparkles',
  forgiveness: 'Unlock',
  strength: 'Shield',
  healing: 'HandHeart',
}

// --- Session 1: Morning Offering (5 min / morning) ---
// Target: 300s. Narration: ~75s. Silence: ~225s.
const morningOffering: GuidedPrayerSession = {
  id: 'morning-offering',
  title: 'Morning Offering',
  description: 'Begin your day by offering it to God with gratitude and trust.',
  theme: 'morning',
  durationMinutes: 5,
  icon: 'Sunrise',
  completionVerse: {
    reference: 'Psalm 5:3',
    text: 'Yahweh, in the morning you will hear my voice. In the morning I will lay my requests before you, and will watch expectantly.',
  },
  script: [
    {
      type: 'narration',
      text: 'Good morning. Take a deep breath and settle into this moment. A new day stretches before you, full of possibility and grace.',
      durationSeconds: 12,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 25,
    },
    {
      type: 'narration',
      text: 'Scripture encourages us in Lamentations 3:22-23: "It is because of Yahweh\'s loving kindnesses that we are not consumed, because his compassion doesn\'t fail. They are new every morning. Great is your faithfulness."',
      durationSeconds: 18,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 35,
    },
    {
      type: 'narration',
      text: "God's mercies are new this morning. Whatever yesterday held — the mistakes, the worries, the unfinished business — this is a fresh start. You are met with compassion right where you are.",
      durationSeconds: 15,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 50,
    },
    {
      type: 'narration',
      text: 'Now, gently offer this day to God. You might pray something like: "Lord, I give you this day. Guide my steps, my words, and my thoughts. Help me notice your presence in the ordinary moments."',
      durationSeconds: 16,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 80,
    },
    {
      type: 'narration',
      text: 'As we close, carry this truth with you: you are not walking into this day alone. God goes before you and beside you. Step forward with confidence and peace.',
      durationSeconds: 14,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 35,
    },
  ],
}

// --- Session 2: Evening Surrender (5 min / evening) ---
// Target: 300s. Narration: ~63s. Silence: ~237s.
const eveningSurrender: GuidedPrayerSession = {
  id: 'evening-surrender',
  title: 'Evening Surrender',
  description: "Release the weight and stress of your day and rest in God's care tonight.",
  theme: 'evening',
  durationMinutes: 5,
  icon: 'Moon',
  completionVerse: {
    reference: 'Psalm 91:1',
    text: 'He who dwells in the secret place of the Most High will rest in the shadow of the Almighty.',
  },
  script: [
    {
      type: 'narration',
      text: 'The day is drawing to a close. Let your shoulders drop. Let the tension in your body begin to release. You have done enough for today.',
      durationSeconds: 13,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 25,
    },
    {
      type: 'narration',
      text: 'Psalm 4:8 reminds us: "In peace I will both lay myself down and sleep, for you alone, Yahweh, make me live in safety."',
      durationSeconds: 12,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 30,
    },
    {
      type: 'narration',
      text: 'Think back over your day. Where did you see goodness? Where did you struggle? Whatever comes to mind, offer it to God now — the good and the hard alike.',
      durationSeconds: 14,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 65,
    },
    {
      type: 'narration',
      text: "Now, gently surrender the things you cannot control. The unresolved conversations, the worries about tomorrow — lay them down. They are safe in God's hands tonight.",
      durationSeconds: 14,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 75,
    },
    {
      type: 'narration',
      text: 'Rest well. You are held. You are known. And tomorrow, new mercies will be waiting for you.',
      durationSeconds: 10,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 42,
    },
  ],
}

// --- Session 3: Finding Peace (10 min / peace) ---
// Target: 600s. Narration: ~127s. Silence: ~473s.
const findingPeace: GuidedPrayerSession = {
  id: 'finding-peace',
  title: 'Finding Peace',
  description: 'Let go of anxiety and discover the peace that surpasses understanding.',
  theme: 'peace',
  durationMinutes: 10,
  icon: 'Leaf',
  completionVerse: {
    reference: 'Isaiah 26:3',
    text: "You will keep whoever's mind is steadfast in perfect peace, because he trusts in you.",
  },
  script: [
    {
      type: 'narration',
      text: 'Welcome. Find a comfortable position and take three slow, deep breaths. With each exhale, let go of a little more tension.',
      durationSeconds: 14,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 35,
    },
    {
      type: 'narration',
      text: 'Peace can feel far away when life is noisy and uncertain. But Scripture reminds us that true peace is not the absence of trouble — it is the presence of God in the midst of it.',
      durationSeconds: 15,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 30,
    },
    {
      type: 'narration',
      text: 'Philippians 4:6-7 says: "In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God. And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus."',
      durationSeconds: 22,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 50,
    },
    {
      type: 'narration',
      text: 'Notice what is causing you anxiety right now. Name it, if you can — even silently. There is no need to solve it in this moment. Simply bring it before God.',
      durationSeconds: 14,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 70,
    },
    {
      type: 'narration',
      text: 'Now, with thanksgiving, remember one thing you are grateful for today. Gratitude opens the door to peace. Let that gratitude grow in your heart.',
      durationSeconds: 13,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 60,
    },
    {
      type: 'narration',
      text: "Scripture encourages us that God's peace will guard our hearts and minds. Picture that peace like a gentle shield around you — not removing the difficulties, but protecting your inner world.",
      durationSeconds: 16,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 55,
    },
    {
      type: 'narration',
      text: "As we pray together: Lord, I bring my worries to you. I choose to trust you with what I cannot control. Fill me with your peace — the kind that doesn't depend on circumstances but rests in who you are.",
      durationSeconds: 17,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 80,
    },
    {
      type: 'narration',
      text: 'Carry this peace with you. It is yours — not because everything is resolved, but because you are held by the One who holds all things.',
      durationSeconds: 12,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 97,
    },
  ],
}

// --- Session 4: Comfort in Sorrow (10 min / comfort) ---
// Target: 600s. Narration: ~111s. Silence: ~489s.
const comfortInSorrow: GuidedPrayerSession = {
  id: 'comfort-in-sorrow',
  title: 'Comfort in Sorrow',
  description: "Find God's nearness when your heart is heavy with grief or sadness.",
  theme: 'comfort',
  durationMinutes: 10,
  icon: 'Heart',
  completionVerse: {
    reference: '2 Corinthians 1:3-4',
    text: 'Blessed be the God and Father of our Lord Jesus Christ, the Father of mercies and God of all comfort, who comforts us in all our affliction.',
  },
  script: [
    {
      type: 'narration',
      text: "You are welcome here, just as you are. If your heart is heavy today, you don't need to hide that. God meets us in our sorrow, not just in our joy.",
      durationSeconds: 14,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 30,
    },
    {
      type: 'narration',
      text: 'Psalm 34:18 says: "Yahweh is near to those who have a broken heart, and saves those who have a crushed spirit."',
      durationSeconds: 12,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 40,
    },
    {
      type: 'narration',
      text: "Take a moment to acknowledge what hurts. You don't need to explain it fully or make sense of it. Simply allow yourself to feel it in God's presence.",
      durationSeconds: 13,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 80,
    },
    {
      type: 'narration',
      text: 'God does not ask us to be strong in our grief. He asks us to let him be strong for us. Psalm 56:8 tells us he is so attentive that he keeps track of every tear.',
      durationSeconds: 15,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 55,
    },
    {
      type: 'narration',
      text: 'Now, imagine God sitting with you right here — not fixing anything, not rushing you, just being present. That is what comfort looks like.',
      durationSeconds: 13,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 80,
    },
    {
      type: 'narration',
      text: "Let us pray: Lord, my heart is heavy and I don't have the words. But you know. You see. Draw near to me now. Wrap me in your comfort and remind me that I am never alone in this.",
      durationSeconds: 16,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 75,
    },
    {
      type: 'narration',
      text: 'Psalm 23:4 reminds us: "Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me. Your rod and your staff, they comfort me."',
      durationSeconds: 16,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 60,
    },
    {
      type: 'narration',
      text: "As you leave this time, know that it's okay to not be okay. Healing is not a straight line. You are brave for showing up, and God is gentle with your heart.",
      durationSeconds: 14,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 67,
    },
  ],
}

// --- Session 5: Gratitude Prayer (5 min / gratitude) ---
// Target: 300s. Narration: ~75s. Silence: ~225s.
const gratitudePrayer: GuidedPrayerSession = {
  id: 'gratitude-prayer',
  title: 'Gratitude Prayer',
  description: "Cultivate a thankful heart by noticing God's gifts in your life.",
  theme: 'gratitude',
  durationMinutes: 5,
  icon: 'Sparkles',
  completionVerse: {
    reference: 'Psalm 107:1',
    text: 'Give thanks to Yahweh, for he is good, for his loving kindness endures forever.',
  },
  script: [
    {
      type: 'narration',
      text: 'Take a moment to pause and shift your attention from what is lacking to what is present. Gratitude is a practice, and it begins with simply noticing.',
      durationSeconds: 13,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 25,
    },
    {
      type: 'narration',
      text: '1 Thessalonians 5:18 encourages us: "In everything give thanks, for this is the will of God in Christ Jesus toward you."',
      durationSeconds: 11,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 30,
    },
    {
      type: 'narration',
      text: 'Think of one person in your life you are grateful for. Picture their face. Thank God for the ways they have shown you love or kindness.',
      durationSeconds: 13,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 55,
    },
    {
      type: 'narration',
      text: "Now think of one simple gift from today — the warmth of sunlight, a meal, a moment of laughter. Even small gifts carry God's fingerprints.",
      durationSeconds: 13,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 50,
    },
    {
      type: 'narration',
      text: 'Let us pray: Thank you, Lord, for every good gift — the ones I notice and the ones I overlook. Grow in me a heart that sees your generosity everywhere.',
      durationSeconds: 13,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 45,
    },
    {
      type: 'narration',
      text: 'Carry this grateful heart with you. When the day feels heavy, return to one thing you named here and let it anchor you in thankfulness.',
      durationSeconds: 12,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 20,
    },
  ],
}

// --- Session 6: Forgiveness Release (15 min / forgiveness) ---
// Target: 900s. Narration: ~180s. Silence: ~720s.
const forgivenessRelease: GuidedPrayerSession = {
  id: 'forgiveness-release',
  title: 'Forgiveness Release',
  description: 'Begin the journey of releasing bitterness and finding freedom in forgiveness.',
  theme: 'forgiveness',
  durationMinutes: 15,
  icon: 'Unlock',
  completionVerse: {
    reference: 'Colossians 3:13',
    text: 'Bearing with one another, and forgiving each other, if any man has a complaint against any; even as Christ forgave you, so you also do.',
  },
  script: [
    {
      type: 'narration',
      text: 'Forgiveness is one of the hardest things we are asked to do. It is also one of the most freeing. This time is not about rushing the process — it is about beginning it, or taking the next step.',
      durationSeconds: 17,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 25,
    },
    {
      type: 'narration',
      text: "Let's begin by settling our hearts. Take a few slow breaths. Release the tension you may be holding — in your jaw, your shoulders, your chest.",
      durationSeconds: 13,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 40,
    },
    {
      type: 'narration',
      text: 'Jesus taught in Matthew 6:14-15: "For if you forgive men their trespasses, your heavenly Father will also forgive you. But if you don\'t forgive men their trespasses, neither will your Father forgive your trespasses."',
      durationSeconds: 18,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 45,
    },
    {
      type: 'narration',
      text: 'These words are not meant to burden you with guilt. They are an invitation into freedom. Unforgiveness can become a weight we carry without realizing how heavy it has grown.',
      durationSeconds: 15,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 55,
    },
    {
      type: 'narration',
      text: 'Gently, bring to mind someone who has hurt you. You do not need to minimize what happened. The pain was real. Forgiveness does not mean saying it was okay.',
      durationSeconds: 14,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 90,
    },
    {
      type: 'narration',
      text: 'Forgiveness means choosing to release the hold that pain has on your heart. It is a decision you may need to make again and again, and that is okay. Each time, it loosens the grip a little more.',
      durationSeconds: 16,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 75,
    },
    {
      type: 'narration',
      text: 'Consider also: is there something you need to forgive yourself for? Sometimes the person we are hardest on is ourselves. God offers the same grace to you that he offers to everyone.',
      durationSeconds: 15,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 80,
    },
    {
      type: 'narration',
      text: 'Ephesians 4:32 says: "And be kind to one another, tender hearted, forgiving each other, just as God also in Christ forgave you." You are forgiven. Let that truth free you to forgive.',
      durationSeconds: 17,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 60,
    },
    {
      type: 'narration',
      text: 'Let us pray together: Lord, I am carrying hurt that I want to release. I may not feel ready to fully forgive, but I am willing to begin. Help me choose freedom over bitterness, one step at a time.',
      durationSeconds: 17,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 90,
    },
    {
      type: 'narration',
      text: 'Take a moment to sit with whatever is surfacing. There is no rush. God is patient with this process, and you can be patient with yourself.',
      durationSeconds: 12,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 70,
    },
    {
      type: 'narration',
      text: 'Thank you for your courage in this space. Forgiveness is a journey, not a single moment. Every step forward matters, and God walks each one with you.',
      durationSeconds: 13,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 45,
    },
    {
      type: 'narration',
      text: 'As you return to your day, be gentle with yourself. You have done something brave simply by showing up here.',
      durationSeconds: 10,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 30,
    },
  ],
}

// --- Session 7: Strength for Today (5 min / strength) ---
// Target: 300s. Narration: ~81s. Silence: ~219s.
const strengthForToday: GuidedPrayerSession = {
  id: 'strength-for-today',
  title: 'Strength for Today',
  description: "Draw on God's strength when you feel overwhelmed or weary.",
  theme: 'strength',
  durationMinutes: 5,
  icon: 'Shield',
  completionVerse: {
    reference: 'Isaiah 40:31',
    text: 'But those who wait for Yahweh will renew their strength. They will mount up with wings like eagles. They will run, and not be weary. They will walk, and not faint.',
  },
  script: [
    {
      type: 'narration',
      text: 'Some days ask more of us than we feel we have. If you are running low on strength today, you are in the right place.',
      durationSeconds: 12,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 20,
    },
    {
      type: 'narration',
      text: 'Ephesians 6:10-11 says: "Finally, be strong in the Lord and in the strength of his might. Put on the whole armor of God, that you may be able to stand against the wiles of the devil."',
      durationSeconds: 16,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 35,
    },
    {
      type: 'narration',
      text: 'Being strong in the Lord does not mean pretending we are not tired. It means drawing on a strength that is not our own — a strength that does not run out.',
      durationSeconds: 14,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 45,
    },
    {
      type: 'narration',
      text: 'What feels heaviest right now? Name it. Bring it before God and say: "I cannot carry this alone." Admitting our need is not weakness — it is the beginning of real strength.',
      durationSeconds: 15,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 55,
    },
    {
      type: 'narration',
      text: 'Let us pray: Lord, I am weary. But I trust that your strength is greater than my exhaustion. Renew me from the inside out. Give me what I need for the very next step.',
      durationSeconds: 15,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 40,
    },
    {
      type: 'narration',
      text: 'You do not need strength for the whole journey — just for today. And today, God is enough.',
      durationSeconds: 9,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 24,
    },
  ],
}

// --- Session 8: Healing Prayer (10 min / healing) ---
// Target: 600s. Narration: ~131s. Silence: ~469s.
const healingPrayer: GuidedPrayerSession = {
  id: 'healing-prayer',
  title: 'Healing Prayer',
  description: "Invite God's healing presence into the places that need restoration.",
  theme: 'healing',
  durationMinutes: 10,
  icon: 'HandHeart',
  completionVerse: {
    reference: 'Psalm 147:3',
    text: 'He heals the broken in heart, and binds up their wounds.',
  },
  script: [
    {
      type: 'narration',
      text: 'Welcome to this time of healing prayer. Whatever brings you here — physical pain, emotional wounds, or spiritual weariness — you are welcome to bring it all.',
      durationSeconds: 14,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 25,
    },
    {
      type: 'narration',
      text: 'Jeremiah 17:14 says: "Heal me, Yahweh, and I will be healed. Save me, and I will be saved; for you are my praise."',
      durationSeconds: 12,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 35,
    },
    {
      type: 'narration',
      text: 'Healing often begins with honesty. Where are you hurting? Allow yourself to name the pain — not to dwell on it, but to bring it into the light where God can meet it.',
      durationSeconds: 15,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 70,
    },
    {
      type: 'narration',
      text: 'God does not always heal on our timeline, but he is always at work. Even when we cannot see the progress, restoration is happening beneath the surface.',
      durationSeconds: 13,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 45,
    },
    {
      type: 'narration',
      text: 'Psalm 30:2 says: "Yahweh my God, I cried to you, and you healed me." Others have walked this road before you and found God faithful. You are not the first, and you will not be the last.',
      durationSeconds: 16,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 55,
    },
    {
      type: 'narration',
      text: "Now, imagine God's healing presence like warm light gently reaching the places that hurt most. You don't need to force anything. Simply receive.",
      durationSeconds: 13,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 70,
    },
    {
      type: 'narration',
      text: 'Let us pray: Lord, you know every wound I carry — the ones others can see and the ones hidden deep within. I invite your healing presence into each one. I trust your timing and your tenderness.',
      durationSeconds: 17,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 70,
    },
    {
      type: 'narration',
      text: 'Philippians 1:6 encourages us: "Being confident of this very thing, that he who began a good work in you will complete it until the day of Jesus Christ." Your healing story is still being written.',
      durationSeconds: 17,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 55,
    },
    {
      type: 'narration',
      text: 'As you go from this time, remember: healing is a process, not an event. Be patient with yourself, and trust that the One who began a good work in you will carry it to completion.',
      durationSeconds: 15,
    },
    {
      type: 'silence',
      text: '',
      durationSeconds: 38,
    },
  ],
}

export const GUIDED_PRAYER_SESSIONS: GuidedPrayerSession[] = [
  morningOffering,
  eveningSurrender,
  findingPeace,
  comfortInSorrow,
  gratitudePrayer,
  forgivenessRelease,
  strengthForToday,
  healingPrayer,
]
