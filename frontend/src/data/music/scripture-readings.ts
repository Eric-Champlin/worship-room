import type { ScriptureReading, ScriptureCollection } from '@/types/music'

// =============================================================================
// Psalms of Peace Collection
// =============================================================================

const PSALMS_OF_PEACE: ScriptureReading[] = [
  {
    id: 'psalm-23',
    title: 'The Lord is My Shepherd',
    scriptureReference: 'Psalm 23',
    collectionId: 'psalms-of-peace',
    webText:
      '¹ Yahweh is my shepherd:\nI shall lack nothing.\n² He makes me lie down in green pastures.\nHe leads me beside still waters.\n³ He restores my soul.\nHe guides me in the paths of righteousness for his name\'s sake.\n⁴ Even though I walk through the valley of the shadow of death,\nI will fear no evil, for you are with me.\nYour rod and your staff,\nthey comfort me.\n⁵ You prepare a table before me\nin the presence of my enemies.\nYou anoint my head with oil.\nMy cup runs over.\n⁶ Surely goodness and loving kindness shall follow me all the days of my life,\nand I will dwell in Yahweh\'s house forever.',
    audioFilename: 'scripture/psalm-23.mp3',
    durationSeconds: 300,
    voiceId: 'male',
    tags: ['peace', 'psalms', 'rest', 'comfort'],
  },
  {
    id: 'psalm-46',
    title: 'God is Our Refuge',
    scriptureReference: 'Psalm 46',
    collectionId: 'psalms-of-peace',
    webText:
      '¹ God is our refuge and strength,\na very present help in trouble.\n² Therefore we won\'t be afraid, though the earth changes,\nthough the mountains are shaken into the heart of the seas;\n³ though its waters roar and are troubled,\nthough the mountains tremble with their swelling.\nSelah.\n⁴ There is a river, the streams of which make the city of God glad,\nthe holy place of the tabernacles of the Most High.\n⁵ God is within her. She shall not be moved.\nGod will help her at dawn.\n⁶ The nations raged. The kingdoms were moved.\nHe lifted his voice and the earth melted.\n⁷ Yahweh of Armies is with us.\nThe God of Jacob is our refuge.\nSelah.\n⁸ Come, see Yahweh\'s works,\nwhat desolations he has made in the earth.\n⁹ He makes wars cease to the end of the earth.\nHe breaks the bow, and cuts the spear apart.\nHe burns the chariots in the fire.\n¹⁰ "Be still, and know that I am God.\nI will be exalted among the nations.\nI will be exalted in the earth."\n¹¹ Yahweh of Armies is with us.\nThe God of Jacob is our refuge.\nSelah.',
    audioFilename: 'scripture/psalm-46.mp3',
    durationSeconds: 360,
    voiceId: 'female',
    tags: ['peace', 'psalms', 'refuge', 'strength'],
  },
  {
    id: 'psalm-91',
    title: 'He Who Dwells in Shelter',
    scriptureReference: 'Psalm 91',
    collectionId: 'psalms-of-peace',
    webText:
      '¹ He who dwells in the secret place of the Most High\nwill rest in the shadow of the Almighty.\n² I will say of Yahweh, "He is my refuge and my fortress;\nmy God, in whom I trust."\n³ For he will deliver you from the snare of the fowler,\nand from the deadly pestilence.\n⁴ He will cover you with his feathers.\nUnder his wings you will take refuge.\nHis faithfulness is your shield and rampart.\n⁵ You shall not be afraid of the terror by night,\nnor of the arrow that flies by day,\n⁶ nor of the pestilence that walks in darkness,\nnor of the destruction that wastes at noonday.\n⁷ A thousand may fall at your side,\nand ten thousand at your right hand;\nbut it will not come near you.\n⁸ You will only look with your eyes,\nand see the recompense of the wicked.\n⁹ Because you have made Yahweh your refuge,\nand the Most High your dwelling place,\n¹⁰ no evil shall happen to you,\nneither shall any plague come near your dwelling.\n¹¹ For he will put his angels in charge of you,\nto guard you in all your ways.\n¹² They will bear you up in their hands,\nso that you won\'t dash your foot against a stone.\n¹³ You will tread on the lion and cobra.\nYou will trample the young lion and the serpent underfoot.\n¹⁴ "Because he has set his love on me, therefore I will deliver him.\nI will set him on high, because he has known my name.\n¹⁵ He will call on me, and I will answer him.\nI will be with him in trouble.\nI will deliver him, and honor him.\n¹⁶ I will satisfy him with long life,\nand show him my salvation."',
    audioFilename: 'scripture/psalm-91.mp3',
    durationSeconds: 480,
    voiceId: 'male',
    tags: ['peace', 'psalms', 'protection', 'shelter'],
  },
  {
    id: 'psalm-121',
    title: 'I Lift My Eyes to the Hills',
    scriptureReference: 'Psalm 121',
    collectionId: 'psalms-of-peace',
    webText:
      '¹ I will lift up my eyes to the hills.\nWhere does my help come from?\n² My help comes from Yahweh,\nwho made heaven and earth.\n³ He will not allow your foot to be moved.\nHe who keeps you will not slumber.\n⁴ Behold, he who keeps Israel\nwill neither slumber nor sleep.\n⁵ Yahweh is your keeper.\nYahweh is your shade on your right hand.\n⁶ The sun will not harm you by day,\nnor the moon by night.\n⁷ Yahweh will keep you from all evil.\nHe will keep your soul.\n⁸ Yahweh will keep your going out and your coming in,\nfrom this time forward, and forever more.',
    audioFilename: 'scripture/psalm-121.mp3',
    durationSeconds: 240,
    voiceId: 'female',
    tags: ['peace', 'psalms', 'help', 'protection'],
  },
  {
    id: 'psalm-137-1-6',
    title: 'By the Rivers of Babylon',
    scriptureReference: 'Psalm 137:1-6',
    collectionId: 'psalms-of-peace',
    webText:
      '¹ By the rivers of Babylon, there we sat down.\nYes, we wept, when we remembered Zion.\n² On the willows in that land,\nwe hung up our harps.\n³ For there, those who led us captive asked us for songs.\nThose who tormented us demanded songs of joy:\n"Sing us one of the songs of Zion!"\n⁴ How can we sing Yahweh\'s song in a foreign land?\n⁵ If I forget you, Jerusalem,\nlet my right hand forget its skill.\n⁶ If I don\'t remember you,\nlet my tongue stick to the roof of my mouth;\nif I don\'t prefer Jerusalem\nabove my chief joy.',
    audioFilename: 'scripture/psalm-137-1-6.mp3',
    durationSeconds: 240,
    voiceId: 'male',
    tags: ['peace', 'psalms', 'remembrance', 'longing'],
  },
  {
    id: 'psalm-27-1-6',
    title: 'The Lord is My Light',
    scriptureReference: 'Psalm 27:1-6',
    collectionId: 'psalms-of-peace',
    webText:
      '¹ Yahweh is my light and my salvation.\nWhom shall I fear?\nYahweh is the strength of my life.\nOf whom shall I be afraid?\n² When evildoers came at me to eat up my flesh,\neven my adversaries and my foes, they stumbled and fell.\n³ Though an army should encamp against me,\nmy heart shall not fear.\nThough war should rise against me,\neven then I will be confident.\n⁴ One thing I have asked of Yahweh, that I will seek after:\nthat I may dwell in Yahweh\'s house all the days of my life,\nto see Yahweh\'s beauty,\nand to inquire in his temple.\n⁵ For in the day of trouble, he will keep me secretly in his pavilion.\nIn the secret place of his tabernacle, he will hide me.\nHe will lift me up on a rock.\n⁶ Now my head will be lifted up above my enemies around me.\nI will offer sacrifices of joy in his tent.\nI will sing, yes, I will sing praises to Yahweh.',
    audioFilename: 'scripture/psalm-27-1-6.mp3',
    durationSeconds: 300,
    voiceId: 'female',
    tags: ['peace', 'psalms', 'light', 'courage'],
  },
]

// =============================================================================
// Comfort & Rest Collection
// =============================================================================

const COMFORT_AND_REST: ScriptureReading[] = [
  {
    id: 'matthew-11-28-30',
    title: 'Come to Me, All Who Are Weary',
    scriptureReference: 'Matthew 11:28-30',
    collectionId: 'comfort-and-rest',
    webText:
      '²⁸ "Come to me, all you who labor and are heavily burdened, and I will give you rest.\n²⁹ Take my yoke upon you and learn from me, for I am gentle and humble in heart; and you will find rest for your souls.\n³⁰ For my yoke is easy, and my burden is light."',
    audioFilename: 'scripture/matthew-11-28-30.mp3',
    durationSeconds: 180,
    voiceId: 'male',
    tags: ['comfort', 'rest', 'weariness', 'peace'],
  },
  {
    id: 'philippians-4-6-8',
    title: 'Do Not Be Anxious',
    scriptureReference: 'Philippians 4:6-8',
    collectionId: 'comfort-and-rest',
    webText:
      '⁶ In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God.\n⁷ And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus.\n⁸ Finally, brothers, whatever things are true, whatever things are honorable, whatever things are just, whatever things are pure, whatever things are lovely, whatever things are of good report: if there is any virtue and if there is anything worthy of praise, think about these things.',
    audioFilename: 'scripture/philippians-4-6-8.mp3',
    durationSeconds: 240,
    voiceId: 'female',
    tags: ['comfort', 'rest', 'anxiety', 'peace', 'prayer'],
  },
  {
    id: 'isaiah-40-28-31',
    title: 'Those Who Wait on the Lord',
    scriptureReference: 'Isaiah 40:28-31',
    collectionId: 'comfort-and-rest',
    webText:
      '²⁸ Haven\'t you known? Haven\'t you heard? The everlasting God, Yahweh, the Creator of the ends of the earth, doesn\'t faint. He isn\'t weary. His understanding is unsearchable.\n²⁹ He gives power to the weak. He increases the strength of him who has no might.\n³⁰ Even the youths faint and get weary, and the young men utterly fall;\n³¹ but those who wait for Yahweh will renew their strength. They will mount up with wings like eagles. They will run, and not be weary. They will walk, and not faint.',
    audioFilename: 'scripture/isaiah-40-28-31.mp3',
    durationSeconds: 300,
    voiceId: 'male',
    tags: ['comfort', 'rest', 'strength', 'waiting', 'renewal'],
  },
  {
    id: 'john-14-25-27',
    title: 'Peace I Leave With You',
    scriptureReference: 'John 14:25-27',
    collectionId: 'comfort-and-rest',
    webText:
      '²⁵ "I have said these things to you while still living with you.\n²⁶ But the Counselor, the Holy Spirit, whom the Father will send in my name, will teach you all things, and will remind you of all that I said to you.\n²⁷ Peace I leave with you. My peace I give to you; not as the world gives, I give to you. Don\'t let your heart be troubled, neither let it be fearful."',
    audioFilename: 'scripture/john-14-25-27.mp3',
    durationSeconds: 180,
    voiceId: 'female',
    tags: ['comfort', 'rest', 'peace', 'holy-spirit'],
  },
  {
    id: 'psalm-55-22-1peter-5-7',
    title: 'Cast Your Burden on the Lord',
    scriptureReference: 'Psalm 55:22 + 1 Peter 5:7',
    collectionId: 'comfort-and-rest',
    webText:
      'Psalm 55:22\n²² Cast your burden on Yahweh and he will sustain you.\nHe will never allow the righteous to be moved.\n\n1 Peter 5:7\n⁷ casting all your worries on him, because he cares for you.',
    audioFilename: 'scripture/psalm-55-22-1peter-5-7.mp3',
    durationSeconds: 240,
    voiceId: 'male',
    tags: ['comfort', 'rest', 'burdens', 'trust'],
  },
  {
    id: 'psalm-127-1-2',
    title: 'He Gives Sleep to His Beloved',
    scriptureReference: 'Psalm 127:1-2',
    collectionId: 'comfort-and-rest',
    webText:
      '¹ Unless Yahweh builds the house,\nthey who build it labor in vain.\nUnless Yahweh watches over the city,\nthe watchman guards it in vain.\n² It is vain for you to rise up early,\nto stay up late,\neating the bread of toil,\nfor he gives sleep to his loved ones.',
    audioFilename: 'scripture/psalm-127-1-2.mp3',
    durationSeconds: 180,
    voiceId: 'female',
    tags: ['comfort', 'rest', 'sleep', 'trust'],
  },
]

// =============================================================================
// Trust in God Collection
// =============================================================================

const TRUST_IN_GOD: ScriptureReading[] = [
  {
    id: 'proverbs-3-5-6',
    title: 'Trust in the Lord',
    scriptureReference: 'Proverbs 3:5-6',
    collectionId: 'trust-in-god',
    webText:
      '⁵ Trust in Yahweh with all your heart,\nand don\'t lean on your own understanding.\n⁶ In all your ways acknowledge him,\nand he will make your paths straight.',
    audioFilename: 'scripture/proverbs-3-5-6.mp3',
    durationSeconds: 180,
    voiceId: 'female',
    tags: ['trust', 'guidance', 'wisdom'],
  },
  {
    id: 'romans-8-28-39',
    title: 'All Things Work Together',
    scriptureReference: 'Romans 8:28-39',
    collectionId: 'trust-in-god',
    webText:
      '²⁸ We know that all things work together for good for those who love God, for those who are called according to his purpose.\n²⁹ For whom he foreknew, he also predestined to be conformed to the image of his Son, that he might be the firstborn among many brothers.\n³⁰ Whom he predestined, those he also called. Whom he called, those he also justified. Whom he justified, those he also glorified.\n³¹ What then shall we say about these things? If God is for us, who can be against us?\n³² He who didn\'t spare his own Son, but delivered him up for us all, how would he not also with him freely give us all things?\n³³ Who could bring a charge against God\'s chosen ones? It is God who justifies.\n³⁴ Who is he who condemns? It is Christ who died, yes rather, who was raised from the dead, who is at the right hand of God, who also makes intercession for us.\n³⁵ Who shall separate us from the love of Christ? Could oppression, or anguish, or persecution, or famine, or nakedness, or peril, or sword?\n³⁶ Even as it is written, "For your sake we are killed all day long. We were accounted as sheep for the slaughter."\n³⁷ No, in all these things, we are more than conquerors through him who loved us.\n³⁸ For I am persuaded that neither death, nor life, nor angels, nor principalities, nor things present, nor things to come, nor powers,\n³⁹ nor height, nor depth, nor any other created thing will be able to separate us from God\'s love which is in Christ Jesus our Lord.',
    audioFilename: 'scripture/romans-8-28-39.mp3',
    durationSeconds: 480,
    voiceId: 'male',
    tags: ['trust', 'love', 'perseverance', 'assurance'],
  },
  {
    id: 'jeremiah-29-11-13',
    title: 'I Know the Plans',
    scriptureReference: 'Jeremiah 29:11-13',
    collectionId: 'trust-in-god',
    webText:
      '¹¹ For I know the thoughts that I think toward you," says Yahweh, "thoughts of peace, and not of evil, to give you hope and a future.\n¹² You shall call on me, and you shall go and pray to me, and I will listen to you.\n¹³ You shall seek me and find me, when you search for me with all your heart.',
    audioFilename: 'scripture/jeremiah-29-11-13.mp3',
    durationSeconds: 240,
    voiceId: 'female',
    tags: ['trust', 'hope', 'future', 'plans'],
  },
  {
    id: 'joshua-1-9',
    title: 'Be Strong and Courageous',
    scriptureReference: 'Joshua 1:9',
    collectionId: 'trust-in-god',
    webText:
      '⁹ Haven\'t I commanded you? Be strong and courageous. Don\'t be afraid. Don\'t be dismayed, for Yahweh your God is with you wherever you go."',
    audioFilename: 'scripture/joshua-1-9.mp3',
    durationSeconds: 180,
    voiceId: 'male',
    tags: ['trust', 'courage', 'strength', 'presence'],
  },
  {
    id: 'isaiah-41-10-13',
    title: 'Fear Not, I Am With You',
    scriptureReference: 'Isaiah 41:10-13',
    collectionId: 'trust-in-god',
    webText:
      '¹⁰ Don\'t you be afraid, for I am with you.\nDon\'t be dismayed, for I am your God.\nI will strengthen you.\nYes, I will help you.\nYes, I will uphold you with the right hand of my righteousness.\n¹¹ Behold, all those who are incensed against you will be disappointed and confounded.\nThose who strive with you will be like nothing, and shall perish.\n¹² You will seek them, and won\'t find them,\neven those who contend with you.\nThose who war against you will be as nothing,\nas a non-existent thing.\n¹³ For I, Yahweh your God, will hold your right hand,\nsaying to you, "Don\'t be afraid.\nI will help you."',
    audioFilename: 'scripture/isaiah-41-10-13.mp3',
    durationSeconds: 240,
    voiceId: 'female',
    tags: ['trust', 'fear', 'strength', 'presence'],
  },
  {
    id: 'psalm-145-17-20',
    title: 'The Lord is Near',
    scriptureReference: 'Psalm 145:17-20',
    collectionId: 'trust-in-god',
    webText:
      '¹⁷ Yahweh is righteous in all his ways,\nand gracious in all his works.\n¹⁸ Yahweh is near to all those who call on him,\nto all who call on him in truth.\n¹⁹ He will fulfill the desire of those who fear him.\nHe also will hear their cry, and will save them.\n²⁰ Yahweh preserves all those who love him,\nbut he will destroy all the wicked.',
    audioFilename: 'scripture/psalm-145-17-20.mp3',
    durationSeconds: 180,
    voiceId: 'male',
    tags: ['trust', 'nearness', 'prayer', 'righteousness'],
  },
]

// =============================================================================
// God's Promises Collection
// =============================================================================

const GODS_PROMISES: ScriptureReading[] = [
  {
    id: 'revelation-21-1-7',
    title: 'A New Heaven and New Earth',
    scriptureReference: 'Revelation 21:1-7',
    collectionId: 'gods-promises',
    webText:
      '¹ I saw a new heaven and a new earth, for the first heaven and the first earth have passed away, and the sea is no more.\n² I saw the holy city, New Jerusalem, coming down out of heaven from God, prepared like a bride adorned for her husband.\n³ I heard a loud voice out of heaven saying, "Behold, God\'s dwelling is with people; and he will dwell with them, and they will be his people, and God himself will be with them as their God.\n⁴ He will wipe away every tear from their eyes. Death will be no more; neither will there be mourning, nor crying, nor pain any more. The first things have passed away."\n⁵ He who sits on the throne said, "Behold, I am making all things new." He said, "Write, for these words of God are faithful and true."\n⁶ He said to me, "It is done! I am the Alpha and the Omega, the Beginning and the End. I will give freely to him who is thirsty from the spring of the water of life.\n⁷ He who overcomes, I will give him these things. I will be his God, and he will be my son."',
    audioFilename: 'scripture/revelation-21-1-7.mp3',
    durationSeconds: 360,
    voiceId: 'male',
    tags: ['promises', 'hope', 'new-creation', 'eternity'],
  },
  {
    id: '1corinthians-2-9-12',
    title: 'No Eye Has Seen',
    scriptureReference: '1 Corinthians 2:9-12',
    collectionId: 'gods-promises',
    webText:
      '⁹ But as it is written, "Things which an eye didn\'t see, and an ear didn\'t hear, which didn\'t enter into the heart of man, these God has prepared for those who love him."\n¹⁰ But to us, God revealed them through the Spirit. For the Spirit searches all things, yes, the deep things of God.\n¹¹ For who among men knows the things of a man except the spirit of the man which is in him? Even so, no one knows the things of God except God\'s Spirit.\n¹² But we received not the spirit of the world, but the Spirit which is from God, that we might know the things that were freely given to us by God.',
    audioFilename: 'scripture/1corinthians-2-9-12.mp3',
    durationSeconds: 240,
    voiceId: 'female',
    tags: ['promises', 'spirit', 'revelation', 'love'],
  },
  {
    id: 'revelation-7-15-17',
    title: 'He Will Wipe Every Tear',
    scriptureReference: 'Revelation 7:15-17',
    collectionId: 'gods-promises',
    webText:
      '¹⁵ Therefore they are before the throne of God, and they serve him day and night in his temple. He who sits on the throne will spread his tabernacle over them.\n¹⁶ They will never be hungry or thirsty any more. The sun won\'t strike them, nor any heat;\n¹⁷ for the Lamb who is in the middle of the throne will be their shepherd and will guide them to springs of life-giving waters. And God will wipe away every tear from their eyes.',
    audioFilename: 'scripture/revelation-7-15-17.mp3',
    durationSeconds: 240,
    voiceId: 'male',
    tags: ['promises', 'comfort', 'eternity', 'tears'],
  },
  {
    id: 'lamentations-3-22-26',
    title: 'The Steadfast Love of the Lord',
    scriptureReference: 'Lamentations 3:22-26',
    collectionId: 'gods-promises',
    webText:
      '²² It is because of Yahweh\'s loving kindnesses that we are not consumed,\nbecause his compassion doesn\'t fail.\n²³ They are new every morning.\nGreat is your faithfulness.\n²⁴ "Yahweh is my portion," says my soul.\n"Therefore I will hope in him."\n²⁵ Yahweh is good to those who wait for him,\nto the soul that seeks him.\n²⁶ It is good that a man should hope\nand quietly wait for the salvation of Yahweh.',
    audioFilename: 'scripture/lamentations-3-22-26.mp3',
    durationSeconds: 240,
    voiceId: 'female',
    tags: ['promises', 'faithfulness', 'mercy', 'hope'],
  },
  {
    id: '2corinthians-12-9-10',
    title: 'My Grace is Sufficient',
    scriptureReference: '2 Corinthians 12:9-10',
    collectionId: 'gods-promises',
    webText:
      '⁹ He has said to me, "My grace is sufficient for you, for my power is made perfect in weakness." Most gladly therefore I will rather glory in my weaknesses, that the power of Christ may rest on me.\n¹⁰ Therefore I take pleasure in weaknesses, in injuries, in necessities, in persecutions, and in distresses, for Christ\'s sake. For when I am weak, then am I strong.',
    audioFilename: 'scripture/2corinthians-12-9-10.mp3',
    durationSeconds: 180,
    voiceId: 'male',
    tags: ['promises', 'grace', 'strength', 'weakness'],
  },
  {
    id: 'romans-8-35-39',
    title: 'Nothing Can Separate Us',
    scriptureReference: 'Romans 8:35-39',
    collectionId: 'gods-promises',
    webText:
      '³⁵ Who shall separate us from the love of Christ? Could oppression, or anguish, or persecution, or famine, or nakedness, or peril, or sword?\n³⁶ Even as it is written, "For your sake we are killed all day long. We were accounted as sheep for the slaughter."\n³⁷ No, in all these things, we are more than conquerors through him who loved us.\n³⁸ For I am persuaded that neither death, nor life, nor angels, nor principalities, nor things present, nor things to come, nor powers,\n³⁹ nor height, nor depth, nor any other created thing will be able to separate us from God\'s love which is in Christ Jesus our Lord.',
    audioFilename: 'scripture/romans-8-35-39.mp3',
    durationSeconds: 300,
    voiceId: 'female',
    tags: ['promises', 'love', 'assurance', 'perseverance'],
  },
]

// =============================================================================
// Collections & Exports
// =============================================================================

export const SCRIPTURE_COLLECTIONS: ScriptureCollection[] = [
  { id: 'psalms-of-peace', name: 'Psalms of Peace', readings: PSALMS_OF_PEACE },
  { id: 'comfort-and-rest', name: 'Comfort & Rest', readings: COMFORT_AND_REST },
  { id: 'trust-in-god', name: 'Trust in God', readings: TRUST_IN_GOD },
  { id: 'gods-promises', name: "God's Promises", readings: GODS_PROMISES },
]

export const ALL_SCRIPTURE_READINGS: ScriptureReading[] = SCRIPTURE_COLLECTIONS.flatMap(
  (c) => c.readings,
)

export const SCRIPTURE_READING_BY_ID = new Map<string, ScriptureReading>(
  ALL_SCRIPTURE_READINGS.map((r) => [r.id, r]),
)
