import type {
  DailyVerse,
  DailySong,
  MockPrayer,
  ClassicPrayer,
  JournalPrompt,
  JournalReflection,
  GratitudeAffirmation,
  ACTSStep,
  ExamenStep,
} from '@/types/daily-experience'

// --- Verse of the Day (30 curated WEB verses) ---

const DAILY_VERSES: DailyVerse[] = [
  {
    id: 'verse-1',
    reference: 'Philippians 4:6-7',
    text: 'In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God. And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus.',
    theme: 'peace',
  },
  {
    id: 'verse-2',
    reference: 'Jeremiah 29:11',
    text: '"For I know the thoughts that I think toward you," says Yahweh, "thoughts of peace, and not of evil, to give you hope and a future."',
    theme: 'hope',
  },
  {
    id: 'verse-3',
    reference: 'Psalm 147:3',
    text: 'He heals the broken in heart, and binds up their wounds.',
    theme: 'healing',
  },
  {
    id: 'verse-4',
    reference: 'Matthew 11:28-30',
    text: '"Come to me, all you who labor and are heavily burdened, and I will give you rest. Take my yoke upon you and learn from me, for I am gentle and humble in heart; and you will find rest for your souls. For my yoke is easy, and my burden is light."',
    theme: 'anxiety',
  },
  {
    id: 'verse-5',
    reference: 'Psalm 107:1',
    text: 'Give thanks to Yahweh, for he is good, for his loving kindness endures forever.',
    theme: 'gratitude',
  },
  {
    id: 'verse-6',
    reference: 'Isaiah 40:31',
    text: 'But those who wait for Yahweh will renew their strength. They will mount up with wings like eagles. They will run, and not be weary. They will walk, and not faint.',
    theme: 'strength',
  },
  {
    id: 'verse-7',
    reference: 'Proverbs 3:5-6',
    text: 'Trust in Yahweh with all your heart, and don\'t lean on your own understanding. In all your ways acknowledge him, and he will make your paths straight.',
    theme: 'trust',
  },
  {
    id: 'verse-8',
    reference: 'Psalm 34:18',
    text: 'Yahweh is near to those who have a broken heart, and saves those who have a crushed spirit.',
    theme: 'grief',
  },
  {
    id: 'verse-9',
    reference: 'Nehemiah 8:10',
    text: 'Don\'t be grieved, for the joy of Yahweh is your strength.',
    theme: 'joy',
  },
  {
    id: 'verse-10',
    reference: 'Colossians 3:13',
    text: 'bearing with one another, and forgiving each other, if any man has a complaint against any; even as Christ forgave you, so you also do.',
    theme: 'forgiveness',
  },
  {
    id: 'verse-11',
    reference: 'Isaiah 26:3',
    text: 'You will keep whoever\'s mind is steadfast in perfect peace, because he trusts in you.',
    theme: 'peace',
  },
  {
    id: 'verse-12',
    reference: 'Romans 15:13',
    text: 'Now may the God of hope fill you with all joy and peace in believing, that you may abound in hope in the power of the Holy Spirit.',
    theme: 'hope',
  },
  {
    id: 'verse-13',
    reference: 'Isaiah 53:5',
    text: 'But he was pierced for our transgressions. He was crushed for our iniquities. The punishment that brought our peace was on him; and by his wounds we are healed.',
    theme: 'healing',
  },
  {
    id: 'verse-14',
    reference: '1 Peter 5:7',
    text: 'casting all your worries on him, because he cares for you.',
    theme: 'anxiety',
  },
  {
    id: 'verse-15',
    reference: '1 Thessalonians 5:18',
    text: 'In everything give thanks, for this is the will of God in Christ Jesus toward you.',
    theme: 'gratitude',
  },
  {
    id: 'verse-16',
    reference: 'Philippians 4:13',
    text: 'I can do all things through Christ, who strengthens me.',
    theme: 'strength',
  },
  {
    id: 'verse-17',
    reference: 'Psalm 56:3-4',
    text: 'When I am afraid, I will put my trust in you. In God, I praise his word. In God, I put my trust. I will not be afraid. What can flesh do to me?',
    theme: 'trust',
  },
  {
    id: 'verse-18',
    reference: 'Revelation 21:4',
    text: 'He will wipe away every tear from their eyes. Death will be no more; neither will there be mourning, nor crying, nor pain any more. The first things have passed away.',
    theme: 'grief',
  },
  {
    id: 'verse-19',
    reference: 'Psalm 16:11',
    text: 'You will show me the path of life. In your presence is fullness of joy. In your right hand there are pleasures forever more.',
    theme: 'joy',
  },
  {
    id: 'verse-20',
    reference: 'Ephesians 4:32',
    text: 'And be kind to one another, tender hearted, forgiving each other, just as God also in Christ forgave you.',
    theme: 'forgiveness',
  },
  {
    id: 'verse-21',
    reference: 'John 14:27',
    text: 'Peace I leave with you. My peace I give to you; not as the world gives, I give to you. Don\'t let your heart be troubled, neither let it be fearful.',
    theme: 'peace',
  },
  {
    id: 'verse-22',
    reference: 'Romans 8:28',
    text: 'We know that all things work together for good for those who love God, for those who are called according to his purpose.',
    theme: 'hope',
  },
  {
    id: 'verse-23',
    reference: 'James 5:15',
    text: 'And the prayer of faith will heal him who is sick, and the Lord will raise him up. If he has committed sins, he will be forgiven.',
    theme: 'healing',
  },
  {
    id: 'verse-24',
    reference: 'Psalm 94:19',
    text: 'In the multitude of my thoughts within me, your comforts delight my soul.',
    theme: 'anxiety',
  },
  {
    id: 'verse-25',
    reference: 'Psalm 100:4',
    text: 'Enter into his gates with thanksgiving, and into his courts with praise. Give thanks to him, and bless his name.',
    theme: 'gratitude',
  },
  {
    id: 'verse-26',
    reference: 'Deuteronomy 31:6',
    text: 'Be strong and courageous. Don\'t be afraid or scared of them, for Yahweh your God himself is who goes with you. He will not fail you nor forsake you.',
    theme: 'strength',
  },
  {
    id: 'verse-27',
    reference: 'Psalm 37:5',
    text: 'Commit your way to Yahweh. Trust also in him, and he will do this.',
    theme: 'trust',
  },
  {
    id: 'verse-28',
    reference: 'Psalm 73:26',
    text: 'My flesh and my heart fails, but God is the strength of my heart and my portion forever.',
    theme: 'grief',
  },
  {
    id: 'verse-29',
    reference: 'Romans 12:12',
    text: 'rejoicing in hope, enduring in troubles, continuing steadfastly in prayer.',
    theme: 'joy',
  },
  {
    id: 'verse-30',
    reference: 'Matthew 6:14',
    text: '"For if you forgive men their trespasses, your heavenly Father will also forgive you."',
    theme: 'forgiveness',
  },
]

// --- Song of the Day (30 entries using real Spotify track IDs from Worship Room playlist) ---

const DAILY_SONGS: DailySong[] = [
  { id: 'song-1', trackId: '6Up545NUflOiXo8cEraH49', title: 'You Say', artist: 'Lauren Daigle' },
  { id: 'song-2', trackId: '1pAkVoknb9Mlk7bYO2ZCJP', title: 'HAPPY', artist: 'Eric Champlin, Haylie Allcott' },
  { id: 'song-3', trackId: '0ksCs108qAX8CjZlPwk1HR', title: 'Psalm 148 (We Will Praise Him)', artist: 'Echo Worship' },
  { id: 'song-4', trackId: '61PIo9nn1kF5hhRoAAanEF', title: 'Hallelujah', artist: 'Kingdmusic' },
  { id: 'song-5', trackId: '5QakKmyOVutvYNI7odfCNe', title: 'Rains of Revival', artist: 'Mark & Sarah Tillman' },
  { id: 'song-6', trackId: '7nxst0QaP9Ub2cQfpafWIb', title: 'Worthy Of Victory', artist: 'Kai River, Echo Worship' },
  { id: 'song-7', trackId: '3DoNGda2Y0c9FPWuQxOpDD', title: "Can't Stop Smiling", artist: 'Covenant Collective' },
  { id: 'song-8', trackId: '2EkJDWoUXIZlZAr6pjV2nU', title: 'Stay', artist: 'Eric Champlin, Kiera Loveless' },
  { id: 'song-9', trackId: '5WrO4cvLQQ5IAZ8F97MiFH', title: 'All Glory to Jesus', artist: 'Echo Worship' },
  { id: 'song-10', trackId: '02uKSkfjffsSZC9fMovsxk', title: 'Grace Is Enough', artist: 'Freedom Nation, Kai River' },
  { id: 'song-11', trackId: '2VtQ4TnLxooGfv89IC3Qc3', title: 'GO!', artist: 'Remnant House' },
  { id: 'song-12', trackId: '6ZNeDf1HeT2a1RUw2QfH7b', title: 'You Keep Giving', artist: 'Covenant Collective' },
  { id: 'song-13', trackId: '3Jeom5InuBPkGA2bVI4eq2', title: 'All In', artist: 'Go Grace Worship' },
  { id: 'song-14', trackId: '6Gamz6wOxwEeCl5nP0vwF8', title: 'Where You Begin', artist: 'Eric Champlin, Mikayla Jackson' },
  { id: 'song-15', trackId: '7pKfPomDEeI4TPT6EOYjn9', title: 'Goodness of God', artist: 'Bethel Music, Jenn Johnson', verse: 'Psalm 23:6 — Surely goodness and loving kindness shall follow me all the days of my life.' },
  { id: 'song-16', trackId: '0pNizrRmvu5S16fH6ccm0v', title: 'Graves Into Gardens', artist: 'Elevation Worship, Brandon Lake', verse: 'Isaiah 61:3 — to give them a garland for ashes, the oil of joy for mourning.' },
  { id: 'song-17', trackId: '7vQbuQcyTflfCIOu3Uzzya', title: 'Holy Water', artist: 'We The Kingdom', verse: 'John 7:38 — He who believes in me, as the Scripture has said, from within him will flow rivers of living water.' },
  { id: 'song-18', trackId: '5E2v6b4Mo4jxuPrcK4YEIF', title: 'King of Kings', artist: 'Hillsong Worship', verse: 'Revelation 19:16 — He has on his garment and on his thigh a name written, "King of Kings and Lord of Lords."' },
  { id: 'song-19', trackId: '0jBu6T5GgOekdHuXA5hVQM', title: 'Who You Say I Am', artist: 'Hillsong Worship', verse: 'Galatians 3:26 — For you are all children of God, through faith in Christ Jesus.' },
  { id: 'song-20', trackId: '3BDpn2Vivr1BFhlGsYs5tp', title: 'Build My Life', artist: 'Housefires, Pat Barrett', verse: 'Matthew 7:24 — Everyone who hears these words of mine and does them, I will liken him to a wise man who built his house on a rock.' },
  { id: 'song-21', trackId: '3tN5QCwk2bWUsAB2L3jU8g', title: 'Way Maker', artist: 'Sinach', verse: 'Isaiah 43:19 — Behold, I will do a new thing. It springs out now. Don\'t you know it?' },
  { id: 'song-22', trackId: '0t63MSEFmHcfglXS6vDwqQ', title: 'What A Beautiful Name', artist: 'Hillsong Worship', verse: 'Philippians 2:9 — Therefore God also highly exalted him, and gave to him the name which is above every name.' },
  { id: 'song-23', trackId: '7EsFsmIzxbBcbm44ENymtK', title: 'Great Are You Lord', artist: 'All Sons & Daughters', verse: 'Psalm 145:3 — Great is Yahweh, and greatly to be praised. His greatness is unsearchable.' },
  { id: 'song-24', trackId: '35GACeX8Zl55jp29xFbvvo', title: 'Tremble', artist: 'Mosaic MSC', verse: 'Psalm 68:1 — Let God arise! Let his enemies be scattered!' },
  { id: 'song-25', trackId: '3Mgk2sMddMVdo8HTR21hT6', title: 'Do It Again', artist: 'Elevation Worship', verse: 'Lamentations 3:22-23 — It is because of the loving kindnesses of Yahweh that we are not consumed... They are new every morning.' },
  { id: 'song-26', trackId: '4LnHfZGEitmIVS17wndaUI', title: 'Raise A Hallelujah', artist: 'Bethel Music, Jonathan David Helser', verse: 'Psalm 149:6 — May the high praises of God be in their mouths.' },
  { id: 'song-27', trackId: '6nVm313QmsPlNllntTart1', title: 'Living Hope', artist: 'Phil Wickham', verse: '1 Peter 1:3 — who according to his great mercy caused us to be born again to a living hope through the resurrection of Jesus Christ from the dead.' },
  { id: 'song-28', trackId: '5PmHmU5AaBy9ld3bdQkD96', title: 'Another In The Fire', artist: 'Hillsong UNITED', verse: 'Daniel 3:25 — He answered, "Look, I see four men loose, walking in the middle of the fire, and they are not hurt."' },
  { id: 'song-29', trackId: '14afN25jVBf6gWuhmrpsej', title: 'Surrounded (Fight My Battles)', artist: 'UPPERROOM', verse: '2 Chronicles 20:22 — When they began to sing and to praise, Yahweh set ambushers against the children of Ammon.' },
  { id: 'song-30', trackId: '1goiRWxiG3GTlODrdDZ7NR', title: 'Jireh', artist: 'Maverick City Music, Elevation Worship', verse: 'Genesis 22:14 — Abraham called the name of that place "Yahweh Will Provide."' },
]

// --- Mock AI Prayers ---

const TOPIC_KEYWORDS: Record<string, string[]> = {
  anxiety: ['anxious', 'anxiety', 'worried', 'worry', 'stress', 'stressed', 'nervous', 'fear', 'afraid', 'panic', 'overwhelm'],
  gratitude: ['grateful', 'gratitude', 'thankful', 'thanks', 'blessed', 'blessing', 'appreciate'],
  healing: ['healing', 'heal', 'sick', 'illness', 'pain', 'hurt', 'health', 'disease', 'recovery', 'cancer'],
  guidance: ['guidance', 'guide', 'direction', 'decision', 'wisdom', 'confused', 'uncertain', 'path', 'unclear', 'lost'],
  grief: ['grief', 'grieving', 'loss', 'lost someone', 'death', 'died', 'miss', 'mourning', 'gone'],
  forgiveness: ['forgive', 'forgiveness', 'forgiving', 'resentment', 'bitter', 'anger', 'angry', 'grudge'],
  relationships: ['relationship', 'marriage', 'friend', 'family', 'partner', 'spouse', 'parent', 'child', 'conflict', 'lonely', 'loneliness'],
  strength: ['strength', 'strong', 'struggling', 'struggle', 'weak', 'weary', 'tired', 'exhausted', 'persevere', 'endure'],
}

const MOCK_PRAYERS: MockPrayer[] = [
  {
    id: 'prayer-anxiety',
    topic: 'anxiety',
    text: 'Dear God, I come to You carrying the weight of anxiety that feels too heavy for me to bear alone. You know every worry that races through my mind and every fear that grips my heart. I ask You to replace my anxious thoughts with Your perfect peace that surpasses all understanding. Help me to cast all my cares upon You, knowing that You care deeply for me. Remind me that You hold my future in Your hands and that nothing can separate me from Your love. Calm the storm within me and fill me with the confidence that comes from trusting in Your faithfulness. Amen.',
  },
  {
    id: 'prayer-gratitude',
    topic: 'gratitude',
    text: 'Dear God, my heart overflows with gratitude for the blessings You have poured into my life. Thank You for the gifts both seen and unseen, for the breath in my lungs and the love that surrounds me. Help me to never take for granted the beautiful ways You provide, protect, and guide me each day. Open my eyes to the small mercies I so often overlook. Let my life be a living expression of thanksgiving, and may my grateful heart be a testimony of Your goodness to everyone I meet. Fill me with a spirit of contentment and joy as I count my many blessings. Amen.',
  },
  {
    id: 'prayer-healing',
    topic: 'healing',
    text: 'Dear God, I bring before You the need for healing that weighs on my heart. You are the Great Physician, and I trust that nothing is beyond Your restorative power. Whether the wound is physical, emotional, or spiritual, I ask You to lay Your healing hand upon it. Give me patience as I walk through this season of recovery, and surround me with people who bring comfort and encouragement. Strengthen my faith when doubt creeps in, and remind me that You are working all things together for my good, even when I cannot see it. I place my hope and my health in Your capable hands. Amen.',
  },
  {
    id: 'prayer-guidance',
    topic: 'guidance',
    text: 'Dear God, I feel uncertain about the road ahead and I need Your wisdom to light the way. You promise that when I lack wisdom, I can ask You and You will give it generously. I ask for clarity to see the path You have prepared for me, and courage to follow it even when it leads somewhere unexpected. Quiet the noise of the world so I can hear Your still, small voice speaking truth into my life. Help me trust that even when I cannot see the whole picture, You are guiding each step with purpose and love. Lead me, Lord, and I will follow. Amen.',
  },
  {
    id: 'prayer-grief',
    topic: 'grief',
    text: 'Dear God, my heart is heavy with grief and the pain feels unbearable at times. You are close to the brokenhearted, and I need to feel Your presence now more than ever. I pour out my sorrow before You, knowing that You collect every tear and understand the depth of my loss. Please wrap me in Your comfort like a warm blanket on a cold night. Give me the strength to take one step at a time, one breath at a time. Remind me that this pain is not the end of the story, and that one day You will wipe away every tear. Until then, hold me close. Amen.',
  },
  {
    id: 'prayer-forgiveness',
    topic: 'forgiveness',
    text: 'Dear God, I am struggling to forgive, and I know that holding onto this pain is only hurting me. You have forgiven me so much, and I want to extend that same grace to others. But it is hard, Lord. Help me release the resentment and bitterness that have taken root in my heart. I do not want to carry this burden any longer. Give me the supernatural ability to forgive as You have forgiven me. Heal the wounds that make forgiveness feel impossible, and replace my anger with compassion and understanding. Set me free from the prison of unforgiveness. Amen.',
  },
  {
    id: 'prayer-relationships',
    topic: 'relationships',
    text: 'Dear God, I lift up my relationships before You, knowing that You designed us for connection and community. Where there is conflict, bring peace. Where there is distance, build bridges. Where there is misunderstanding, grant clarity and patience. Help me to love others as You love me — unconditionally and without keeping score. Give me wisdom to know when to speak and when to listen, when to hold on and when to let go. Surround me with people who draw me closer to You, and help me to be that person for someone else. Amen.',
  },
  {
    id: 'prayer-strength',
    topic: 'strength',
    text: 'Dear God, I feel depleted and I need Your strength to carry me through this difficult season. My own strength has run out, but I know that Yours never will. You promise that those who wait on You will renew their strength, and I am waiting on You now. Pour into me the energy, courage, and resilience I need to face each day. When I want to give up, remind me that You are fighting for me. When I feel weak, let Your power be made perfect in my weakness. I lean on You completely, trusting that You are more than enough. Amen.',
  },
  {
    id: 'prayer-general',
    topic: 'general',
    text: 'Dear God, I come before You with an open heart, bringing everything I am feeling to Your feet. You know me better than I know myself, and You understand what I need even when I cannot find the words to express it. Meet me right where I am in this moment. Fill me with Your peace, Your clarity, and Your love. Help me to slow down and listen for Your voice amidst the busyness and noise of daily life. Remind me that I am never alone, that You are always near, and that Your plans for me are good. I surrender this moment to You. Amen.',
  },
  {
    id: 'prayer-devotional',
    topic: 'devotional',
    text: 'Dear God, thank You for speaking to me through Your word today. As I reflect on what I have read, I am reminded that Your truth is living and active, always meeting me right where I am. Help me to carry the message of this passage into my day — not just as head knowledge, but as a reality that transforms how I think, speak, and love. Where I have been holding back from You, give me the courage to surrender. Where I have been striving in my own strength, teach me to rest in Yours. Let the seeds planted by today\'s reading take root deep in my heart and bear fruit that blesses those around me. I am grateful for this time in Your presence. Continue to shape me into the person You created me to be. Amen.',
  },
]

// --- Classic Prayers ---

const CLASSIC_PRAYERS: ClassicPrayer[] = [
  {
    id: 'classic-lords-prayer',
    title: "The Lord's Prayer",
    attribution: 'Matthew 6:9-13 (WEB)',
    text: 'Our Father in heaven, may your name be kept holy. Let your Kingdom come. Let your will be done on earth as it is in heaven. Give us today our daily bread. Forgive us our debts, as we also forgive our debtors. Bring us not into temptation, but deliver us from the evil one. For yours is the Kingdom, the power, and the glory forever. Amen.',
  },
  {
    id: 'classic-serenity',
    title: 'Serenity Prayer',
    attribution: 'Reinhold Niebuhr',
    text: 'God, grant me the serenity to accept the things I cannot change, the courage to change the things I can, and the wisdom to know the difference. Living one day at a time, enjoying one moment at a time, accepting hardship as a pathway to peace. Taking, as Jesus did, this sinful world as it is, not as I would have it. Trusting that You will make all things right if I surrender to Your will, so that I may be reasonably happy in this life, and supremely happy with You forever in the next. Amen.',
  },
  {
    id: 'classic-st-francis',
    title: 'Prayer of St. Francis',
    attribution: 'Attributed to St. Francis of Assisi',
    text: 'Lord, make me an instrument of your peace. Where there is hatred, let me sow love; where there is injury, pardon; where there is doubt, faith; where there is despair, hope; where there is darkness, light; where there is sadness, joy. O Divine Master, grant that I may not so much seek to be consoled as to console, to be understood as to understand, to be loved as to love. For it is in giving that we receive, it is in pardoning that we are pardoned, and it is in dying that we are born to eternal life. Amen.',
  },
  {
    id: 'classic-psalm-23',
    title: 'Psalm 23',
    attribution: 'Psalm 23 (WEB)',
    text: 'Yahweh is my shepherd; I shall lack nothing. He makes me lie down in green pastures. He leads me beside still waters. He restores my soul. He guides me in the paths of righteousness for his name\'s sake. Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me. Your rod and your staff, they comfort me. You prepare a table before me in the presence of my enemies. You anoint my head with oil. My cup runs over. Surely goodness and loving kindness shall follow me all the days of my life, and I will dwell in Yahweh\'s house forever.',
  },
  {
    id: 'classic-st-patrick',
    title: "Prayer for Peace (St. Patrick's Breastplate)",
    attribution: "Adapted from St. Patrick's Breastplate",
    text: 'Christ be with me, Christ within me, Christ behind me, Christ before me, Christ beside me, Christ to win me, Christ to comfort and restore me. Christ beneath me, Christ above me, Christ in quiet, Christ in danger, Christ in hearts of all that love me, Christ in mouth of friend and stranger. I bind unto myself today the strong name of the Trinity, by invocation of the same, the Three in One and One in Three. Amen.',
  },
  {
    id: 'classic-healing',
    title: 'A Prayer for Healing',
    attribution: 'Traditional',
    text: 'Almighty God, you are the only source of health and healing. In you there is calm, and the only true peace in the universe. Grant to each one of us your children an awareness of your presence, and give us perfect confidence in you. In all pain and weariness and anxiety, teach us to yield ourselves to your never-failing care, knowing that your love and power surround us, trusting in your wisdom and providence to give us health and strength and peace. Amen.',
  },
]

// --- Journal Prompts ---

const JOURNAL_PROMPTS: JournalPrompt[] = [
  { id: 'prompt-1', theme: 'gratitude', text: 'What are three things God has blessed you with recently that you might be taking for granted?' },
  { id: 'prompt-2', theme: 'anxiety', text: 'What worry is taking up the most space in your mind right now? Write it out and offer it to God.' },
  { id: 'prompt-3', theme: 'healing', text: 'Is there a wound from your past that still needs healing? Describe it honestly and ask God to begin mending it.' },
  { id: 'prompt-4', theme: 'relationships', text: 'Think of someone who has impacted your faith. What would you want to say to them today?' },
  { id: 'prompt-5', theme: 'forgiveness', text: 'Is there someone you need to forgive? Write about what happened and what it would take to let go.' },
  { id: 'prompt-6', theme: 'hope', text: 'Where do you see God working in your life right now, even if it feels slow or uncertain?' },
  { id: 'prompt-7', theme: 'identity', text: 'How does God see you, and how is that different from how you see yourself?' },
  { id: 'prompt-8', theme: 'purpose', text: 'What do you believe God is calling you to do in this season of your life?' },
  { id: 'prompt-9', theme: 'grief', text: 'What loss or change are you still processing? Let yourself feel it fully and write about what it means to you.' },
  { id: 'prompt-10', theme: 'peace', text: 'When was the last time you felt truly at peace? What was different about that moment?' },
  { id: 'prompt-11', theme: 'trust', text: 'What is one area of your life where you are struggling to trust God? What would it look like to surrender it?' },
  { id: 'prompt-12', theme: 'patience', text: 'What are you waiting for from God right now? How does the waiting make you feel?' },
  { id: 'prompt-13', theme: 'joy', text: 'Describe a moment this week when you experienced unexpected joy. What made it special?' },
  { id: 'prompt-14', theme: 'strength', text: 'Write about a time when you felt weak but God carried you through. What did you learn about His strength?' },
  { id: 'prompt-15', theme: 'surrender', text: 'What part of your life are you holding onto too tightly? What would it feel like to open your hands and let God have it?' },
  { id: 'prompt-16', theme: 'gratitude', text: 'Write a letter of thanks to God. Tell Him everything you appreciate, big and small.' },
  { id: 'prompt-17', theme: 'anxiety', text: 'Imagine placing each of your worries into God\'s hands, one by one. Write them out and then write "I trust You" after each one.' },
  { id: 'prompt-18', theme: 'hope', text: 'If you could ask God one question about your future, what would it be? Write about why that question matters to you.' },
]

// --- Journal Reflections (mock AI encouragement) ---

const JOURNAL_REFLECTIONS: JournalReflection[] = [
  { id: 'reflect-1', text: 'Thank you for being so honest with your words. God sees every part of your heart, and He treasures your willingness to come to Him with openness. Keep writing — this is a beautiful act of faith.' },
  { id: 'reflect-2', text: 'What you shared here takes real courage. Remember that God is not surprised by anything you are feeling. He is with you in every word, every tear, and every hope.' },
  { id: 'reflect-3', text: 'Your vulnerability is a strength, not a weakness. As you process these thoughts on paper, know that God is already working in the spaces between your words.' },
  { id: 'reflect-4', text: 'This is such a meaningful reflection. The fact that you are taking time to sit with God and pour out your heart shows a depth of faith that is truly inspiring. You are growing.' },
  { id: 'reflect-5', text: 'Every word you write is a prayer in itself. God hears you, He sees you, and He is holding you close right now. Trust that He is using this time to draw you nearer to Him.' },
  { id: 'reflect-6', text: 'What a beautiful and honest entry. It is okay to not have all the answers. God invites you to bring your questions, your doubts, and your raw emotions to Him.' },
  { id: 'reflect-7', text: 'You are doing something powerful by putting these thoughts into words. Journaling creates space for God to speak. Keep listening — He has so much more to say to you.' },
  { id: 'reflect-8', text: 'Your honesty here is a gift to yourself and to God. He does not need you to have it all figured out. He just wants you to show up, exactly as you are. And you did.' },
]

// --- Breathing Exercise Verses (20 calming/peace-focused WEB) ---

const BREATHING_VERSES: DailyVerse[] = [
  { id: 'breath-1', reference: 'Psalm 46:10', text: '"Be still, and know that I am God."', theme: 'peace' },
  { id: 'breath-2', reference: 'Psalm 23:2-3', text: 'He makes me lie down in green pastures. He leads me beside still waters. He restores my soul.', theme: 'rest' },
  { id: 'breath-3', reference: 'Isaiah 26:3', text: 'You will keep whoever\'s mind is steadfast in perfect peace, because he trusts in you.', theme: 'peace' },
  { id: 'breath-4', reference: 'Matthew 11:28', text: '"Come to me, all you who labor and are heavily burdened, and I will give you rest."', theme: 'rest' },
  { id: 'breath-5', reference: 'Psalm 4:8', text: 'In peace I will both lay myself down and sleep, for you alone, Yahweh, make me live in safety.', theme: 'peace' },
  { id: 'breath-6', reference: 'John 14:27', text: 'Peace I leave with you. My peace I give to you; not as the world gives, I give to you.', theme: 'peace' },
  { id: 'breath-7', reference: 'Psalm 62:1', text: 'My soul rests in God alone. My salvation is from him.', theme: 'rest' },
  { id: 'breath-8', reference: 'Isaiah 41:10', text: "Don't you be afraid, for I am with you. Don't be dismayed, for I am your God. I will strengthen you. Yes, I will help you.", theme: 'comfort' },
  { id: 'breath-9', reference: 'Psalm 91:1-2', text: 'He who dwells in the secret place of the Most High will rest in the shadow of the Almighty. I will say of Yahweh, "He is my refuge and my fortress; my God, in whom I trust."', theme: 'trust' },
  { id: 'breath-10', reference: 'Psalm 119:165', text: 'Those who love your law have great peace. Nothing causes them to stumble.', theme: 'peace' },
  { id: 'breath-11', reference: 'Philippians 4:7', text: 'And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus.', theme: 'peace' },
  { id: 'breath-12', reference: 'Psalm 55:22', text: 'Cast your burden on Yahweh and he will sustain you. He will never allow the righteous to be moved.', theme: 'trust' },
  { id: 'breath-13', reference: 'Numbers 6:24-26', text: '"Yahweh bless you, and keep you. Yahweh make his face to shine on you, and be gracious to you. Yahweh lift up his face toward you, and give you peace."', theme: 'peace' },
  { id: 'breath-14', reference: 'Psalm 27:1', text: 'Yahweh is my light and my salvation. Whom shall I fear? Yahweh is the strength of my life. Of whom shall I be afraid?', theme: 'comfort' },
  { id: 'breath-15', reference: 'Isaiah 40:31', text: 'But those who wait for Yahweh will renew their strength. They will mount up with wings like eagles.', theme: 'rest' },
  { id: 'breath-16', reference: 'Psalm 46:1', text: 'God is our refuge and strength, a very present help in trouble.', theme: 'comfort' },
  { id: 'breath-17', reference: 'Psalm 29:11', text: 'Yahweh will give strength to his people. Yahweh will bless his people with peace.', theme: 'peace' },
  { id: 'breath-18', reference: 'Romans 8:26', text: 'In the same way, the Spirit also helps our weaknesses, for we don\'t know how to pray as we ought. But the Spirit himself makes intercession for us with groanings which can\'t be uttered.', theme: 'comfort' },
  { id: 'breath-19', reference: 'Psalm 131:2', text: 'Surely I have stilled and quieted my soul, like a weaned child with his mother, like a weaned child is my soul within me.', theme: 'rest' },
  { id: 'breath-20', reference: 'Exodus 14:14', text: 'Yahweh will fight for you, and you shall be still.', theme: 'peace' },
]

// --- Scripture Soaking Verses (20 deeper/reflective WEB, separate pool) ---

const SOAKING_VERSES: DailyVerse[] = [
  { id: 'soak-1', reference: 'Psalm 139:13-14', text: 'For you formed my inmost being. You knit me together in my mother\'s womb. I will give thanks to you, for I am fearfully and wonderfully made. Your works are wonderful. My soul knows that very well.', theme: 'identity' },
  { id: 'soak-2', reference: '1 John 3:1', text: 'See how great a love the Father has given to us, that we should be called children of God! For this cause the world doesn\'t know us, because it didn\'t know him.', theme: 'love' },
  { id: 'soak-3', reference: 'Jeremiah 29:11', text: '"For I know the thoughts that I think toward you," says Yahweh, "thoughts of peace, and not of evil, to give you hope and a future."', theme: 'purpose' },
  { id: 'soak-4', reference: 'Romans 8:38-39', text: 'For I am persuaded that neither death, nor life, nor angels, nor principalities, nor things present, nor things to come, nor powers, nor height, nor depth, nor any other created thing will be able to separate us from God\'s love which is in Christ Jesus our Lord.', theme: 'love' },
  { id: 'soak-5', reference: 'Ephesians 2:10', text: 'For we are his workmanship, created in Christ Jesus for good works, which God prepared before that we would walk in them.', theme: 'purpose' },
  { id: 'soak-6', reference: 'Zephaniah 3:17', text: 'Yahweh your God is among you, a mighty one who will save. He will rejoice over you with joy. He will calm you in his love. He will rejoice over you with singing.', theme: 'love' },
  { id: 'soak-7', reference: 'Isaiah 43:1', text: 'But now Yahweh who created you, Jacob, and he who formed you, Israel, says: "Don\'t be afraid, for I have redeemed you. I have called you by your name. You are mine."', theme: 'identity' },
  { id: 'soak-8', reference: 'Lamentations 3:22-23', text: "It is because of Yahweh's loving kindnesses that we are not consumed, because his compassion doesn't fail. They are new every morning. Great is your faithfulness.", theme: 'faithfulness' },
  { id: 'soak-9', reference: '2 Corinthians 5:17', text: 'Therefore if anyone is in Christ, he is a new creation. The old things have passed away. Behold, all things have become new.', theme: 'identity' },
  { id: 'soak-10', reference: 'Psalm 139:7-10', text: 'Where could I go from your Spirit? Or where could I flee from your presence? If I ascend up into heaven, you are there. If I make my bed in Sheol, behold, you are there! If I take the wings of the dawn, and settle in the uttermost parts of the sea, even there your hand will lead me, and your right hand will hold me.', theme: 'faithfulness' },
  { id: 'soak-11', reference: 'Isaiah 40:28-29', text: "Haven't you known? Haven't you heard? The everlasting God, Yahweh, the Creator of the ends of the earth, doesn't faint. He isn't weary. His understanding is unsearchable. He gives power to the weak. He increases the strength of him who has no might.", theme: 'strength' },
  { id: 'soak-12', reference: 'Psalm 103:11-12', text: "For as the heavens are high above the earth, so great is his loving kindness toward those who fear him. As far as the east is from the west, so far has he removed our transgressions from us.", theme: 'love' },
  { id: 'soak-13', reference: 'Ephesians 3:17-19', text: 'that Christ may dwell in your hearts through faith, to the end that you, being rooted and grounded in love, may be strengthened to comprehend with all the saints what is the width and length and height and depth, and to know Christ\'s love which surpasses knowledge, that you may be filled with all the fullness of God.', theme: 'love' },
  { id: 'soak-14', reference: 'Romans 8:28', text: 'We know that all things work together for good for those who love God, for those who are called according to his purpose.', theme: 'hope' },
  { id: 'soak-15', reference: 'Psalm 121:1-2', text: 'I will lift up my eyes to the hills. Where does my help come from? My help comes from Yahweh, who made heaven and earth.', theme: 'strength' },
  { id: 'soak-16', reference: 'Galatians 2:20', text: 'I have been crucified with Christ, and it is no longer I who live, but Christ lives in me. That life which I now live in the flesh, I live by faith in the Son of God, who loved me and gave himself up for me.', theme: 'identity' },
  { id: 'soak-17', reference: 'Psalm 19:14', text: 'Let the words of my mouth and the meditation of my heart be acceptable in your sight, Yahweh, my rock, and my redeemer.', theme: 'purpose' },
  { id: 'soak-18', reference: 'Deuteronomy 7:9', text: 'Know therefore that Yahweh your God himself is God, the faithful God, who keeps covenant and loving kindness to a thousand generations with those who love him and keep his commandments.', theme: 'faithfulness' },
  { id: 'soak-19', reference: 'Isaiah 49:15-16', text: '"Can a woman forget her nursing child, that she should not have compassion on the son of her womb? Yes, these may forget, yet I will not forget you! Behold, I have engraved you on the palms of my hands."', theme: 'love' },
  { id: 'soak-20', reference: 'Joshua 1:9', text: "Haven't I commanded you? Be strong and courageous. Don't be afraid. Don't be dismayed, for Yahweh your God is with you wherever you go.", theme: 'strength' },
]

// --- Gratitude Content ---

const GRATITUDE_AFFIRMATIONS: GratitudeAffirmation[] = [
  { template: 'You named {n} things you\'re grateful for today. What a beautiful heart.' },
  { template: 'You found {n} reasons to give thanks. God sees every single one.' },
  { template: '{n} blessings counted today. Gratitude is a powerful form of worship.' },
  { template: 'You listed {n} things you\'re thankful for. Your heart is pointing in a beautiful direction.' },
]

const GRATITUDE_VERSES: DailyVerse[] = [
  { id: 'grat-1', reference: 'Psalm 107:1', text: 'Give thanks to Yahweh, for he is good, for his loving kindness endures forever.', theme: 'gratitude' },
  { id: 'grat-2', reference: '1 Thessalonians 5:18', text: 'In everything give thanks, for this is the will of God in Christ Jesus toward you.', theme: 'gratitude' },
  { id: 'grat-3', reference: 'Colossians 3:15', text: 'And let the peace of God rule in your hearts, to which also you were called in one body, and be thankful.', theme: 'gratitude' },
  { id: 'grat-4', reference: 'Psalm 136:1', text: 'Give thanks to Yahweh, for he is good; for his loving kindness endures forever.', theme: 'gratitude' },
]

// --- ACTS Prayer Walk Steps ---

const ACTS_STEPS: ACTSStep[] = [
  {
    id: 'acts-adoration',
    title: 'Adoration',
    prompt: 'Begin by praising God for who He is. Think about His character \u2014 His love, faithfulness, power, mercy. What about God fills you with awe?',
    verse: { id: 'acts-v1', reference: 'Psalm 145:3', text: 'Great is Yahweh, and greatly to be praised! His greatness is unsearchable.', theme: 'adoration' },
  },
  {
    id: 'acts-confession',
    title: 'Confession',
    prompt: 'Take a moment to honestly bring before God anything weighing on your conscience. He already knows \u2014 this is about releasing it. What do you need to lay down?',
    verse: { id: 'acts-v2', reference: '1 John 1:9', text: 'If we confess our sins, he is faithful and righteous to forgive us the sins and to cleanse us from all unrighteousness.', theme: 'confession' },
  },
  {
    id: 'acts-thanksgiving',
    title: 'Thanksgiving',
    prompt: 'Shift your heart to gratitude. What has God done for you recently? What blessings \u2014 big or small \u2014 can you thank Him for?',
    verse: { id: 'acts-v3', reference: 'Psalm 100:4', text: 'Enter into his gates with thanksgiving, and into his courts with praise. Give thanks to him, and bless his name.', theme: 'thanksgiving' },
  },
  {
    id: 'acts-supplication',
    title: 'Supplication',
    prompt: 'Now bring your requests to God. What do you need? What are you hoping for? Who in your life needs prayer right now?',
    verse: { id: 'acts-v4', reference: 'Philippians 4:6', text: 'In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God.', theme: 'supplication' },
  },
]

// --- Examen Steps ---

const EXAMEN_STEPS: ExamenStep[] = [
  { id: 'examen-gratitude', title: 'Gratitude', prompt: 'Begin by thanking God for the gifts of this day. What moments \u2014 however small \u2014 brought you joy or peace?' },
  { id: 'examen-review', title: 'Review', prompt: 'Walk through your day slowly, from morning to now. What stands out? What moments felt significant?' },
  { id: 'examen-emotions', title: 'Emotions', prompt: 'As you review your day, what emotions surface? Where did you feel joy, frustration, peace, anxiety, love, or sadness?' },
  { id: 'examen-focus', title: 'Focus', prompt: 'Choose one moment from your day that stands out most. Sit with it. What is God showing you through this moment?' },
  { id: 'examen-forward', title: 'Look Forward', prompt: 'As you look toward tomorrow, what are you hoping for? What do you need from God? Offer tomorrow to Him.' },
]

// --- Getter Functions ---

export function getVerseOfTheDay(dayOfMonth: number): DailyVerse {
  return DAILY_VERSES[dayOfMonth % DAILY_VERSES.length]
}

export function getVerseById(id: string): DailyVerse | undefined {
  return DAILY_VERSES.find((v) => v.id === id)
}

export function getSongOfTheDay(dayOfMonth: number): DailySong {
  // Independent rotation from verse: multiply by 7 for different offset
  return DAILY_SONGS[(dayOfMonth * 7) % DAILY_SONGS.length]
}

export function getBreathingVerses(): DailyVerse[] {
  return BREATHING_VERSES
}

export function getSoakingVerses(): DailyVerse[] {
  return SOAKING_VERSES
}

export function getMockPrayer(userInput: string): MockPrayer {
  const lower = userInput.toLowerCase()

  // Check for devotional context first
  const devotionalKeywords = ["today's devotional", 'devotional about', "what i've read", 'devotional on']
  if (devotionalKeywords.some((kw) => lower.includes(kw))) {
    return MOCK_PRAYERS.find((p) => p.topic === 'devotional') ?? MOCK_PRAYERS[MOCK_PRAYERS.length - 1]
  }

  for (const prayer of MOCK_PRAYERS) {
    const keywords = TOPIC_KEYWORDS[prayer.topic]
    if (keywords && keywords.some((kw) => lower.includes(kw))) {
      return prayer
    }
  }
  // Fallback to general prayer
  return MOCK_PRAYERS.find((p) => p.topic === 'general') ?? MOCK_PRAYERS[0]
}

export function getClassicPrayers(): ClassicPrayer[] {
  return CLASSIC_PRAYERS
}

export function getJournalPrompts(): JournalPrompt[] {
  return JOURNAL_PROMPTS
}

export function getJournalReflection(): JournalReflection {
  return JOURNAL_REFLECTIONS[Math.floor(Math.random() * JOURNAL_REFLECTIONS.length)]
}

export function getGratitudeAffirmation(count: number): string {
  const affirmation =
    GRATITUDE_AFFIRMATIONS[count % GRATITUDE_AFFIRMATIONS.length]
  return affirmation.template.replace('{n}', String(count))
}

export function getGratitudeVerses(): DailyVerse[] {
  return GRATITUDE_VERSES
}

export function getACTSSteps(): ACTSStep[] {
  return ACTS_STEPS
}

export function getExamenSteps(): ExamenStep[] {
  return EXAMEN_STEPS
}
