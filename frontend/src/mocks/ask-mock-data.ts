import type { AskResponse } from '@/types/ask'

// Topic keyword mappings — order matters (first match wins)
const TOPIC_KEYWORDS: Array<{ id: string; keywords: string[] }> = [
  {
    id: 'suffering',
    keywords: ['suffer', 'pain', 'hurt', 'why god', 'why does god', 'evil', 'tragedy'],
  },
  {
    id: 'forgiveness',
    keywords: ['forgive', 'forgiveness', 'hurt me', 'betrayed', 'resentment'],
  },
  {
    id: 'anxiety',
    keywords: ['anxious', 'anxiety', 'worried', 'worry', 'fear', 'afraid', 'panic', 'stress'],
  },
  {
    id: 'purpose',
    keywords: ['plan', 'purpose', 'calling', 'direction', 'future', 'meant to'],
  },
  {
    id: 'doubt',
    keywords: ['doubt', 'faith', 'believe', 'question', 'uncertain', 'struggle to believe'],
  },
  { id: 'prayer', keywords: ['pray', 'prayer', 'how to pray', 'talk to god'] },
  {
    id: 'grief',
    keywords: ['grief', 'grieve', 'loss', 'lost someone', 'died', 'death of', 'miss them'],
  },
  {
    id: 'loneliness',
    keywords: ['lonely', 'alone', 'isolated', 'no friends', 'abandoned'],
  },
  { id: 'anger', keywords: ['angry', 'anger', 'mad', 'frustrated', 'rage', 'furious'] },
  {
    id: 'marriage',
    keywords: ['marriage', 'spouse', 'husband', 'wife', 'relationship', 'divorce'],
  },
  {
    id: 'parenting',
    keywords: ['parent', 'child', 'children', 'kid', 'son', 'daughter', 'raising'],
  },
  {
    id: 'money',
    keywords: ['money', 'financial', 'debt', 'afford', 'job loss', 'provision'],
  },
  {
    id: 'identity',
    keywords: ['worth', 'identity', 'enough', 'value', 'self-esteem', 'who am i'],
  },
  {
    id: 'temptation',
    keywords: ['temptation', 'tempted', 'sin', 'addiction', 'struggle with'],
  },
  {
    id: 'afterlife',
    keywords: ['heaven', 'death', 'afterlife', 'eternal', 'what happens when'],
  },
]

export const ASK_RESPONSES: Record<string, AskResponse> = {
  suffering: {
    id: 'suffering',
    topic: 'Suffering & Pain',
    answer:
      "It's one of the hardest questions anyone can ask — why does a loving God allow suffering? You're not alone in wrestling with this, and asking it doesn't mean your faith is weak. It means your heart is honest.\n\nScripture doesn't shy away from suffering. The Bible is full of people who cried out to God in their pain — David, Job, even Jesus himself wept. What Scripture consistently reveals is that God doesn't abandon us in our pain. As Paul writes in Romans 8:28, God works through all things — even the painful ones — for the good of those who love him. That doesn't make the pain less real, but it means it's never wasted.\n\nYou may not get a neat answer to \"why\" this side of heaven, and that's okay. What you can hold onto is that God is present in your suffering, he grieves with you, and he promises to bring beauty from ashes.",
    verses: [
      {
        reference: 'Romans 8:28',
        text: 'We know that all things work together for good for those who love God, for those who are called according to his purpose.',
        explanation:
          'Even in suffering, God is weaving circumstances together for an ultimately good purpose.',
      },
      {
        reference: 'Psalm 34:18',
        text: 'Yahweh is near to those who have a broken heart, and saves those who have a crushed spirit.',
        explanation:
          'God draws especially close to you when you are hurting most.',
      },
      {
        reference: '2 Corinthians 1:3-4',
        text: 'Blessed be the God and Father of our Lord Jesus Christ, the Father of mercies and God of all comfort, who comforts us in all our affliction, that we may be able to comfort those who are in any affliction, through the comfort with which we ourselves are comforted by God.',
        explanation:
          'The comfort God gives you in suffering equips you to comfort others walking through similar pain.',
      },
    ],
    encouragement:
      'Your pain matters to God, and he is closer to you right now than you may realize.',
    prayer:
      'Lord, I am hurting and I don\'t understand why. I bring my pain to you honestly, trusting that you are near to the brokenhearted. Comfort me with your presence. Help me to trust that you are working even in what I cannot see. Give me strength for today and hope for tomorrow. Amen.',
    followUpQuestions: [
      'What if my suffering doesn\'t end?',
      'How did Jesus handle pain?',
      'Can faith and therapy work together?',
    ],
  },
  forgiveness: {
    id: 'forgiveness',
    topic: 'Forgiveness',
    answer:
      "Forgiveness is one of the most challenging things Scripture asks of us — and that's okay to admit. When someone has deeply hurt you, the idea of forgiving can feel impossible, even unfair. But forgiveness isn't about saying what happened was okay. It's about releasing the hold that bitterness has on your heart.\n\nJesus taught that forgiveness is central to the life of faith. In Matthew 6:14-15, he connects our willingness to forgive others with the freedom we experience in God's own forgiveness of us. This isn't a threat — it's an invitation into freedom. Holding onto resentment keeps you tied to the person who hurt you.\n\nForgiveness is often a process, not a one-time event. You may need to choose it again tomorrow and the day after. That's normal. Ask God to help you take the next small step, and trust that he will meet you there.",
    verses: [
      {
        reference: 'Ephesians 4:32',
        text: 'And be kind to one another, tender hearted, forgiving each other, just as God also in Christ forgave you.',
        explanation:
          'We forgive from the overflow of having been forgiven by God ourselves.',
      },
      {
        reference: 'Colossians 3:13',
        text: 'bearing with one another, and forgiving each other, if any man has a complaint against any; even as Christ forgave you, so you also do.',
        explanation:
          'Christ\'s forgiveness of us is the model and motivation for forgiving others.',
      },
      {
        reference: 'Matthew 6:14',
        text: 'For if you forgive men their trespasses, your heavenly Father will also forgive you.',
        explanation:
          'Forgiveness opens the door to deeper freedom and wholeness in your own life.',
      },
    ],
    encouragement:
      'Choosing to forgive is one of the bravest things you can do — and God will give you the strength for it.',
    prayer:
      'Father, you know the hurt I carry. I want to forgive, but it feels so hard. Help me to release this bitterness and trust you with the justice I long for. Soften my heart and give me your perspective. I choose forgiveness today, even if I need to choose it again tomorrow. Thank you for forgiving me so freely. Amen.',
    followUpQuestions: [
      'What if I can\'t forgive myself?',
      'Does forgiving mean forgetting?',
      'How do I forgive someone who isn\'t sorry?',
    ],
  },
  anxiety: {
    id: 'anxiety',
    topic: 'Anxiety & Worry',
    answer:
      "If you're feeling anxious, please know that you're in good company — anxiety is one of the most common struggles people bring before God, and Scripture addresses it with remarkable tenderness. Feeling anxious doesn't mean you lack faith. It means you're human.\n\nThe apostle Peter, who knew what it was like to be overwhelmed, wrote these words: \"Casting all your worries on him, because he cares for you\" (1 Peter 5:7). Notice it says \"all\" your worries — not just the big ones. God invites you to bring every anxious thought to him. And Paul encourages us in Philippians 4:6-7 to replace anxiety with prayer, promising that God's peace will guard our hearts.\n\nThis doesn't mean anxiety disappears overnight. But it means you have a place to take it. Bring your worries to God honestly, one at a time, and let his peace begin to settle over your heart.",
    verses: [
      {
        reference: 'Philippians 4:6-7',
        text: "In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God. And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus.",
        explanation:
          'Prayer is the antidote to anxiety — God promises a peace that goes beyond what we can understand.',
      },
      {
        reference: '1 Peter 5:7',
        text: 'casting all your worries on him, because he cares for you.',
        explanation:
          'God genuinely cares about what worries you and invites you to hand it over to him.',
      },
      {
        reference: 'Isaiah 41:10',
        text: "Don't you be afraid, for I am with you. Don't be dismayed, for I am your God. I will strengthen you. Yes, I will help you. Yes, I will uphold you with the right hand of my righteousness.",
        explanation:
          'God promises his personal presence and active support when fear threatens to overwhelm you.',
      },
    ],
    encouragement:
      'You don\'t have to carry this weight alone — God is strong enough to hold what feels too heavy for you.',
    prayer:
      'God, my mind is racing and my heart feels heavy with worry. I bring every anxious thought to you right now. Help me to release what I cannot control and trust in your faithful care. Fill me with your peace that surpasses understanding. Calm my mind and steady my heart. I choose to trust you. Amen.',
    followUpQuestions: [
      'What if my anxiety doesn\'t go away?',
      'How did Jesus handle stress?',
      'Can faith and therapy work together?',
    ],
  },
  purpose: {
    id: 'purpose',
    topic: "God's Plan & Purpose",
    answer:
      "Wanting to know God's plan for your life shows a heart that genuinely wants to follow him — and that desire itself is beautiful. The good news is that discovering God's purpose isn't usually about waiting for a dramatic sign. It's about walking faithfully in the light you already have.\n\nProverbs 3:5-6 encourages us to trust God with all our heart and not lean on our own understanding. When we acknowledge him in our daily decisions, he promises to direct our paths. That means God's guidance often comes step by step, not all at once.\n\nJeremiah 29:11 reminds us that God's plans for you are good — plans for a future and a hope. You may not see the full picture today, and that's okay. Focus on loving God and loving people where you are right now, and trust that he is faithfully guiding your steps even when you can't see the road ahead.",
    verses: [
      {
        reference: 'Jeremiah 29:11',
        text: "For I know the thoughts that I think toward you,\" says Yahweh, \"thoughts of peace, and not of evil, to give you hope and a future.",
        explanation:
          'God\'s intentions toward you are good — he has plans for your flourishing, not your harm.',
      },
      {
        reference: 'Proverbs 3:5-6',
        text: 'Trust in Yahweh with all your heart, and don\'t lean on your own understanding. In all your ways acknowledge him, and he will make your paths straight.',
        explanation:
          'Trusting God with your decisions opens the door for him to guide your direction.',
      },
      {
        reference: 'Psalm 37:23',
        text: 'A man\'s steps are established by Yahweh. He delights in his way.',
        explanation:
          'God takes delight in guiding the steps of those who seek to follow him.',
      },
    ],
    encouragement:
      'You don\'t need to have it all figured out — God is already at work in the steps you\'re taking today.',
    prayer:
      'Lord, I want to walk in your purpose for my life, but I\'m not sure which way to go. Give me wisdom and clarity. Help me to trust your timing and your plan, even when I can\'t see the full picture. Open the doors you want me to walk through and close the ones that aren\'t from you. I surrender my plans to you. Amen.',
    followUpQuestions: [
      'What if I can\'t hear God\'s voice?',
      'How do I know if it\'s God or me?',
      'What if I missed God\'s plan?',
    ],
  },
  doubt: {
    id: 'doubt',
    topic: 'Doubt & Faith',
    answer:
      "If you're struggling with doubt, you're in the company of some of the greatest people of faith in Scripture. Thomas doubted the resurrection until he saw Jesus for himself. The father in Mark 9:24 cried out, \"I believe! Help my unbelief!\" Doubt isn't the opposite of faith — it's often the doorway to a deeper, more honest relationship with God.\n\nGod is not threatened by your questions. He's big enough to handle your doubts and patient enough to walk with you through them. James 1:5 promises that if you lack wisdom — if things don't make sense — you can ask God and he will generously give it to you without finding fault.\n\nDon't run from your doubts. Bring them to God honestly. Read Scripture. Talk to people you trust. Doubt that seeks answers is faith in motion.",
    verses: [
      {
        reference: 'Mark 9:24',
        text: 'Immediately the father of the child cried out with tears, "I believe. Help my unbelief!"',
        explanation:
          'Honest doubt brought before God is itself an act of faith — he meets us where we are.',
      },
      {
        reference: 'James 1:5',
        text: 'But if any of you lacks wisdom, let him ask of God, who gives to all liberally and without reproach, and it will be given to him.',
        explanation:
          'God doesn\'t condemn you for having questions — he invites you to bring them directly to him.',
      },
      {
        reference: 'Hebrews 11:1',
        text: 'Now faith is assurance of things hoped for, proof of things not seen.',
        explanation:
          'Faith doesn\'t require having all the answers — it\'s choosing to trust in what God has revealed.',
      },
    ],
    encouragement:
      'Your honest questions don\'t push God away — they draw you closer to the truth.',
    prayer:
      'God, I want to believe, but I\'m struggling. I bring my doubts to you honestly because I trust that you can handle them. Strengthen my faith where it feels weak. Give me wisdom and understanding. Help me to keep seeking you even when I don\'t have all the answers. I believe — help my unbelief. Amen.',
    followUpQuestions: [
      'Is it okay to question the Bible?',
      'How did Thomas overcome his doubt?',
      'What if my doubts never go away?',
    ],
  },
  prayer: {
    id: 'prayer',
    topic: 'Prayer & Talking to God',
    answer:
      "If prayer feels intimidating or confusing, you're not alone — even the disciples asked Jesus to teach them how to pray. The beautiful truth is that prayer doesn't require fancy words or perfect theology. It's simply talking honestly with a God who already knows your heart and loves to hear from you.\n\nJesus modeled prayer as a conversation with a loving Father. In Matthew 6:6, he encourages us to find a quiet place and pray to our Father \"who is in secret.\" Prayer can be as simple as telling God what's on your mind, thanking him for something good, or asking for help with something hard.\n\nDon't worry about getting it \"right.\" Romans 8:26 assures us that even when we don't know what to say, the Holy Spirit intercedes for us. Just start talking to God. He's listening.",
    verses: [
      {
        reference: 'Matthew 6:6',
        text: 'But you, when you pray, enter into your inner room, and having shut your door, pray to your Father who is in secret; and your Father who sees in secret will reward you openly.',
        explanation:
          'Prayer is an intimate conversation with God — it doesn\'t need to be public or polished.',
      },
      {
        reference: 'Romans 8:26',
        text: 'In the same way, the Spirit also helps our weakness, for we don\'t know how to pray as we ought. But the Spirit himself makes intercession for us with groanings which can\'t be uttered.',
        explanation:
          'Even when you don\'t have the right words, the Holy Spirit prays on your behalf.',
      },
      {
        reference: '1 Thessalonians 5:17',
        text: 'Pray without ceasing.',
        explanation:
          'Prayer isn\'t just a scheduled activity — it\'s an ongoing conversation with God throughout your day.',
      },
    ],
    encouragement:
      'There\'s no wrong way to talk to God — he\'s already listening and delighted that you want to connect with him.',
    prayer:
      'Father, thank you that I can come to you just as I am. Teach me to pray. Help me to be honest with you about what I\'m feeling and what I need. Quiet the voice that says I\'m not doing it right. I just want to know you more. Here I am — speak to my heart. Amen.',
    followUpQuestions: [
      'How do I know God hears me?',
      'What do I do when prayer feels empty?',
      'Can I pray about anything?',
    ],
  },
  grief: {
    id: 'grief',
    topic: 'Grief & Loss',
    answer:
      "Grief is one of the deepest kinds of pain, and if you're walking through it right now, please know that God sees you and draws near to you in this season. There is no timeline for grief, and there's no \"right way\" to grieve. Your tears are not a sign of weakness — they're a sign of love.\n\nJesus himself wept at the death of his friend Lazarus, even knowing he would raise him from the dead. That tells us something profound: grief is not the absence of faith. It's a natural response to loss, and God honors it.\n\nPsalm 147:3 promises that God heals the brokenhearted and binds up their wounds. He doesn't rush you through your grief or minimize your loss. He sits with you in it. Lean into his comfort, let yourself feel what you need to feel, and trust that healing — though slow — is coming.",
    verses: [
      {
        reference: 'Psalm 147:3',
        text: 'He heals the broken in heart, and binds up their wounds.',
        explanation:
          'God is actively at work healing your broken heart, even when the process feels slow.',
      },
      {
        reference: 'John 11:35',
        text: 'Jesus wept.',
        explanation:
          'Jesus himself grieved — your tears are honored by a God who understands loss personally.',
      },
      {
        reference: 'Revelation 21:4',
        text: 'He will wipe away every tear from their eyes. Death will be no more; neither will there be mourning, nor crying, nor pain any more. The first things have passed away.',
        explanation:
          'There is a day coming when all grief will end — this hope can sustain you through the present pain.',
      },
    ],
    encouragement:
      'Your grief reflects the depth of your love, and God is holding both you and the one you\'ve lost.',
    prayer:
      'Lord, my heart is broken and the weight of this loss feels unbearable. I miss them so much. Please draw near to me in this grief. Comfort me with your presence. Help me to take it one day at a time. Give me the strength to keep going and the hope that I will see wholeness again. Hold me close. Amen.',
    followUpQuestions: [
      'How long should grief last?',
      'Is it okay to be angry at God?',
      'Will I see my loved one again?',
    ],
  },
  loneliness: {
    id: 'loneliness',
    topic: 'Loneliness',
    answer:
      "Loneliness can feel like an invisible weight that nobody else sees. If you're feeling alone right now — whether in a crowd or in an empty room — please know that your feeling is valid, and you are not as alone as it seems.\n\nGod makes a remarkable promise in Deuteronomy 31:8 — he will never leave you or forsake you. Not when you feel forgotten, not when others walk away, not when the silence feels deafening. His presence is constant even when human companionship falls short.\n\nJesus himself experienced profound loneliness. In the Garden of Gethsemane, his closest friends fell asleep when he needed them most. He understands what isolation feels like. And he promises in Matthew 28:20, \"I am with you always, even to the end of the age.\" You are seen, known, and never truly alone.",
    verses: [
      {
        reference: 'Deuteronomy 31:8',
        text: "Yahweh himself is who goes before you. He will be with you. He will not fail you nor forsake you. Don't be afraid. Don't be dismayed.",
        explanation:
          'God goes ahead of you and stays with you — his commitment to your companionship is unwavering.',
      },
      {
        reference: 'Psalm 68:6',
        text: 'God sets the lonely in families. He brings out the prisoners into prosperity, but the rebellious dwell in a sun-scorched land.',
        explanation:
          'God actively works to bring community and belonging to those who feel isolated.',
      },
      {
        reference: 'Matthew 28:20',
        text: 'Behold, I am with you always, even to the end of the age.',
        explanation:
          "Jesus' promise of constant presence means you are never truly alone, even in your loneliest moments.",
      },
    ],
    encouragement:
      'Even in your loneliest moment, God is right there with you — and he is working to bring connection and community into your life.',
    prayer:
      'God, I feel so alone right now. The silence is heavy and I long for connection. Remind me that you are with me. Open my eyes to see the people you\'ve placed around me. Give me courage to reach out. Fill the empty spaces in my heart with your presence and lead me to meaningful community. I trust that you see me. Amen.',
    followUpQuestions: [
      'How do I find community as a Christian?',
      'Did Jesus ever feel alone?',
      'Is being alone the same as lonely?',
    ],
  },
  anger: {
    id: 'anger',
    topic: 'Anger',
    answer:
      "Feeling angry doesn't automatically mean you're doing something wrong. Anger is a natural human emotion — even Jesus expressed righteous anger. The question Scripture raises isn't whether you feel angry, but what you do with that anger.\n\nEphesians 4:26 says, \"Be angry, and don't sin.\" That's a powerful acknowledgment: anger itself isn't sin. But unchecked anger can lead us to places we don't want to go. James 1:19-20 encourages us to be \"slow to anger\" because human anger doesn't produce the righteousness God desires.\n\nIf you're angry right now, bring it to God honestly. He can handle it — the Psalms are full of raw, honest anger directed at God. Pour it out, then ask him to help you respond with wisdom rather than react from a place of hurt.",
    verses: [
      {
        reference: 'Ephesians 4:26',
        text: '"Be angry, and don\'t sin." Don\'t let the sun go down on your wrath.',
        explanation:
          'Scripture validates the emotion of anger while guiding us not to let it control our actions.',
      },
      {
        reference: 'James 1:19-20',
        text: 'So, then, my beloved brothers, let every man be swift to hear, slow to speak, and slow to anger; for the anger of man doesn\'t produce the righteousness of God.',
        explanation:
          'Slowing down before reacting in anger protects you and the people around you.',
      },
      {
        reference: 'Psalm 37:8',
        text: 'Cease from anger, and forsake wrath. Don\'t fret; it leads only to evildoing.',
        explanation:
          'Letting go of anger is an act of trust — trusting God to handle what feels unjust.',
      },
    ],
    encouragement:
      'It\'s okay to feel angry — bring it to God honestly, and let him guide your next step.',
    prayer:
      'Lord, I\'m angry and I need your help. I don\'t want this anger to control me or hurt the people around me. Help me to be honest about what I\'m feeling without letting it lead me somewhere I\'ll regret. Give me patience, wisdom, and the self-control that comes from your Spirit. I release this anger to you. Amen.',
    followUpQuestions: [
      'Is it ever okay to be angry at God?',
      'How do I control my temper?',
      'What if someone keeps hurting me?',
    ],
  },
  marriage: {
    id: 'marriage',
    topic: 'Marriage & Relationships',
    answer:
      "Relationships — especially marriage — can be one of life's greatest blessings and also one of its greatest challenges. If you're navigating difficulty in a relationship right now, know that struggling doesn't mean failing. It means you're in the arena, doing the hard work of loving another imperfect person.\n\nScripture paints a picture of love that is patient, kind, and enduring (1 Corinthians 13:4-7). That kind of love isn't a feeling you either have or don't — it's a daily choice. Ephesians 5:21 calls couples to \"be subject to one another in the fear of Christ,\" which speaks to mutual respect, humility, and putting the other person's needs alongside your own.\n\nWhether you're building a new relationship or repairing a strained one, invite God into the center of it. He designed relationships to reflect his love, and he will help you navigate the complexities when you ask.",
    verses: [
      {
        reference: '1 Corinthians 13:4-5',
        text: 'Love is patient and is kind. Love doesn\'t envy. Love doesn\'t brag, is not proud, doesn\'t behave itself inappropriately, doesn\'t seek its own way, is not provoked, takes no account of evil.',
        explanation:
          'Biblical love is active and sacrificial — a daily choice, not just a feeling.',
      },
      {
        reference: 'Ephesians 5:21',
        text: 'subjecting yourselves one to another in the fear of Christ.',
        explanation:
          'Healthy relationships are built on mutual respect and willingness to serve each other.',
      },
      {
        reference: 'Ecclesiastes 4:12',
        text: 'If one prevails against him, two shall withstand him; and a threefold cord is not quickly broken.',
        explanation:
          'A relationship with God at the center is stronger than one built on two people alone.',
      },
    ],
    encouragement:
      'Every relationship has hard seasons — the fact that you\'re seeking wisdom shows how much you care.',
    prayer:
      'God, I need your help in this relationship. Give me patience when it\'s hard, humility to listen, and courage to love well even when it costs me something. Heal what is broken between us. Help me to see this person the way you see them. Bring unity, understanding, and grace into our relationship. Amen.',
    followUpQuestions: [
      'How do I rebuild broken trust?',
      'When is it okay to walk away?',
      'How do we pray together as a couple?',
    ],
  },
  parenting: {
    id: 'parenting',
    topic: 'Parenting',
    answer:
      "Parenting is one of the most rewarding and exhausting callings there is. If you're feeling overwhelmed, uncertain, or even like you're failing — take a breath. The fact that you care enough to seek wisdom tells you something important about the kind of parent you are.\n\nProverbs 22:6 encourages parents to \"train up a child in the way he should go, and when he is old he will not depart from it.\" This isn't a guarantee that everything will go perfectly — it's an invitation to be intentional and faithful. Your consistency matters more than your perfection.\n\nGod chose you to be this child's parent. He didn't make a mistake. Lean into his wisdom when yours runs out, extend yourself the same grace you'd want for your children, and trust that God is at work in your family even on the hard days.",
    verses: [
      {
        reference: 'Proverbs 22:6',
        text: 'Train up a child in the way he should go, and when he is old he will not depart from it.',
        explanation:
          'Faithful, consistent guidance in childhood lays a foundation that lasts a lifetime.',
      },
      {
        reference: 'Deuteronomy 6:6-7',
        text: 'These words, which I command you today, shall be on your heart; and you shall teach them diligently to your children, and shall talk of them when you sit in your house, and when you walk by the way, and when you lie down, and when you rise up.',
        explanation:
          'Faith isn\'t just taught in formal moments — it\'s woven into the everyday rhythm of family life.',
      },
      {
        reference: 'Psalm 127:3',
        text: 'Behold, children are a heritage of Yahweh. The fruit of the womb is his reward.',
        explanation:
          'Children are a gift from God — and he equips those he entrusts with that gift.',
      },
    ],
    encouragement:
      'You don\'t have to be a perfect parent — just a present one. God fills in the gaps.',
    prayer:
      'Lord, being a parent is harder than I ever imagined. Give me patience when I\'m exhausted, wisdom when I\'m unsure, and grace when I fall short. Help me to love my children the way you love me — unconditionally and faithfully. Protect their hearts and guide their steps. Thank you for trusting me with them. Amen.',
    followUpQuestions: [
      'How do I talk to my kids about God?',
      'What if my child rejects faith?',
      'How do I balance discipline and grace?',
    ],
  },
  money: {
    id: 'money',
    topic: 'Financial Worry',
    answer:
      "Financial stress can feel all-consuming — it affects your sleep, your relationships, and your peace of mind. If you're worried about money right now, you're not alone, and bringing this concern to God is exactly the right instinct.\n\nJesus spoke about money and provision more than almost any other topic, and his message was consistent: don't let worry about tomorrow steal your peace today. In Matthew 6:31-33, he encourages us not to be anxious about what we'll eat, drink, or wear, but to seek God's kingdom first and trust that our needs will be met.\n\nThis doesn't mean being irresponsible — Scripture also values wisdom and planning (Proverbs 21:5). But it does mean that your worth and security aren't determined by your bank account. God knows what you need, and he is faithful to provide.",
    verses: [
      {
        reference: 'Matthew 6:31-33',
        text: '"Therefore don\'t be anxious, saying, \'What will we eat?\', \'What will we drink?\' or, \'With what will we be clothed?\' For the Gentiles seek after all these things; for your heavenly Father knows that you need all these things. But seek first God\'s Kingdom and his righteousness; and all these things will be given to you as well."',
        explanation:
          'When we prioritize our relationship with God, he promises to take care of our material needs.',
      },
      {
        reference: 'Philippians 4:19',
        text: 'My God will supply every need of yours according to his riches in glory in Christ Jesus.',
        explanation:
          'God\'s provision comes from his unlimited resources — not from your limited circumstances.',
      },
      {
        reference: 'Proverbs 3:9-10',
        text: 'Honor Yahweh with your substance, with the first fruits of all your increase; so your barns will be filled with plenty, and your vats will overflow with new wine.',
        explanation:
          'Honoring God with what we have — even when it\'s little — positions us to receive his provision.',
      },
    ],
    encouragement:
      'Your value is not defined by your finances — and the God who feeds the birds of the air knows exactly what you need.',
    prayer:
      'Father, I\'m stressed about money and it feels overwhelming. Help me to trust you as my provider. Give me wisdom to manage what I have and faith to believe you will supply what I need. Free me from the anxiety that comes with financial pressure. I choose to seek your kingdom first today. Amen.',
    followUpQuestions: [
      'Is it wrong to want financial success?',
      'How do I tithe when money is tight?',
      'Does God care about my career?',
    ],
  },
  identity: {
    id: 'identity',
    topic: 'Self-Worth & Identity',
    answer:
      "If you're questioning your worth or struggling with who you are, please hear this: your value was settled before you were born. You are not defined by your achievements, your mistakes, your appearance, or what anyone else says about you. You are defined by the God who made you and calls you his own.\n\nPsalm 139:14 declares that you are \"fearfully and wonderfully made.\" That's not a motivational poster — it's the reality of how God sees you. He knit you together with intention and purpose. Every part of you was designed on purpose.\n\nEphesians 2:10 calls you God's \"workmanship\" — his masterpiece — created for good works that he prepared in advance. You have a purpose that nobody else can fulfill. When the voices of doubt get loud, anchor yourself in what God says about you, not what the world says.",
    verses: [
      {
        reference: 'Psalm 139:14',
        text: 'I will give thanks to you, for I am fearfully and wonderfully made. Your works are wonderful. My soul knows that very well.',
        explanation:
          'You are not an accident — you are a masterpiece intentionally crafted by God.',
      },
      {
        reference: 'Ephesians 2:10',
        text: 'For we are his workmanship, created in Christ Jesus for good works, which God prepared before that we would walk in them.',
        explanation:
          'You were created with a unique purpose — there are things only you are designed to do.',
      },
      {
        reference: '1 John 3:1',
        text: 'See how great a love the Father has given to us, that we should be called children of God! And we are.',
        explanation:
          'Your identity as a child of God is the most secure identity you can have.',
      },
    ],
    encouragement:
      'You are not what others say about you — you are who God says you are: loved, chosen, and irreplaceable.',
    prayer:
      'God, I\'ve been listening to voices that tell me I\'m not enough. Replace those lies with your truth. Help me to see myself the way you see me — as your beloved child, fearfully and wonderfully made. Root my identity in who you say I am, not in my performance or others\' opinions. I am yours. Amen.',
    followUpQuestions: [
      'How do I stop comparing myself to others?',
      'What does God say about my mistakes?',
      'Can God use someone like me?',
    ],
  },
  temptation: {
    id: 'temptation',
    topic: 'Temptation & Sin',
    answer:
      "Being tempted doesn't mean you've failed — even Jesus was tempted. The fact that you're wrestling with this instead of giving in shows the work of the Holy Spirit in your life. Temptation is part of the human experience, and God doesn't shame you for facing it.\n\n1 Corinthians 10:13 offers a powerful promise: no temptation has overtaken you that isn't common to everyone, and God will not let you be tempted beyond what you can bear. He always provides a way out. The key is learning to look for that exit when the pressure is on.\n\nJames 4:7 gives us a practical strategy: submit to God, resist the devil, and he will flee. That order matters — submission to God comes first. When we try to fight temptation in our own strength, we often lose. But when we lean into God's strength, we find the power to overcome.",
    verses: [
      {
        reference: '1 Corinthians 10:13',
        text: 'No temptation has taken you except what is common to man. God is faithful, who will not allow you to be tempted above what you are able, but will with the temptation also make the way of escape, that you may be able to endure it.',
        explanation:
          'God always provides a way out of temptation — your job is to look for it and take it.',
      },
      {
        reference: 'James 4:7',
        text: 'Be subject therefore to God. Resist the devil, and he will flee from you.',
        explanation:
          'Submitting to God first gives you the strength to resist what tempts you.',
      },
      {
        reference: 'Hebrews 4:15-16',
        text: 'For we don\'t have a high priest who can\'t be touched with the feeling of our infirmities, but one who has been in all points tempted like we are, yet without sin. Let\'s therefore draw near with boldness to the throne of grace, that we may receive mercy and may find grace for help in time of need.',
        explanation:
          'Jesus understands your struggle because he faced temptation too — approach him with confidence.',
      },
    ],
    encouragement:
      'Every time you choose to resist, you grow stronger — and God is fighting with you, not against you.',
    prayer:
      'Lord, I\'m struggling with temptation and I need your help. I can\'t overcome this in my own strength. Give me the courage to take the way of escape you promise. Strengthen my resolve and fill me with your Spirit. I submit this struggle to you and trust that your grace is enough. Amen.',
    followUpQuestions: [
      'What if I keep falling into the same sin?',
      'How do I find accountability?',
      'Does God forgive the same sin twice?',
    ],
  },
  afterlife: {
    id: 'afterlife',
    topic: 'Death & Afterlife',
    answer:
      "Questions about death and what comes after are some of the most profound questions we can ask. Whether you're processing the loss of someone you love, facing your own mortality, or simply wondering what eternity looks like — these questions deserve honest, compassionate answers.\n\nThe Christian hope is rooted in the resurrection of Jesus. Because he conquered death, those who trust in him share in that victory. As Jesus said in John 11:25-26, \"I am the resurrection and the life. He who believes in me will still live, even if he dies.\" Death is not the end — it's a doorway.\n\nPaul writes in 2 Corinthians 5:8 that to be \"absent from the body\" is to be \"at home with the Lord.\" For those in Christ, death means being in God's presence fully and completely. And Revelation 21:4 promises a future where there is no more death, mourning, crying, or pain. That's the hope we hold onto.",
    verses: [
      {
        reference: 'John 11:25-26',
        text: 'Jesus said to her, "I am the resurrection and the life. He who believes in me will still live, even if he dies. Whoever lives and believes in me will never die. Do you believe this?"',
        explanation:
          'Jesus offers victory over death to everyone who puts their trust in him.',
      },
      {
        reference: '2 Corinthians 5:8',
        text: 'We are courageous, I say, and are willing rather to be absent from the body and to be at home with the Lord.',
        explanation:
          'For believers, death means coming home to be with God — fully and forever.',
      },
      {
        reference: 'Revelation 21:4',
        text: 'He will wipe away every tear from their eyes. Death will be no more; neither will there be mourning, nor crying, nor pain any more. The first things have passed away.',
        explanation:
          'God promises a future where everything that causes suffering will be permanently removed.',
      },
    ],
    encouragement:
      'Death is not the final word — for those who trust in Christ, the best is yet to come.',
    prayer:
      'God, I have questions about death and what comes next. Calm the fears that rise up in me. Help me to trust in the hope of the resurrection and the promise of eternal life. If I\'m grieving, comfort me with the assurance that death is not the end. Thank you for the victory over death through Jesus. Amen.',
    followUpQuestions: [
      'What will heaven be like?',
      'Do our loved ones watch over us?',
      'How can I be sure of eternal life?',
    ],
  },
  fallback: {
    id: 'fallback',
    topic: 'Biblical Wisdom',
    answer:
      "Thank you for bringing your question to God's Word. While every situation is unique, Scripture offers timeless wisdom that can guide us through any circumstance. The Bible encourages us to seek wisdom actively and trust God's guidance, especially when the path ahead isn't clear.\n\nProverbs 3:5-6 reminds us to trust God with all our heart and not lean on our own understanding. When we acknowledge him in everything we do, he promises to direct our paths. That's a promise you can hold onto today.\n\nJames 1:5 adds that if we lack wisdom — and we all do at times — we can simply ask God, and he'll give it generously without making us feel bad for asking. Whatever you're facing, God is ready to meet you with the wisdom you need.",
    verses: [
      {
        reference: 'Proverbs 3:5-6',
        text: 'Trust in Yahweh with all your heart, and don\'t lean on your own understanding. In all your ways acknowledge him, and he will make your paths straight.',
        explanation:
          'Trusting God\'s wisdom above your own opens the door for his guidance in every situation.',
      },
      {
        reference: 'James 1:5',
        text: 'But if any of you lacks wisdom, let him ask of God, who gives to all liberally and without reproach, and it will be given to him.',
        explanation:
          'God generously gives wisdom to anyone who asks — no question is too small or too complex.',
      },
      {
        reference: 'Psalm 32:8',
        text: 'I will instruct you and teach you in the way which you shall go. I will counsel you with my eye on you.',
        explanation:
          'God promises personal, attentive guidance — he\'s not distant but actively watching over your journey.',
      },
    ],
    encouragement:
      'Whatever you\'re facing, God\'s wisdom is available to you — all you need to do is ask.',
    prayer:
      'Lord, I need your wisdom today. I don\'t have all the answers, but I know you do. Guide my steps and give me clarity. Help me to trust you with the things I don\'t understand and to follow where you lead. Thank you for being a God who gives wisdom generously. Amen.',
    followUpQuestions: [
      'How do I hear God\'s voice?',
      'What does it mean to have faith?',
      'How can I trust God with my future?',
    ],
  },
}

/**
 * Match a user question to a response via case-insensitive keyword scan.
 * First match wins (topics are prioritized by order).
 * Returns the fallback response if no keywords match.
 */
export function getAskResponse(question: string): AskResponse {
  const lower = question.toLowerCase()

  for (const { id, keywords } of TOPIC_KEYWORDS) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return ASK_RESPONSES[id]
      }
    }
  }

  return ASK_RESPONSES.fallback
}
