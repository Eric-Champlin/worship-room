import type { Devotional } from '@/types/devotional'
import { getLiturgicalSeason, getDayWithinSeason } from '@/constants/liturgical-calendar'

export const DEVOTIONAL_POOL: Devotional[] = [
  // --- Index 0-9: First cycle of 10 themes ---
  {
    id: 'devotional-01',
    dayIndex: 0,
    title: 'Anchored in Trust',
    theme: 'trust',
    quote: {
      text: 'God never made a promise that was too good to be true.',
      attribution: 'D.L. Moody',
    },
    passage: {
      reference: 'Proverbs 3:5-6',
      verses: [
        {
          number: 5,
          text: "Trust in Yahweh with all your heart, and don't lean on your own understanding.",
        },
        {
          number: 6,
          text: 'In all your ways acknowledge him, and he will make your paths straight.',
        },
      ],
    },
    reflection: [
      'There are seasons in life when the road ahead feels unclear, and every instinct tells you to figure things out on your own. It is in precisely those moments that Scripture invites you to release the need for total control.',
      'Trusting God does not mean you stop thinking or planning. It means you hold your plans loosely, recognizing that the One who sees the full picture is also the One who loves you most.',
      "Notice the phrase 'with all your heart.' This is not a half-hearted, backup-plan kind of trust. It is a wholehearted leaning into the character of God, even when circumstances feel uncertain.",
      'Today, consider where you have been gripping tightly to your own understanding. What would it look like to open your hands and let God direct your next step?',
    ],
    prayer:
      'Lord, I confess that I often try to navigate life in my own strength. Help me to trust You more deeply today, especially in the areas where I feel most uncertain. Guide my steps and give me peace as I lean into Your wisdom rather than my own. Amen.',
    reflectionQuestion:
      'Something to think about today: Where in your life are you relying on your own understanding instead of trusting God?',
  },
  {
    id: 'devotional-02',
    dayIndex: 1,
    title: 'A Heart Full of Thanks',
    theme: 'gratitude',
    quote: {
      text: 'Gratitude is not only the greatest of virtues, but the parent of all others.',
      attribution: 'Cicero',
    },
    passage: {
      reference: 'Psalm 100:1-5',
      verses: [
        {
          number: 1,
          text: 'Shout for joy to Yahweh, all you lands!',
        },
        {
          number: 2,
          text: 'Serve Yahweh with gladness. Come before his presence with singing.',
        },
        {
          number: 3,
          text: 'Know that Yahweh, he is God. It is he who has made us, and we are his. We are his people, and the sheep of his pasture.',
        },
        {
          number: 4,
          text: 'Enter into his gates with thanksgiving, and into his courts with praise. Give thanks to him, and bless his name.',
        },
        {
          number: 5,
          text: 'For Yahweh is good. His loving kindness endures forever, his faithfulness to all generations.',
        },
      ],
    },
    reflection: [
      "This psalm is an invitation to approach God not with a list of requests but with a heart overflowing with thanks. The psalmist doesn't begin with whispered needs; he begins with a shout of joy.",
      "Gratitude has a way of reorienting our perspective. When you take time to thank God for what He has already done, the worries of tomorrow begin to loosen their grip.",
      'Notice the reminder in verse three: we belong to Him. You are not an afterthought or a cosmic accident. You are His, crafted with intention and held with care.',
      "Today, try beginning your time with God not by asking for something but by thanking Him for something. Even one small thing can open the door to a deeper awareness of His goodness.",
    ],
    prayer:
      'Father, thank You for Your goodness that never runs out and Your faithfulness that stretches across every generation. Open my eyes today to see the gifts I have been overlooking, and fill my heart with genuine gratitude. Amen.',
    reflectionQuestion:
      'Something to think about today: What is one specific blessing you have been taking for granted lately?',
  },
  {
    id: 'devotional-03',
    dayIndex: 2,
    title: 'The Gift of Letting Go',
    theme: 'forgiveness',
    quote: {
      text: 'To forgive is to set a prisoner free and discover that the prisoner was you.',
      attribution: 'Corrie ten Boom',
    },
    passage: {
      reference: 'Ephesians 4:31-32',
      verses: [
        {
          number: 31,
          text: 'Let all bitterness, wrath, anger, outcry, and slander be put away from you, with all malice.',
        },
        {
          number: 32,
          text: 'And be kind to one another, tender hearted, forgiving each other, just as God also in Christ forgave you.',
        },
      ],
    },
    reflection: [
      'Forgiveness is rarely easy, and it almost never feels fair. Yet Scripture encourages us to release bitterness not because the offense was small but because holding onto it damages us from the inside out.',
      "Paul's words here are not a suggestion; they are a pathway to freedom. Bitterness, wrath, and malice are heavy burdens that were never meant to be carried for a lifetime.",
      'The key phrase is "just as God also in Christ forgave you." Forgiveness is not something we manufacture on our own. It flows from an awareness of how deeply we ourselves have been forgiven.',
      "If there is someone you are struggling to forgive today, know that you don't have to do it perfectly or all at once. Start by asking God to soften your heart, and trust that He will meet you in the process.",
    ],
    prayer:
      'Lord, forgiveness feels impossible sometimes. Soften the places in my heart that have grown hard with resentment. Help me to release what I have been holding onto, not because they deserve it, but because You have shown me what grace looks like. Amen.',
    reflectionQuestion:
      'Something to think about today: Is there someone you need to begin the process of forgiving, even if it starts with a simple prayer?',
  },
  {
    id: 'devotional-04',
    dayIndex: 3,
    title: 'Fearfully and Wonderfully Made',
    theme: 'identity',
    quote: {
      text: 'You are not an accident. You are not a machine. You are not an ant in the colony. You are a universe within a universe.',
      attribution: 'Unknown',
    },
    passage: {
      reference: 'Psalm 139:13-16',
      verses: [
        {
          number: 13,
          text: 'For you formed my inmost being. You knit me together in my mother\'s womb.',
        },
        {
          number: 14,
          text: 'I will give thanks to you, for I am fearfully and wonderfully made. Your works are wonderful. My soul knows that very well.',
        },
        {
          number: 15,
          text: 'My frame wasn\'t hidden from you, when I was made in secret, woven together in the depths of the earth.',
        },
        {
          number: 16,
          text: 'Your eyes saw my body. In your book they were all written, the days that were ordained for me, when as yet there were none of them.',
        },
      ],
    },
    reflection: [
      'In a world that constantly tells you to be more, do more, and look different, this passage is a gentle reminder that you were intentionally designed by a God who does not make mistakes.',
      "David's words are not a feel-good affirmation. They are a declaration rooted in the character of God. The same Creator who set the stars in place took the time to form you with care.",
      'It is easy to compare yourself to others and come away feeling insufficient. But comparison was never part of God\'s design for you. Your worth is not measured by someone else\'s story.',
      "Today, try reading verse fourteen aloud to yourself. Let the truth of those words settle into the places where you have felt 'not enough.' You are wonderfully made, and your soul can know it well.",
    ],
    prayer:
      'Creator God, thank You for making me with intention and purpose. When I am tempted to believe I am not enough, remind me of the care You took in forming me. Help me to see myself through Your eyes today. Amen.',
    reflectionQuestion:
      'Something to think about today: What lie about your identity have you been believing, and what does God say instead?',
  },
  {
    id: 'devotional-05',
    dayIndex: 4,
    title: 'Finding Peace in the Storm',
    theme: 'anxiety-and-peace',
    quote: {
      text: 'Anxiety does not empty tomorrow of its sorrows, but only empties today of its strength.',
      attribution: 'Charles Spurgeon',
    },
    passage: {
      reference: 'Philippians 4:6-7',
      verses: [
        {
          number: 6,
          text: 'In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God.',
        },
        {
          number: 7,
          text: 'And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus.',
        },
      ],
    },
    reflection: [
      "Paul wrote these words from a prison cell, which makes them all the more striking. Peace is not the absence of difficult circumstances. It is a gift that transcends your ability to understand it.",
      'Notice the invitation: "in everything, by prayer and petition with thanksgiving." God does not ask you to pretend anxiety away. He asks you to bring it to Him, honestly and completely.',
      "The promise here is remarkable. God's peace will guard your heart and mind the way a soldier stands watch. You do not have to manufacture this peace on your own; you receive it as you bring your burdens to Him.",
      'If your mind is racing today, try pausing to name what you are anxious about. Speak it to God plainly, and then thank Him for one thing He has already done. That simple act of prayer opens the door to His peace.',
    ],
    prayer:
      'Father, I bring my anxious thoughts to You today. You already know every worry I carry. Replace my fear with Your peace that surpasses all understanding, and guard my heart and mind as only You can. Amen.',
    reflectionQuestion:
      'Something to think about today: What specific worry can you hand over to God in prayer right now?',
  },
  {
    id: 'devotional-06',
    dayIndex: 5,
    title: 'New Every Morning',
    theme: 'faithfulness',
    quote: {
      text: 'God is not greater if you reverence Him, but you are greater if you serve Him.',
      attribution: 'Augustine of Hippo',
    },
    passage: {
      reference: 'Lamentations 3:22-24',
      verses: [
        {
          number: 22,
          text: "It is because of Yahweh's loving kindnesses that we are not consumed, because his compassion doesn't fail.",
        },
        {
          number: 23,
          text: 'They are new every morning. Great is your faithfulness.',
        },
        {
          number: 24,
          text: '"Yahweh is my portion," says my soul. "Therefore I will hope in him."',
        },
      ],
    },
    reflection: [
      "These words were written in one of the darkest moments in Israel's history, surrounded by suffering and loss. Yet even there, the writer found something unshakeable: God's faithfulness.",
      'His mercies are described as "new every morning." That means yesterday\'s failures do not define today. Every sunrise is an invitation to receive fresh grace.',
      "When Jeremiah says 'Yahweh is my portion,' he is saying that even if everything else is stripped away, God Himself is enough. This is not a denial of pain; it is a declaration of where true security lies.",
      'Whatever yesterday looked like for you, today is a new day with new mercies waiting. You do not have to earn them. They are simply there, like the morning light.',
    ],
    prayer:
      'Lord, thank You that Your mercies are new every single morning. When I look back at my failures, help me to look up at Your faithfulness instead. You are enough for today, and I choose to hope in You. Amen.',
    reflectionQuestion:
      'Something to think about today: How does knowing that God\'s mercies are new every morning change the way you approach today?',
  },
  {
    id: 'devotional-07',
    dayIndex: 6,
    title: 'Created with Purpose',
    theme: 'purpose',
    quote: {
      text: 'The place God calls you to is the place where your deep gladness and the world\'s deep hunger meet.',
      attribution: 'Frederick Buechner',
    },
    passage: {
      reference: 'Jeremiah 29:11-13',
      verses: [
        {
          number: 11,
          text: '"For I know the thoughts that I think toward you," says Yahweh, "thoughts of peace, and not of evil, to give you hope and a future."',
        },
        {
          number: 12,
          text: '"You shall call on me, and you shall go and pray to me, and I will listen to you."',
        },
        {
          number: 13,
          text: '"You shall seek me, and find me, when you search for me with all your heart."',
        },
      ],
    },
    reflection: [
      'These words were originally spoken to a people in exile, feeling lost and far from home. God met them not with a scolding but with a promise: I have a plan, and it is for your good.',
      "Purpose is not always a dramatic calling. Sometimes it is found in the quiet, faithful rhythms of everyday life, in the way you love your family, do your work, or show up for a friend in need.",
      'Verse thirteen offers a beautiful invitation: seek God with all your heart, and you will find Him. Purpose flows from relationship with Him, not from a perfectly mapped-out five-year plan.',
      'If you feel uncertain about your direction today, remember that God is not hiding from you. He invites you to seek Him, and He promises to be found.',
    ],
    prayer:
      'God, I trust that You have good plans for me, even when I cannot see them clearly. Give me the courage to seek You wholeheartedly today, knowing that my purpose unfolds as I walk with You. Amen.',
    reflectionQuestion:
      'Something to think about today: In what area of your life do you need to trust that God has a purpose, even when it feels unclear?',
  },
  {
    id: 'devotional-08',
    dayIndex: 7,
    title: 'An Unfading Hope',
    theme: 'hope',
    quote: {
      text: 'Hope is being able to see that there is light despite all of the darkness.',
      attribution: 'Desmond Tutu',
    },
    passage: {
      reference: 'Romans 15:12-13',
      verses: [
        {
          number: 12,
          text: "Again, Isaiah says, 'There will be the root of Jesse, he who arises to rule over the Gentiles; in him the Gentiles will hope.'",
        },
        {
          number: 13,
          text: 'Now may the God of hope fill you with all joy and peace in believing, that you may abound in hope in the power of the Holy Spirit.',
        },
      ],
    },
    reflection: [
      "Paul calls God 'the God of hope,' not the God of wishful thinking. Biblical hope is a confident expectation rooted in God's character, not in favorable circumstances.",
      'Notice that joy, peace, and hope are all described as gifts that God fills you with. You are not expected to generate them through willpower alone.',
      "The phrase 'abound in hope' suggests an overflow, more than enough for yourself and enough to share with others. When God fills you, it spills over into the lives around you.",
      'If hope feels thin today, this verse is an invitation to ask God to fill you afresh. He is generous with His gifts, and He delights in pouring hope into weary hearts.',
    ],
    prayer:
      'God of hope, fill me today with joy and peace that come from trusting You. When my hope runs low, remind me that You are the source and that You never run dry. Let my life overflow with the hope only You can give. Amen.',
    reflectionQuestion:
      'Something to think about today: Where do you need God to fill you with fresh hope today?',
  },
  {
    id: 'devotional-09',
    dayIndex: 8,
    title: 'The God Who Heals',
    theme: 'healing',
    quote: {
      text: 'He who learns must suffer. And even in our sleep, pain that cannot forget falls drop by drop upon the heart, and in our own despair, against our will, comes wisdom to us by the awful grace of God.',
      attribution: 'Aeschylus',
    },
    passage: {
      reference: 'Psalm 147:3-4',
      verses: [
        {
          number: 3,
          text: 'He heals the broken in heart, and binds up their wounds.',
        },
        {
          number: 4,
          text: 'He counts the number of the stars. He calls them all by their names.',
        },
      ],
    },
    reflection: [
      'This verse is short, but its truth is vast. God does not simply observe broken hearts from a distance. He draws near and does the tender work of binding wounds.',
      'Healing is rarely instant. A wound that is bound up still takes time to mend. God is patient with the process, and He invites you to be patient with yourself as well.',
      "You do not need to have your emotions figured out before you come to God. He is not intimidated by your pain. Bring Him your brokenness just as it is, and trust that He is a skilled and gentle healer.",
      "If you are carrying a wound today, whether fresh or years old, know that God sees it. He is not looking away. He is reaching toward you with hands that know how to heal.",
    ],
    prayer:
      'Gentle Healer, You see the wounds I carry, even the ones I try to hide. Bind up what is broken in me and begin the slow, good work of making me whole. I trust Your timing and Your tenderness. Amen.',
    reflectionQuestion:
      'Something to think about today: What broken place in your heart have you been reluctant to bring to God?',
  },
  {
    id: 'devotional-10',
    dayIndex: 9,
    title: 'Better Together',
    theme: 'community',
    quote: {
      text: 'We are not meant to do life alone. God designed us for connection.',
      attribution: 'Unknown',
    },
    passage: {
      reference: 'Ecclesiastes 4:9-12',
      verses: [
        {
          number: 9,
          text: 'Two are better than one, because they have a good reward for their labor.',
        },
        {
          number: 10,
          text: 'For if they fall, the one will lift up his fellow; but woe to him who is alone when he falls, and doesn\'t have another to lift him up.',
        },
        {
          number: 11,
          text: 'Again, if two lie together, then they have warmth; but how can one keep warm alone?',
        },
        {
          number: 12,
          text: 'If a man prevails against one who is alone, two will withstand him; and a threefold cord is not quickly broken.',
        },
      ],
    },
    reflection: [
      'There is a stubborn myth that faith is a solo journey. But this passage paints a different picture. Life is richer, stronger, and safer when you walk it alongside others.',
      "The writer describes practical realities: someone to lift you up when you fall, warmth when it is cold, strength when you are outnumbered. Community is not a luxury; it is a lifeline.",
      'The threefold cord is a powerful image. When God is woven into your relationships, they become something far stronger than either person could be alone.',
      'If you have been trying to carry everything on your own, consider reaching out to someone today. A text, a phone call, an honest conversation. Faith was always meant to be lived in the company of others.',
    ],
    prayer:
      'Lord, thank You for the gift of community. Forgive me for the times I have tried to do life alone. Lead me to people who will sharpen me and walk with me, and help me to be that kind of friend to others. Amen.',
    reflectionQuestion:
      'Something to think about today: Who is one person you could reach out to today to strengthen your connection?',
  },

  // --- Index 10-19: Second cycle of 10 themes ---
  {
    id: 'devotional-11',
    dayIndex: 10,
    title: 'A Refuge in Trouble',
    theme: 'trust',
    quote: {
      text: 'God is our refuge and strength, a very present help in trouble. Therefore we will not fear.',
      attribution: 'Traditional',
    },
    passage: {
      reference: 'Psalm 46:1-3',
      verses: [
        {
          number: 1,
          text: 'God is our refuge and strength, a very present help in trouble.',
        },
        {
          number: 2,
          text: 'Therefore we won\'t be afraid, though the earth changes, though the mountains are shaken into the heart of the seas;',
        },
        {
          number: 3,
          text: 'though its waters roar and are troubled, though the mountains tremble with their swelling.',
        },
      ],
    },
    reflection: [
      "The imagery in this psalm is dramatic: earthquakes, roaring seas, trembling mountains. Yet the psalmist's response is not panic but confidence. Why? Because God is present in the middle of it all.",
      'Notice the word "present." God is not a distant observer watching your struggle from far away. He is right there, an immediate help in the moment of trouble.',
      'Trusting God does not remove the storms from your life, but it changes your posture within them. You can stand firm not because you are strong enough but because the ground you stand on is secure.',
      'Whatever is shaking in your world today, this psalm invites you to take a breath and remember: the God who holds the mountains is holding you too.',
    ],
    prayer:
      'Mighty God, when everything around me feels unstable, You remain my refuge and strength. Help me to run to You first, not as a last resort but as my first response. I choose to trust You in the storm. Amen.',
    reflectionQuestion:
      'Something to think about today: What "storm" in your life right now is an invitation to run to God as your refuge?',
  },
  {
    id: 'devotional-12',
    dayIndex: 11,
    title: 'Grateful in All Things',
    theme: 'gratitude',
    quote: {
      text: 'It is not happy people who are thankful. It is thankful people who are happy.',
      attribution: 'Unknown',
    },
    passage: {
      reference: '1 Thessalonians 5:16-18',
      verses: [
        {
          number: 16,
          text: 'Always rejoice.',
        },
        {
          number: 17,
          text: 'Pray without ceasing.',
        },
        {
          number: 18,
          text: 'In everything give thanks, for this is the will of God in Christ Jesus toward you.',
        },
      ],
    },
    reflection: [
      "Three short commands, but they contain a lifetime of practice. Rejoice. Pray. Give thanks. Paul is not describing a feeling; he is describing a discipline that shapes who you become.",
      'Giving thanks "in everything" does not mean giving thanks "for everything." You do not need to be grateful for pain itself, but you can be grateful for God\'s presence within it.',
      'Prayer without ceasing is not about kneeling all day. It is about maintaining an ongoing conversation with God, a posture of openness that carries through your ordinary moments.',
      'Today, try weaving small moments of thanks into your routine. When you eat, when you step outside, when someone is kind to you. These tiny acts of gratitude can quietly transform the shape of your day.',
    ],
    prayer:
      'Lord, teach me the discipline of gratitude. When I am tempted to focus on what is wrong, redirect my eyes to what is good. Help me to rejoice, to pray, and to give thanks in all things today. Amen.',
    reflectionQuestion:
      'Something to think about today: What is one ordinary moment in your daily routine where you could pause and give thanks?',
  },
  {
    id: 'devotional-13',
    dayIndex: 12,
    title: 'Clothed in Compassion',
    theme: 'forgiveness',
    quote: {
      text: 'Forgiveness is the fragrance that the violet sheds on the heel that has crushed it.',
      attribution: 'Mark Twain',
    },
    passage: {
      reference: 'Colossians 3:12-14',
      verses: [
        {
          number: 12,
          text: "Put on therefore, as God's chosen ones, holy and beloved, a heart of compassion, kindness, lowliness, humility, and perseverance;",
        },
        {
          number: 13,
          text: 'bearing with one another, and forgiving each other, if any man has a complaint against any; even as Christ forgave you, so you also do.',
        },
        {
          number: 14,
          text: 'Above all these things, walk in love, which is the bond of perfection.',
        },
      ],
    },
    reflection: [
      'Paul uses the image of getting dressed: "put on" compassion, kindness, humility. These are not passive qualities that happen to you. They are choices you make each day, like choosing what to wear.',
      'Forgiveness is listed alongside humility and patience because it requires both. It takes humility to admit that you, too, have needed forgiveness, and patience to extend it to others.',
      'The crowning piece is love. Paul says it is "the bond of perfection," the thing that holds all the other virtues together. Without love, even the noblest qualities can become hollow performances.',
      'As you move through today, consider which of these virtues you need to "put on" most intentionally. Compassion? Patience? Forgiveness? Let love be the thread that ties them all together.',
    ],
    prayer:
      'Father, dress me today in compassion, kindness, and humility. Where I have been holding onto grudges, give me the grace to forgive as You have forgiven me. Let love be the foundation of everything I do. Amen.',
    reflectionQuestion:
      'Something to think about today: Which virtue from this passage do you most need to "put on" intentionally today?',
  },
  {
    id: 'devotional-14',
    dayIndex: 13,
    title: 'A New Creation',
    theme: 'identity',
    quote: {
      text: 'The Christian does not think God will love us because we are good, but that God will make us good because He loves us.',
      attribution: 'C.S. Lewis',
    },
    passage: {
      reference: '2 Corinthians 5:17-18',
      verses: [
        {
          number: 17,
          text: 'Therefore if anyone is in Christ, he is a new creation. The old things have passed away. Behold, all things have become new.',
        },
        {
          number: 18,
          text: 'But all things are of God, who reconciled us to himself through Jesus Christ, and gave to us the ministry of reconciliation;',
        },
      ],
    },
    reflection: [
      'This is one of the most liberating statements in all of Scripture. If you are in Christ, you are not a slightly improved version of your old self. You are something entirely new.',
      'The old things have passed away. That means your worst moments, your deepest regrets, and the labels others placed on you do not define who you are anymore.',
      'Being a new creation does not mean the process of growth is finished. It means the foundation has changed. You are building on a new identity, one that was given to you, not one you earned.',
      'If old patterns or old voices try to pull you back today, remember this truth: you are new. That is not a wish; it is a declaration from the God who made you.',
    ],
    prayer:
      'Lord, thank You for making me new. When the old voices try to define me, anchor me in the truth of who I am in Christ. Help me to live today from my new identity, not my old one. Amen.',
    reflectionQuestion:
      'Something to think about today: What "old thing" in your life do you need to let go of to fully embrace who you are now?',
  },
  {
    id: 'devotional-15',
    dayIndex: 14,
    title: 'A Steadfast Mind',
    theme: 'anxiety-and-peace',
    quote: {
      text: 'When we put our cares in His hands, He puts His peace in our hearts.',
      attribution: 'Unknown',
    },
    passage: {
      reference: 'Isaiah 26:3-4',
      verses: [
        {
          number: 3,
          text: "You will keep whoever's mind is steadfast in perfect peace, because he trusts in you.",
        },
        {
          number: 4,
          text: 'Trust in Yahweh forever; for in Yah, Yahweh, is an everlasting rock.',
        },
      ],
    },
    reflection: [
      '"Perfect peace." The Hebrew phrase is shalom shalom, peace doubled for emphasis. This is not a fragile calm that shatters at the first sign of trouble. It is a deep, abiding wholeness.',
      'The condition is a steadfast mind, one that is fixed on God rather than spinning through worst-case scenarios. This is not about ignoring reality but about choosing where you anchor your attention.',
      'Isaiah compares God to an "everlasting rock." Rocks do not waver in a storm. They do not shift with public opinion or circumstance. God is the kind of foundation you can build a life on.',
      'Today, when your thoughts begin to race, try gently redirecting them toward God. Not with guilt, but with trust. He promises to keep you in perfect peace as you keep your mind on Him.',
    ],
    prayer:
      'Lord, You are my everlasting rock. When my mind races with worry, anchor it in Your truth. Grant me the steadfast focus that leads to Your perfect peace, and help me to trust You moment by moment. Amen.',
    reflectionQuestion:
      'Something to think about today: What would it look like to keep your mind "steadfast" on God during the most stressful part of your day?',
  },
  {
    id: 'devotional-16',
    dayIndex: 15,
    title: 'Faithful Through Generations',
    theme: 'faithfulness',
    quote: {
      text: 'The steadfast love of the Lord never ceases; his mercies never come to an end.',
      attribution: 'Traditional',
    },
    passage: {
      reference: 'Psalm 36:5-7',
      verses: [
        {
          number: 5,
          text: 'Your loving kindness, Yahweh, is in the heavens. Your faithfulness reaches to the skies.',
        },
        {
          number: 6,
          text: 'Your righteousness is like the mountains of God. Your judgments are like a great deep. Yahweh, you preserve man and animal.',
        },
        {
          number: 7,
          text: 'How precious is your loving kindness, God! The children of men take refuge under the shadow of your wings.',
        },
      ],
    },
    reflection: [
      'David reaches for the biggest things he can think of to describe God\'s faithfulness: the heavens, the skies, the mountains, the ocean depths. And still, these comparisons fall short.',
      "God's faithfulness is not conditional. It does not depend on your performance, your mood, or your track record. It reaches to the skies whether you had a good day or a terrible one.",
      'The image of taking refuge "under the shadow of your wings" is deeply tender. It speaks of a God who shelters and protects, like a mother bird covering her young.',
      'Today, rest in the knowledge that God\'s faithfulness is bigger than anything you face. You are held, sheltered, and loved by a God whose commitment to you knows no limits.',
    ],
    prayer:
      'Faithful God, Your love reaches higher than I can see and deeper than I can imagine. When I doubt Your goodness, remind me of the countless ways You have been faithful. I take refuge in You today. Amen.',
    reflectionQuestion:
      'Something to think about today: When you look back over your life, where can you see evidence of God\'s faithfulness?',
  },
  {
    id: 'devotional-17',
    dayIndex: 16,
    title: 'More Than You Can Imagine',
    theme: 'purpose',
    quote: {
      text: 'God does not call the qualified. He qualifies the called.',
      attribution: 'Unknown',
    },
    passage: {
      reference: 'Ephesians 3:20-21',
      verses: [
        {
          number: 20,
          text: 'Now to him who is able to do exceedingly abundantly above all that we ask or think, according to the power that works in us,',
        },
        {
          number: 21,
          text: 'to him be the glory in the assembly and in Christ Jesus to all generations, forever and ever. Amen.',
        },
      ],
    },
    reflection: [
      '"Exceedingly abundantly above all that we ask or think." Paul stacks words on top of words, as if language itself cannot contain the scope of what God is able to do.',
      'This is not a promise that you will get everything you want. It is a promise that God\'s capacity to work in and through your life is far beyond your wildest imagination.',
      'Notice the phrase "according to the power that works in us." God\'s extraordinary work is not something that happens out there somewhere. It happens right here, in your ordinary life, through His power in you.',
      'Today, consider expanding your expectations. Not in a name-it-and-claim-it way, but in a posture of openness to what God might do through you if you let Him.',
    ],
    prayer:
      'God, I confess that I often limit You to what I can see and understand. Expand my vision today. Help me to trust that You are working in ways I cannot yet imagine, and give me the courage to step into what You have for me. Amen.',
    reflectionQuestion:
      'Something to think about today: In what area of your life have you been limiting what God might do?',
  },
  {
    id: 'devotional-18',
    dayIndex: 17,
    title: 'Hope in the Waiting',
    theme: 'hope',
    quote: {
      text: 'Hope is patience with the lamp lit.',
      attribution: 'Tertullian',
    },
    passage: {
      reference: 'Psalm 42:10-11',
      verses: [
        {
          number: 10,
          text: "As with a sword in my bones, my adversaries reproach me, while they continually ask me, 'Where is your God?'",
        },
        {
          number: 11,
          text: 'Why are you in despair, my soul? Why are you disturbed within me? Hope in God! For I shall still praise him, the saving health of my countenance, and my God.',
        },
      ],
    },
    reflection: [
      'The psalmist is talking to himself, and it is one of the most honest moments in Scripture. His soul is in despair, and rather than pretending otherwise, he addresses it head on.',
      'This is not blind optimism. It is a choice to hope in God even when feelings tell a different story. "I shall still praise him" is a declaration of faith in the face of discouragement.',
      "Sometimes the bravest thing you can do is preach truth to your own heart. When despair whispers that things will never get better, you can answer back with what you know to be true about God.",
      "If you are in a season of waiting or discouragement today, take a cue from the psalmist. Name the heaviness, then choose to hope. Not because you feel it yet, but because God is worthy of it.",
    ],
    prayer:
      'Lord, my soul is heavy today, but I choose to hope in You. Even when I do not feel it, I know that You are faithful. Lift my eyes above my circumstances and help me to praise You in the waiting. Amen.',
    reflectionQuestion:
      'Something to think about today: What truth about God can you speak to your own heart when discouragement sets in?',
  },
  {
    id: 'devotional-19',
    dayIndex: 18,
    title: 'Healing for the Hurting',
    theme: 'healing',
    quote: {
      text: 'The Lord is close to the brokenhearted. He rescues those whose spirits are crushed.',
      attribution: 'Traditional',
    },
    passage: {
      reference: 'Jeremiah 17:13-14',
      verses: [
        {
          number: 13,
          text: 'Yahweh, the hope of Israel, all who forsake you will be disappointed. Those who depart from me will be written in the earth, because they have forsaken Yahweh, the spring of living waters.',
        },
        {
          number: 14,
          text: 'Heal me, O Yahweh, and I will be healed. Save me, and I will be saved; for you are my praise.',
        },
      ],
    },
    reflection: [
      "Jeremiah's prayer is remarkably simple and direct. He does not try to negotiate or explain. He simply asks God to heal him, trusting that God's healing is the real thing.",
      '"Heal me, and I will be healed" carries a certainty that our modern prayers sometimes lack. Jeremiah believed that when God acts, the result is complete and trustworthy.',
      'There is also a beautiful declaration tucked into this verse: "You are my praise." Even in the midst of asking for healing, Jeremiah centers his identity around worshipping God. His pain does not silence his praise.',
      'Today, you are invited to bring your need for healing to God with that same directness. No fancy words required. Just an honest heart and a willingness to trust the Healer.',
    ],
    prayer:
      'Yahweh, heal me and I will truly be healed. I bring You the places in my life that are broken and hurting. You are my praise, even in the pain. I trust Your healing hands today. Amen.',
    reflectionQuestion:
      'Something to think about today: Can you bring your need for healing to God with the same directness and simplicity that Jeremiah did?',
  },
  {
    id: 'devotional-20',
    dayIndex: 19,
    title: 'Bearing One Another\'s Burdens',
    theme: 'community',
    quote: {
      text: 'In the end, we will remember not the words of our enemies, but the silence of our friends.',
      attribution: 'Martin Luther King Jr.',
    },
    passage: {
      reference: 'Galatians 6:1-2',
      verses: [
        {
          number: 1,
          text: 'Brothers, even if a man is caught in some fault, you who are spiritual must restore such a one in a spirit of gentleness, looking to yourself so that you also are not tempted.',
        },
        {
          number: 2,
          text: "Bear one another's burdens, and so fulfill the law of Christ.",
        },
      ],
    },
    reflection: [
      "One verse. Five words of instruction. And yet they describe one of the most powerful expressions of love: stepping into someone else's struggle and helping carry the weight.",
      'Bearing burdens is not about fixing people or having all the answers. Sometimes it means sitting in silence with someone who is grieving. Other times it means a meal, a phone call, or simply showing up.',
      'Notice that Paul says this is how you "fulfill the law of Christ." The entire law is summed up in love, and burden-bearing is love in action. It is faith with work boots on.',
      'Today, consider who in your life might be carrying a heavy load. You may not be able to remove it, but you can walk alongside them. That presence matters more than you know.',
    ],
    prayer:
      'Jesus, open my eyes to the burdens of those around me. Give me the compassion to step in and the humility to simply be present. Help me to love others the way You have loved me, by showing up. Amen.',
    reflectionQuestion:
      'Something to think about today: Whose burden could you help carry today, even in a small way?',
  },

  // --- Index 20-29: Third cycle of 10 themes ---
  {
    id: 'devotional-21',
    dayIndex: 20,
    title: 'Do Not Be Afraid',
    theme: 'trust',
    quote: {
      text: 'Fear not, for I am with you. Be not dismayed, for I am your God.',
      attribution: 'Traditional',
    },
    passage: {
      reference: 'Isaiah 41:9-10',
      verses: [
        {
          number: 9,
          text: "You whom I have taken hold of from the ends of the earth, and called from its corners, and said to you, 'You are my servant. I have chosen you, and have not cast you away.'",
        },
        {
          number: 10,
          text: "Don't you be afraid, for I am with you. Don't be dismayed, for I am your God. I will strengthen you. Yes, I will help you. Yes, I will uphold you with the right hand of my righteousness.",
        },
      ],
    },
    reflection: [
      'God speaks directly here, and His words are both a command and a comfort. "Do not be afraid" is not a dismissal of your fear. It is a promise that fear does not get the last word.',
      'The reason for courage is not that your problems are small but that your God is big. "I am with you" is the foundation for every act of trust. His presence changes everything.',
      'Three promises stack up: I will strengthen you. I will help you. I will uphold you. God does not ask you to face difficulty with nothing but grit. He offers Himself as your support.',
      'Today, if fear is knocking at your door, answer it with this verse. God is with you. He is strengthening you. He is holding you up. You do not have to be brave on your own.',
    ],
    prayer:
      'Lord, when fear threatens to overwhelm me, anchor me in Your promise. You are with me. You will strengthen me. You will uphold me. I choose to trust You over my fear today. Amen.',
    reflectionQuestion:
      'Something to think about today: Which of God\'s three promises in this verse do you need most right now: strength, help, or being upheld?',
  },
  {
    id: 'devotional-22',
    dayIndex: 21,
    title: 'Rivers of Praise',
    theme: 'gratitude',
    quote: {
      text: 'If the only prayer you ever say in your entire life is thank you, it will be enough.',
      attribution: 'Meister Eckhart',
    },
    passage: {
      reference: 'Psalm 107:1-3',
      verses: [
        {
          number: 1,
          text: 'Give thanks to Yahweh, for he is good, for his loving kindness endures forever.',
        },
        {
          number: 2,
          text: "Let the redeemed of Yahweh say so, whom he has redeemed from the hand of the adversary,",
        },
        {
          number: 3,
          text: 'and gathered out of the lands, from the east and from the west, from the north and from the south.',
        },
      ],
    },
    reflection: [
      'This psalm opens with a call to those who have experienced God\'s redemption to say so. Gratitude in Scripture is not a private, quiet affair. It is something to be spoken, shared, and declared.',
      'God\'s loving kindness "endures forever." That is not a metaphor. It means that no season of your life falls outside the reach of His goodness. Past, present, future; His love covers it all.',
      'The psalmist describes God gathering His people from every direction. No matter how far you have wandered or how lost you have felt, God\'s kindness reaches you wherever you are.',
      "Today, try saying your gratitude out loud. There is something powerful about hearing your own voice declare God's goodness. Let your thanks be a testimony, however simple.",
    ],
    prayer:
      'Yahweh, You are good, and Your loving kindness endures forever. I will say so today, not just in my heart but with my words. Thank You for redeeming me and gathering me to Yourself. Amen.',
    reflectionQuestion:
      'Something to think about today: When was the last time you spoke your gratitude to God out loud?',
  },
  {
    id: 'devotional-23',
    dayIndex: 22,
    title: 'As Far as the East',
    theme: 'forgiveness',
    quote: {
      text: 'God casts our sins into the depths of the sea, and He places a sign that reads, "No fishing."',
      attribution: 'Corrie ten Boom',
    },
    passage: {
      reference: 'Psalm 103:8-12',
      verses: [
        {
          number: 8,
          text: 'Yahweh is merciful and gracious, slow to anger, and abundant in loving kindness.',
        },
        {
          number: 9,
          text: 'He will not always accuse; neither will he stay angry forever.',
        },
        {
          number: 10,
          text: 'He has not dealt with us according to our sins, nor repaid us for our iniquities.',
        },
        {
          number: 11,
          text: 'For as the heavens are high above the earth, so great is his loving kindness toward those who fear him.',
        },
        {
          number: 12,
          text: 'As far as the east is from the west, so far has he removed our transgressions from us.',
        },
      ],
    },
    reflection: [
      '"As far as the east is from the west." This is an immeasurable distance. You can travel east forever and never arrive at west. That is how completely God has removed your sins.',
      'David describes a God who is "slow to anger" and "abundant in loving kindness." He does not deal with us according to what we deserve but according to who He is.',
      'If you have been carrying the weight of past failures, this passage is your invitation to set them down. God is not keeping a tally. He is not bringing up old receipts. He has removed them.',
      "Today, receive this truth: you are not defined by your worst moment. God's mercy is bigger than your biggest failure, and His forgiveness is more thorough than you dare to believe.",
    ],
    prayer:
      'Merciful God, thank You for removing my sins as far as the east is from the west. Help me to stop picking them back up. I receive Your forgiveness today, fully and gratefully. Amen.',
    reflectionQuestion:
      'Something to think about today: Is there a past failure you keep picking back up that God has already removed?',
  },
  {
    id: 'devotional-24',
    dayIndex: 23,
    title: 'His Masterpiece',
    theme: 'identity',
    quote: {
      text: 'God does not love us because we are valuable. We are valuable because God loves us.',
      attribution: 'Fulton J. Sheen',
    },
    passage: {
      reference: 'Ephesians 2:9-10',
      verses: [
        {
          number: 9,
          text: 'not of works, that no one would boast.',
        },
        {
          number: 10,
          text: 'For we are his workmanship, created in Christ Jesus for good works, which God prepared before that we would walk in them.',
        },
      ],
    },
    reflection: [
      'The word "workmanship" can also be translated "masterpiece." You are not a rough draft or an afterthought. You are the intentional, creative work of God.',
      'Notice the order: created for good works, not saved by good works. Your identity comes first; your actions flow from it. You do not work to become something. You work because you already are something.',
      "God prepared good works in advance for you to walk in. That means your life has a trajectory that was designed with care. You are not wandering aimlessly; you are walking into what was prepared for you.",
      "Today, carry yourself with the quiet confidence of someone who knows they are God's masterpiece. Not with arrogance, but with the settled assurance that you were made on purpose, for a purpose.",
    ],
    prayer:
      'Creator God, thank You for calling me Your masterpiece. When I feel ordinary or overlooked, remind me that I was created with intention for good works You have already prepared. Help me to walk in them today. Amen.',
    reflectionQuestion:
      'Something to think about today: How would your day look different if you truly believed you were God\'s masterpiece?',
  },
  {
    id: 'devotional-25',
    dayIndex: 24,
    title: 'Consider the Lilies',
    theme: 'anxiety-and-peace',
    quote: {
      text: 'Worry does not empty tomorrow of its trouble; it empties today of its peace.',
      attribution: 'Oswald Chambers',
    },
    passage: {
      reference: 'Matthew 6:25-27',
      verses: [
        {
          number: 25,
          text: '"Therefore I tell you, don\'t be anxious for your life: what you will eat, or what you will drink; nor yet for your body, what you will wear. Isn\'t life more than food, and the body more than clothing?',
        },
        {
          number: 26,
          text: 'See the birds of the sky, that they don\'t sow, neither do they reap, nor gather into barns. Your heavenly Father feeds them. Aren\'t you of much more value than they?',
        },
        {
          number: 27,
          text: '"Which of you by being anxious, can add one moment to his lifespan?',
        },
      ],
    },
    reflection: [
      "Jesus' question is disarming: has worry ever actually added a single moment to your life? The honest answer is no. Anxiety is a thief that takes but never gives.",
      'The illustration of the birds is not a call to laziness but to perspective. If God faithfully provides for sparrows, how much more will He care for you, His beloved child?',
      '"Aren\'t you of much more value?" Sometimes anxiety is rooted in a quiet belief that you are on your own. Jesus gently corrects that lie. You are seen, valued, and provided for.',
      "Today, when worry starts to build, try stepping outside and looking at the sky. Let the birds remind you that your Father knows what you need, and He has never failed to provide.",
    ],
    prayer:
      'Father, I confess that I worry about things I cannot control. Remind me today that I am more valuable to You than the birds of the sky. Help me to rest in Your provision and release my anxious thoughts into Your capable hands. Amen.',
    reflectionQuestion:
      'Something to think about today: What worry has been stealing your peace, and what would it mean to trust God with it?',
  },
  {
    id: 'devotional-26',
    dayIndex: 25,
    title: 'The Faithful Promise-Keeper',
    theme: 'faithfulness',
    quote: {
      text: 'God is not a man that He should lie. Has He said, and will He not do it?',
      attribution: 'Traditional',
    },
    passage: {
      reference: 'Deuteronomy 7:8-9',
      verses: [
        {
          number: 8,
          text: "but because Yahweh loves you, and because he would keep the oath which he swore to your fathers, Yahweh has brought you out with a mighty hand and redeemed you out of the house of bondage, from the hand of Pharaoh king of Egypt.",
        },
        {
          number: 9,
          text: 'Know therefore that Yahweh your God himself is God, the faithful God, who keeps covenant and loving kindness to a thousand generations with those who love him and keep his commandments.',
        },
      ],
    },
    reflection: [
      '"To a thousand generations." This is not a precise number; it is Moses\' way of saying forever. God\'s faithfulness is not a short-term commitment. It extends beyond anything you can see.',
      'God keeps His covenant. In a world where promises are broken easily and commitments shift with convenience, God stands apart. What He says, He does. What He promises, He fulfills.',
      'This verse calls God "the faithful God." Faithfulness is not just something He does; it is who He is. It is woven into His very nature.',
      'Today, whatever promise of God you are leaning on, trust that He will keep it. He has never broken a single one, and He is not about to start with yours.',
    ],
    prayer:
      'Faithful God, You have kept every promise across every generation. When I am tempted to doubt, remind me of Your perfect track record. I lean on Your faithfulness today, trusting that You will do what You have said. Amen.',
    reflectionQuestion:
      'Something to think about today: Which promise of God are you holding onto right now, and do you truly believe He will keep it?',
  },
  {
    id: 'devotional-27',
    dayIndex: 26,
    title: 'Working for Good',
    theme: 'purpose',
    quote: {
      text: 'God writes the gospel not in the Bible alone, but also on trees, and in the flowers and clouds and stars.',
      attribution: 'Martin Luther',
    },
    passage: {
      reference: 'Romans 8:28-29',
      verses: [
        {
          number: 28,
          text: 'We know that all things work together for good for those who love God, for those who are called according to his purpose.',
        },
        {
          number: 29,
          text: 'For whom he foreknew, he also predestined to be conformed to the image of his Son, that he might be the firstborn among many brothers.',
        },
      ],
    },
    reflection: [
      'This verse does not say that all things are good. It says that all things work together for good. There is an important difference. God does not cause suffering, but He is able to weave even painful threads into something meaningful.',
      "The promise is for 'those who love God.' This is not a magic formula for getting what you want. It is a deep trust that God's purpose runs through every chapter of your story, even the hard ones.",
      'Think of it like a tapestry viewed from behind. From one side, it looks like a tangle of random threads. But from the other side, there is a picture forming. God sees the finished design.',
      "If you are in a season that feels pointless or painful, hold onto this truth: God is not wasting your experience. He is working, even now, weaving purpose into the places you least expect it.",
    ],
    prayer:
      'Lord, I trust that You are working all things together for good, even the parts of my life I do not understand. Give me faith to believe that nothing is wasted in Your hands. Amen.',
    reflectionQuestion:
      'Something to think about today: Can you look back at a difficult season and see how God was working it for good?',
  },
  {
    id: 'devotional-28',
    dayIndex: 27,
    title: 'Wings Like Eagles',
    theme: 'hope',
    quote: {
      text: 'We must accept finite disappointment, but never lose infinite hope.',
      attribution: 'Martin Luther King Jr.',
    },
    passage: {
      reference: 'Isaiah 40:30-31',
      verses: [
        {
          number: 30,
          text: 'Even the youths faint and get weary, and the young men utterly fall;',
        },
        {
          number: 31,
          text: 'But those who wait for Yahweh will renew their strength. They will mount up with wings like eagles. They will run, and not be weary. They will walk, and not faint.',
        },
      ],
    },
    reflection: [
      'The word "wait" in Hebrew does not mean passive sitting. It means to look eagerly, to hope, to expect. Waiting on God is an active posture of trust, not a resignation to inactivity.',
      'Eagles are remarkable creatures. They do not flap frantically like smaller birds. They catch the wind and soar. That is the image here: God\'s strength lifts you up so you do not have to exhaust yourself striving.',
      'Notice the progression: mount up, run, walk. It covers the extraordinary moments and the ordinary ones. God gives strength for the dramatic mountaintop experiences and for the quiet, unglamorous, putting-one-foot-in-front-of-the-other days.',
      'If you are weary today, this verse is your permission to stop striving and start waiting. God renews strength. He does not just top it off. He makes it new.',
    ],
    prayer:
      'Yahweh, I am weary and I need renewed strength. Teach me to wait on You with eager expectation. Lift me up on wings like eagles, and give me the endurance to walk faithfully through this day. Amen.',
    reflectionQuestion:
      'Something to think about today: Are you trying to fly in your own strength, or are you waiting on God to lift you up?',
  },
  {
    id: 'devotional-29',
    dayIndex: 28,
    title: 'Close to the Brokenhearted',
    theme: 'healing',
    quote: {
      text: 'The soul that is wounded by the arrows of God is the soul that is nearest to Him.',
      attribution: 'George Müller',
    },
    passage: {
      reference: 'Psalm 34:17-18',
      verses: [
        {
          number: 17,
          text: 'The righteous cry, and Yahweh hears, and delivers them out of all their troubles.',
        },
        {
          number: 18,
          text: 'Yahweh is near to those who have a broken heart, and saves those who have a crushed spirit.',
        },
      ],
    },
    reflection: [
      'A broken heart is not a barrier to God. It is, according to this psalm, an invitation for His closeness. He does not distance Himself from your pain. He draws near to it.',
      'David says that when the righteous cry out, "Yahweh hears." Not "Yahweh might hear" or "Yahweh will get around to it." He hears. Present tense, immediate, attentive.',
      'A crushed spirit might feel like the end of the road, but this verse says it is exactly the place where God saves. He specializes in meeting people at their lowest point.',
      'If your spirit feels crushed today, take comfort in this: you are not alone, and you are not too broken. God is near. He hears your cry. And He is already working to bring deliverance.',
    ],
    prayer:
      'Lord, You are near to the brokenhearted, and that gives me courage to bring my brokenness to You. Hear my cry today. Deliver me from what overwhelms me, and remind me that my crushed spirit is safe in Your hands. Amen.',
    reflectionQuestion:
      'Something to think about today: Do you believe that God draws closer to you in your brokenness, not farther away?',
  },
  {
    id: 'devotional-30',
    dayIndex: 29,
    title: 'Spurring One Another On',
    theme: 'community',
    quote: {
      text: 'Alone we can do so little; together we can do so much.',
      attribution: 'Helen Keller',
    },
    passage: {
      reference: 'Hebrews 10:24-25',
      verses: [
        {
          number: 24,
          text: 'Let\'s consider how to provoke one another to love and good works,',
        },
        {
          number: 25,
          text: 'not forsaking our own assembling together, as the custom of some is, but exhorting one another, and so much the more as you see the Day approaching.',
        },
      ],
    },
    reflection: [
      'The word "provoke" is usually negative, but here it is beautifully redeemed. To provoke one another to love and good works means to inspire, to encourage, to stir up the best in each other.',
      "Gathering together is not just a religious duty. It is a source of strength. When you show up for others, and they show up for you, something happens that cannot happen in isolation.",
      'The writer urges believers not to give up on community, especially as challenges increase. When life gets harder, the temptation to withdraw grows stronger. But that is exactly when you need others most.',
      'Today, consider how you might spur someone on. A word of encouragement, an invitation to connect, a simple acknowledgment that you see them. Community is built one intentional act at a time.',
    ],
    prayer:
      'Father, give me eyes to see how I can encourage others today. Keep me from withdrawing into isolation when life gets hard. Help me to be faithful in showing up, and surround me with people who spur me on toward love. Amen.',
    reflectionQuestion:
      'Something to think about today: How can you intentionally encourage someone in their faith this week?',
  },

  // --- Seasonal Devotionals (20) ---

  // Advent (5)
  {
    id: 'devotional-seasonal-advent-01',
    dayIndex: 100,
    title: 'The Hope of Advent',
    theme: 'hope',
    season: 'advent',
    quote: {
      text: 'He who has God and everything else has no more than he who has God only.',
      attribution: 'C.S. Lewis',
    },
    passage: {
      reference: 'Isaiah 9:6-7',
      verses: [
        {
          number: 6,
          text: 'For a child is born to us. A son is given to us; and the government will be on his shoulders. His name will be called Wonderful Counselor, Mighty God, Everlasting Father, Prince of Peace.',
        },
        {
          number: 7,
          text: 'Of the increase of his government and of peace there shall be no end, on David\'s throne, and on his kingdom, to establish it, and to uphold it with justice and with righteousness from that time on, even forever. The zeal of Yahweh of Armies will perform this.',
        },
      ],
    },
    reflection: [
      'Advent is a season of expectation, a time when the church collectively holds its breath in anticipation of the coming King. Long before that first Christmas, these words from Isaiah painted a picture of a ruler unlike any the world had known.',
      'The names given to this promised child reveal the nature of the One who is coming: Wonderful Counselor, Mighty God, Everlasting Father, Prince of Peace. Each name is a promise — wisdom, strength, eternal love, and lasting peace.',
      'In the waiting of Advent, we remember that God is never late. The people of Israel waited centuries for this promise to be fulfilled, and when the time was right, God acted. Your waiting is not wasted either.',
      'Today, let the hope of Advent rekindle your trust in God\'s timing. The same God who fulfilled this ancient promise is at work in your life right now.',
    ],
    prayer:
      'Lord, in this season of Advent, fill my heart with hope. Help me to wait with patience and expectation, trusting that You are at work even when I cannot see it. Let the promises of Your Word anchor my soul. Amen.',
    reflectionQuestion:
      'Something to think about today: What are you waiting for God to do in your life, and how can Advent\'s hope sustain you in the waiting?',
  },
  {
    id: 'devotional-seasonal-advent-02',
    dayIndex: 101,
    title: 'Waiting with Purpose',
    theme: 'faithfulness',
    season: 'advent',
    quote: {
      text: 'Patience is not simply the ability to wait — it is how we behave while we are waiting.',
      attribution: 'Joyce Meyer',
    },
    passage: {
      reference: 'Micah 5:2-4',
      verses: [
        {
          number: 2,
          text: 'But you, Bethlehem Ephrathah, being small among the clans of Judah, out of you one will come out to me who is to be ruler in Israel; whose goings out are from of old, from ancient days.',
        },
        {
          number: 3,
          text: 'Therefore he will give them up until the time that she who is in labor gives birth. Then the rest of his brothers will return to the children of Israel.',
        },
        {
          number: 4,
          text: 'He shall stand, and shall shepherd in the strength of Yahweh, in the majesty of the name of Yahweh his God. They will live, for then he will be great to the ends of the earth.',
        },
      ],
    },
    reflection: [
      'The prophet Micah pointed to the smallest of towns — Bethlehem — as the birthplace of a ruler whose origins reach into eternity. God often chooses the humble and overlooked to accomplish His greatest purposes.',
      'Advent reminds us that waiting is not passive. The prophets waited actively, proclaiming God\'s promises, preparing hearts, and living faithfully in the tension between promise and fulfillment.',
      'In your own seasons of waiting, you are not merely passing time. You are being shaped, refined, and prepared for what God has ahead.',
      'This Advent, let your waiting be purposeful. Pray, serve, love, and trust. The One whose "goings out are from of old" is coming — and He is worth the wait.',
    ],
    prayer:
      'Father, teach me to wait with purpose and not with anxiety. As I walk through this Advent season, help me to prepare my heart for Your presence. Remind me that Your plans are bigger than anything I can imagine. Amen.',
    reflectionQuestion:
      'Something to think about today: How can you use this season of waiting to draw closer to God?',
  },
  {
    id: 'devotional-seasonal-advent-03',
    dayIndex: 102,
    title: 'Prophecy Fulfilled',
    theme: 'hope',
    season: 'advent',
    quote: {
      text: 'God is not silent. It is the nature of God to speak.',
      attribution: 'A.W. Tozer',
    },
    passage: {
      reference: 'Isaiah 7:14',
      verses: [
        {
          number: 14,
          text: 'Therefore the Lord himself will give you a sign. Behold, the virgin will conceive, and bear a son, and shall call his name Immanuel.',
        },
      ],
    },
    reflection: [
      'Centuries before the birth of Jesus, God spoke through Isaiah with a promise that must have seemed impossible: a virgin would conceive and bear a son called Immanuel — God with us.',
      'The name Immanuel carries the deepest comfort of Advent. God did not remain distant. He came near. He entered our world, our pain, our humanity.',
      'Every prophecy fulfilled in the Christmas story is evidence that God keeps His word. Not one promise has fallen to the ground.',
      'This Advent, remember that the same faithful God who fulfilled every prophecy about the coming Messiah is the God who holds your future. His track record is perfect.',
    ],
    prayer:
      'Lord, thank You for being a God who keeps every promise. As I reflect on the prophecies fulfilled in Jesus, strengthen my faith to trust the promises You have made for my life. You are Immanuel — God with us. Amen.',
    reflectionQuestion:
      'Something to think about today: Which promise of God do you most need to trust today?',
  },
  {
    id: 'devotional-seasonal-advent-04',
    dayIndex: 103,
    title: 'Preparing the Way',
    theme: 'faithfulness',
    season: 'advent',
    quote: {
      text: 'The one concern of the devil is to keep Christians from praying.',
      attribution: 'Samuel Chadwick',
    },
    passage: {
      reference: 'Malachi 3:1-2',
      verses: [
        {
          number: 1,
          text: '"Behold, I send my messenger, and he will prepare the way before me! And the Lord, whom you seek, will suddenly come to his temple. And the messenger of the covenant, whom you desire, behold, he comes!" says Yahweh of Armies.',
        },
        {
          number: 2,
          text: '"But who can endure the day of his coming? And who will stand when he appears? For he is like a refiner\'s fire, and like launderers\' soap."',
        },
      ],
    },
    reflection: [
      'Before the King arrives, a messenger prepares the way. In the story of Jesus, this messenger was John the Baptist — calling people to repentance and preparation.',
      'Advent is our own season of preparation. It invites us to clear the clutter of our hearts, to make room for the holy, to examine what needs to change before the celebration of Christmas.',
      'The refiner\'s fire image is not meant to frighten but to comfort. God refines us because He loves us and wants to bring out the gold in our lives.',
      'What would it look like to truly prepare your heart for Christmas this year — not just decorating the house, but making room in your soul?',
    ],
    prayer:
      'God, I want to prepare my heart for You this Advent. Show me what needs to be cleared away — anxiety, bitterness, distraction — so that I can receive You fully. Refine me, Lord, and make me ready. Amen.',
    reflectionQuestion:
      'Something to think about today: What is one thing you could let go of this Advent to make more room for God?',
  },
  {
    id: 'devotional-seasonal-advent-05',
    dayIndex: 104,
    title: 'Joy in Anticipation',
    theme: 'hope',
    season: 'advent',
    quote: {
      text: 'Joy is the serious business of heaven.',
      attribution: 'C.S. Lewis',
    },
    passage: {
      reference: 'Zephaniah 3:17',
      verses: [
        {
          number: 17,
          text: 'Yahweh, your God, is among you, a mighty one who will save. He will rejoice over you with joy. He will calm you in his love. He will rejoice over you with singing.',
        },
      ],
    },
    reflection: [
      'Of all the images of God in Scripture, this one from Zephaniah is among the most tender: God singing over His people with joy. Not anger, not disappointment — joy.',
      'Advent builds toward a celebration, and joy is woven into every thread. The angels sang, the shepherds rejoiced, Mary magnified the Lord. Joy is the heartbeat of this season.',
      'But Advent joy is not naive optimism. It is joy born from faith — the confidence that God is present, that He saves, that He delights in His children even in their imperfection.',
      'Today, let this truth sink in: God rejoices over you. Not because you are perfect, but because you are His. That is the joy of Advent.',
    ],
    prayer:
      'Father, fill me with Advent joy — not the shallow happiness the world offers, but the deep joy that comes from knowing You are with me and You delight in me. Help me to carry this joy into every interaction today. Amen.',
    reflectionQuestion:
      'Something to think about today: How does knowing that God rejoices over you change the way you see yourself?',
  },

  // Lent (5)
  {
    id: 'devotional-seasonal-lent-01',
    dayIndex: 105,
    title: 'A Season of Return',
    theme: 'forgiveness',
    season: 'lent',
    quote: {
      text: 'Repentance is not self-punishment; it is a turning to face the light.',
      attribution: 'Richard Rohr',
    },
    passage: {
      reference: 'Joel 2:12-13',
      verses: [
        {
          number: 12,
          text: '"Yet even now," says Yahweh, "turn to me with all your heart, and with fasting, and with weeping, and with mourning."',
        },
        {
          number: 13,
          text: 'Tear your heart, and not your garments, and turn to Yahweh, your God, for he is gracious and merciful, slow to anger, and abundant in loving kindness, and relents from sending calamity.',
        },
      ],
    },
    reflection: [
      'Lent begins with an invitation, not a demand. "Turn to me," God says — with all your heart. This is not about religious performance or outward show. It is about the inner posture of the soul.',
      '"Tear your heart, and not your garments" is one of the most powerful phrases in all of Scripture. God is not interested in appearances. He wants the real you — honest, vulnerable, and willing to return.',
      'The beauty of this passage is what follows the call to repentance: God is gracious, merciful, slow to anger, and abundant in loving kindness. You are not returning to a judge, but to a Father.',
      'This Lent, let repentance be a homecoming. Not a grim duty, but a joyful return to the arms of One who has been waiting for you all along.',
    ],
    prayer:
      'Lord, I turn to You with all my heart this Lenten season. I come not with outward performance, but with honest vulnerability. Thank You for being gracious, merciful, and overflowing with love. Welcome me home. Amen.',
    reflectionQuestion:
      'Something to think about today: What does it mean to you to "tear your heart" rather than your garments before God?',
  },
  {
    id: 'devotional-seasonal-lent-02',
    dayIndex: 106,
    title: 'The Gift of Fasting',
    theme: 'faithfulness',
    season: 'lent',
    quote: {
      text: 'Fasting is feasting on all that God is.',
      attribution: 'John Piper',
    },
    passage: {
      reference: 'Isaiah 58:6-7',
      verses: [
        {
          number: 6,
          text: '"Is not this the fast that I have chosen: to release the bonds of wickedness, to undo the straps of the yoke, to let the oppressed go free, and that you break every yoke?',
        },
        {
          number: 7,
          text: 'Is it not to distribute your bread to the hungry, and that you bring the poor who are cast out to your house? When you see the naked, that you cover him; and that you not hide yourself from your own flesh?"',
        },
      ],
    },
    reflection: [
      'The fast God desires is not simply about food. It is about freedom — releasing oppression, sharing with the hungry, sheltering the homeless, and caring for your own family.',
      'Lent challenges us to examine not just what we consume, but how we live. True fasting creates space — space that is then filled with compassion, generosity, and justice.',
      'When we fast from something, we create a holy emptiness that reveals our dependence on God rather than on comfort, habit, or distraction.',
      'This Lent, consider what you might fast from — and more importantly, what you will feast on instead. Let your fasting lead you toward love.',
    ],
    prayer:
      'God, teach me the true meaning of fasting this Lent. Help me to release not just food, but anything that holds me back from loving You and loving others well. Fill the empty spaces with Your presence. Amen.',
    reflectionQuestion:
      'Something to think about today: What would a meaningful fast look like for you this Lenten season — what could you release to make room for more of God?',
  },
  {
    id: 'devotional-seasonal-lent-03',
    dayIndex: 107,
    title: 'Humility Before God',
    theme: 'identity',
    season: 'lent',
    quote: {
      text: 'Humility is not thinking less of yourself, it is thinking of yourself less.',
      attribution: 'C.S. Lewis',
    },
    passage: {
      reference: 'Psalm 51:10-12',
      verses: [
        {
          number: 10,
          text: 'Create in me a clean heart, O God. Renew a right spirit within me.',
        },
        {
          number: 11,
          text: 'Do not throw me from your presence, and do not take your Holy Spirit from me.',
        },
        {
          number: 12,
          text: 'Restore to me the joy of your salvation. Uphold me with a willing spirit.',
        },
      ],
    },
    reflection: [
      'David wrote this psalm after his greatest failure. It is a prayer of raw honesty — no excuses, no deflection, just a broken man asking God to start over in his heart.',
      'Lent invites us into this same posture of humility. Not because God demands groveling, but because honest self-examination is the first step toward genuine renewal.',
      '"Create in me a clean heart" is a request only God can fulfill. We cannot clean ourselves. We can only open our hands and ask the Creator to do what only He can do.',
      'The promise at the end is beautiful: restored joy. Humility before God does not lead to despair — it leads to freedom and fresh starts.',
    ],
    prayer:
      'Create in me a clean heart, O God. I come to You this Lent with honesty about my failures and my need. Renew a right spirit within me and restore the joy of knowing You. Amen.',
    reflectionQuestion:
      'Something to think about today: What area of your life needs a fresh start from God this Lenten season?',
  },
  {
    id: 'devotional-seasonal-lent-04',
    dayIndex: 108,
    title: 'The Cost of Love',
    theme: 'hope',
    season: 'lent',
    quote: {
      text: 'To love at all is to be vulnerable.',
      attribution: 'C.S. Lewis',
    },
    passage: {
      reference: 'Isaiah 53:3-5',
      verses: [
        {
          number: 3,
          text: 'He was despised and rejected by men, a man of suffering and acquainted with disease. He was despised as one from whom men hide their face; and we did not respect him.',
        },
        {
          number: 4,
          text: 'Surely he has borne our sickness and carried our suffering; yet we considered him plagued, struck by God, and afflicted.',
        },
        {
          number: 5,
          text: 'But he was pierced for our transgressions. He was crushed for our iniquities. The punishment that brought our peace was on him; and by his wounds we are healed.',
        },
      ],
    },
    reflection: [
      'Isaiah 53 is the heart of the Lenten journey. It describes a Suffering Servant who willingly bears the pain, rejection, and sin of others — not because He is weak, but because He is love.',
      'Lent asks us to sit with the cost of love. Jesus did not avoid suffering; He walked toward it. His wounds became our healing.',
      'There is a temptation to rush past the sorrow of Lent toward the joy of Easter. But the depth of Easter\'s celebration is proportional to the depth of Lent\'s reflection.',
      'Today, simply sit with the weight of this passage. Let it soften your heart. Let the cost of His love deepen your gratitude.',
    ],
    prayer:
      'Jesus, I am humbled by the depth of Your sacrifice. You were pierced for my transgressions and crushed for my iniquities. Help me not to rush past the weight of this truth, but to let it transform my heart with gratitude. Amen.',
    reflectionQuestion:
      'Something to think about today: How does reflecting on Christ\'s suffering change the way you approach your own struggles?',
  },
  {
    id: 'devotional-seasonal-lent-05',
    dayIndex: 109,
    title: 'Renewal and New Growth',
    theme: 'hope',
    season: 'lent',
    quote: {
      text: 'God allows us to experience the low points of life in order to teach us lessons that we could learn in no other way.',
      attribution: 'C.S. Lewis',
    },
    passage: {
      reference: 'Ezekiel 36:26-27',
      verses: [
        {
          number: 26,
          text: 'I will also give you a new heart, and I will put a new spirit within you. I will take away the stony heart out of your flesh, and I will give you a heart of flesh.',
        },
        {
          number: 27,
          text: 'I will put my Spirit within you, and cause you to walk in my statutes. You will keep my ordinances and do them.',
        },
      ],
    },
    reflection: [
      'The promise of a new heart is the ultimate Lenten hope. God does not just forgive — He transforms. He takes what is hard and makes it soft. He replaces stone with flesh.',
      'Lent is a season of dying to the old and making room for the new. Like a garden in late winter, the ground must be broken and cleared before new life can emerge.',
      'God promises to put His Spirit within us — not just around us or near us, but within. This is an intimate, interior renewal that changes us from the inside out.',
      'As Lent moves toward Easter, carry this promise with you: God is making all things new, and that includes you.',
    ],
    prayer:
      'Lord, give me a new heart this Lent. Remove what is hard and resistant in me, and replace it with tenderness and openness to Your Spirit. I trust You to do the transforming work that only You can do. Amen.',
    reflectionQuestion:
      'Something to think about today: Where in your life do you sense God wanting to bring new growth this season?',
  },

  // Easter (3)
  {
    id: 'devotional-seasonal-easter-01',
    dayIndex: 110,
    title: 'He Is Risen',
    theme: 'hope',
    season: 'easter',
    quote: {
      text: 'The resurrection gives my life meaning and direction and the opportunity to start over no matter what my circumstances.',
      attribution: 'Robert Flatt',
    },
    passage: {
      reference: 'Matthew 28:5-6',
      verses: [
        {
          number: 5,
          text: 'The angel answered the women, "Do not be afraid, for I know that you seek Jesus, who has been crucified.',
        },
        {
          number: 6,
          text: 'He is not here, for he has risen, just like he said. Come, see the place where the Lord was lying."',
        },
      ],
    },
    reflection: [
      '"He is not here, for he has risen." These may be the most world-changing words ever spoken. The tomb is empty. Death did not have the final word.',
      'The resurrection is not just a historical event — it is a present reality. The same power that raised Jesus from the dead is alive and at work in you today.',
      'Notice the angel\'s first words: "Do not be afraid." The resurrection answers our deepest fears. Death, failure, loss, hopelessness — none of these are final for those who belong to the risen Christ.',
      'Easter is the great exclamation point on the promises of God. He said He would rise, and He did. He says He will never leave you, and He will not.',
    ],
    prayer:
      'Risen Lord, I celebrate Your victory over death today. Let the reality of Your resurrection fill me with courage and hope. Because You live, I can face anything. Thank You for the empty tomb. Amen.',
    reflectionQuestion:
      'Something to think about today: How does the reality of the resurrection change the way you face your biggest fear?',
  },
  {
    id: 'devotional-seasonal-easter-02',
    dayIndex: 111,
    title: 'New Life in Christ',
    theme: 'identity',
    season: 'easter',
    quote: {
      text: 'Easter says you can put truth in a grave, but it will not stay there.',
      attribution: 'Clarence W. Hall',
    },
    passage: {
      reference: 'Romans 6:4-5',
      verses: [
        {
          number: 4,
          text: 'We were buried therefore with him through baptism into death, that just as Christ was raised from the dead through the glory of the Father, so we also might walk in newness of life.',
        },
        {
          number: 5,
          text: 'For if we have become united with him in the likeness of his death, we will also be part of his resurrection.',
        },
      ],
    },
    reflection: [
      'Easter is not just about what happened to Jesus — it is about what happens to us. When Christ rose, He opened the door for all of us to walk in newness of life.',
      'Paul says we are "united with him." The resurrection is not a spectator event. We are participants. The old has died with Christ, and the new has risen with Him.',
      'Walking in newness of life is a daily choice. Every morning is a mini-resurrection — a chance to leave behind what was and step into what God is doing today.',
      'This Easter season, embrace the new life that is yours in Christ. You are not defined by your past failures. You are defined by His risen life in you.',
    ],
    prayer:
      'Jesus, thank You for making me a participant in Your resurrection. Help me to walk in the newness of life You have given me. I leave behind what was and embrace what You are doing today. Amen.',
    reflectionQuestion:
      'Something to think about today: What old pattern or mindset do you need to leave in the grave so you can walk in newness of life?',
  },
  {
    id: 'devotional-seasonal-easter-03',
    dayIndex: 112,
    title: 'Victory Over Death',
    theme: 'hope',
    season: 'easter',
    quote: {
      text: 'Our Lord has written the promise of the resurrection, not in books alone, but in every leaf in springtime.',
      attribution: 'Martin Luther',
    },
    passage: {
      reference: '1 Corinthians 15:55-57',
      verses: [
        {
          number: 55,
          text: '"Death, where is your sting? Hades, where is your victory?"',
        },
        {
          number: 56,
          text: 'The sting of death is sin, and the power of sin is the law.',
        },
        {
          number: 57,
          text: 'But thanks be to God, who gives us the victory through our Lord Jesus Christ.',
        },
      ],
    },
    reflection: [
      'Paul writes with triumphant defiance: "Death, where is your sting?" This is not wishful thinking — it is a declaration rooted in the resurrection of Jesus Christ.',
      'For centuries, death had the final word in every human story. But Easter rewrote the ending. Death has been defeated, and its power has been broken.',
      'The victory is not something we earn or achieve. It is given to us — "thanks be to God, who gives us the victory." This is pure grace.',
      'In the Easter season, carry this victory with you. When fear whispers, when grief weighs heavy, when the darkness feels close — remember: death has lost its sting.',
    ],
    prayer:
      'Father, thank You for the victory over death through Jesus Christ. When fear and grief press in, remind me that death has lost its sting. I live in the light of Your triumph. Amen.',
    reflectionQuestion:
      'Something to think about today: How does Easter\'s promise of victory over death bring comfort to something you are facing right now?',
  },

  // Christmas (3)
  {
    id: 'devotional-seasonal-christmas-01',
    dayIndex: 113,
    title: 'God With Us',
    theme: 'hope',
    season: 'christmas',
    quote: {
      text: 'The Son of God became a man to enable men to become sons of God.',
      attribution: 'C.S. Lewis',
    },
    passage: {
      reference: 'John 1:14',
      verses: [
        {
          number: 14,
          text: 'The Word became flesh and lived among us. We saw his glory, such glory as of the only born Son of the Father, full of grace and truth.',
        },
      ],
    },
    reflection: [
      '"The Word became flesh." In these five words, John captures the most extraordinary event in human history. The eternal God — who spoke the universe into existence — chose to enter it as a baby.',
      'Christmas is the festival of the Incarnation. God did not stay at a distance. He did not shout instructions from heaven. He came down. He lived among us.',
      'John says they saw His glory — but it was a different kind of glory than anyone expected. Not the glory of a palace, but the glory of grace and truth. The glory of a servant.',
      'This Christmas, may the wonder of the Incarnation overwhelm you afresh. The Creator of galaxies took on skin and bones — for you.',
    ],
    prayer:
      'Lord Jesus, the mystery of Your incarnation fills me with awe. You became flesh and lived among us. Help me to never lose the wonder of Christmas — that the God of the universe came near to me. Amen.',
    reflectionQuestion:
      'Something to think about today: What does it mean to you personally that God chose to "live among us"?',
  },
  {
    id: 'devotional-seasonal-christmas-02',
    dayIndex: 114,
    title: 'The Gift of God',
    theme: 'gratitude',
    season: 'christmas',
    quote: {
      text: 'The great gift of Christmas is what God has given us: Himself.',
      attribution: 'Max Lucado',
    },
    passage: {
      reference: 'Luke 2:10-11',
      verses: [
        {
          number: 10,
          text: 'The angel said to them, "Do not be afraid, for behold, I bring you good news of great joy which will be to all the people.',
        },
        {
          number: 11,
          text: 'For there is born to you today, in David\'s city, a Savior, who is Christ the Lord."',
        },
      ],
    },
    reflection: [
      'Good news of great joy — for all the people. Not just for the religious, the powerful, or the prepared. The Christmas announcement went first to shepherds, the ordinary and overlooked.',
      'The angel\'s words are worth savoring: "born to you." This is personal. The Savior was not born for an abstract purpose. He was born for you.',
      'Christmas is, at its heart, about a gift. Not the gifts under the tree, but the Gift who lay in a manger. God gave Himself — freely, completely, lovingly.',
      'Today, receive the gift. Not with guilt or obligation, but with the simple gratitude of a child opening a present from someone who loves them deeply.',
    ],
    prayer:
      'Father, thank You for the gift of Your Son. In the midst of holiday busyness, bring me back to the simple truth: a Savior is born, and He was born for me. Fill my heart with gratitude and wonder. Amen.',
    reflectionQuestion:
      'Something to think about today: How can you receive God\'s gift of Himself more fully this Christmas season?',
  },
  {
    id: 'devotional-seasonal-christmas-03',
    dayIndex: 115,
    title: 'Peace on Earth',
    theme: 'hope',
    season: 'christmas',
    quote: {
      text: 'Christmas is not as much about opening our presents as opening our hearts.',
      attribution: 'Janice Maeditere',
    },
    passage: {
      reference: 'Luke 2:13-14',
      verses: [
        {
          number: 13,
          text: 'Suddenly, there was with the angel a multitude of the heavenly army praising God and saying,',
        },
        {
          number: 14,
          text: '"Glory to God in the highest, on earth peace, good will toward men."',
        },
      ],
    },
    reflection: [
      'The heavens erupted with praise on the night Jesus was born. "Glory to God in the highest, on earth peace, good will toward men." It is a declaration that heaven and earth are being reconciled.',
      'The peace of Christmas is not the absence of conflict. It is the presence of God. In a world full of turmoil, the birth of Jesus announces that God is at work, making all things new.',
      'Good will toward men — this is the posture of God toward humanity. Not anger, not indifference, but good will. Favor. Delight. Welcome.',
      'As you celebrate Christmas, carry this peace with you. Share it with those who are lonely, anxious, or grieving. You are a bearer of the peace the angels sang about.',
    ],
    prayer:
      'Prince of Peace, let Your peace fill my heart and overflow into the lives of those around me this Christmas. In a world that aches for peace, help me to be a carrier of the good news the angels proclaimed. Amen.',
    reflectionQuestion:
      'Something to think about today: Who in your life needs to experience the peace of Christmas, and how can you bring it to them?',
  },

  // Holy Week (2)
  {
    id: 'devotional-seasonal-holyweek-01',
    dayIndex: 116,
    title: 'The Road to the Cross',
    theme: 'hope',
    season: 'holy-week',
    quote: {
      text: 'The cross is the only ladder high enough to touch Heaven\'s threshold.',
      attribution: 'George Muller',
    },
    passage: {
      reference: 'Mark 10:33-34',
      verses: [
        {
          number: 33,
          text: '"Behold, we are going up to Jerusalem. The Son of Man will be delivered to the chief priests and the scribes. They will condemn him to death, and will deliver him to the Gentiles.',
        },
        {
          number: 34,
          text: 'They will mock him, spit on him, scourge him, and kill him. On the third day he will rise again."',
        },
      ],
    },
    reflection: [
      'Jesus walked toward Jerusalem with full knowledge of what awaited Him. There was no ambiguity, no illusion. He knew the mocking, the scourging, the death — and He went anyway.',
      'Holy Week invites us to walk this road with Jesus in our imagination and in our hearts. Not to rush to the resurrection, but to feel the weight of each step toward the cross.',
      'The courage of Jesus in this passage is staggering. He did not run. He did not hide. He set His face toward the place of sacrifice because of His love for you.',
      'Today, slow down. Walk with Jesus. Let the gravity of His journey deepen your understanding of how far love was willing to go.',
    ],
    prayer:
      'Jesus, I am in awe of Your courage. You walked toward suffering and death because You loved me. During this Holy Week, help me to slow down, to walk with You, and to understand the depth of Your sacrifice. Amen.',
    reflectionQuestion:
      'Something to think about today: What does it mean to you that Jesus walked toward the cross willingly?',
  },
  {
    id: 'devotional-seasonal-holyweek-02',
    dayIndex: 117,
    title: 'It Is Finished',
    theme: 'forgiveness',
    season: 'holy-week',
    quote: {
      text: 'The cross was two pieces of dead wood; and a helpless, unresisting Man was nailed to it; yet it was mightier than the world.',
      attribution: 'Fulton J. Sheen',
    },
    passage: {
      reference: 'John 19:28-30',
      verses: [
        {
          number: 28,
          text: 'After this, Jesus, seeing that all things were now finished, that the Scripture might be fulfilled, said, "I am thirsty."',
        },
        {
          number: 29,
          text: 'Now a vessel full of vinegar was set there; so they put a sponge full of the vinegar on hyssop, and held it at his mouth.',
        },
        {
          number: 30,
          text: 'When Jesus therefore had received the vinegar, he said, "It is finished." Then he bowed his head and gave up his spirit.',
        },
      ],
    },
    reflection: [
      '"It is finished." Three words that changed everything. Not "I am finished" — as in defeated — but "It is finished" — as in accomplished. The work of salvation is complete.',
      'In those final moments, Jesus fulfilled every prophecy, satisfied every demand of justice, and opened the way for every sinner to come home to God.',
      'Holy Week confronts us with the cost of grace. It was not cheap. It was not easy. It cost Jesus everything. And He paid it willingly.',
      'There is nothing you need to add to what Christ accomplished on the cross. It is finished. Rest in that truth today.',
    ],
    prayer:
      'Lord Jesus, thank You for finishing the work of salvation on my behalf. I cannot add to what You have done. Help me to simply receive Your grace with a grateful and humble heart this Holy Week. It is finished. Amen.',
    reflectionQuestion:
      'Something to think about today: Are there areas where you are trying to earn what Christ has already freely given?',
  },

  // Pentecost (2)
  {
    id: 'devotional-seasonal-pentecost-01',
    dayIndex: 118,
    title: 'Filled with Fire',
    theme: 'purpose',
    season: 'pentecost',
    quote: {
      text: 'The Spirit-filled life is not a special, deluxe edition of Christianity. It is part and parcel of the total plan of God for His people.',
      attribution: 'A.W. Tozer',
    },
    passage: {
      reference: 'Acts 2:1-4',
      verses: [
        {
          number: 1,
          text: 'Now when the day of Pentecost had come, they were all with one accord in one place.',
        },
        {
          number: 2,
          text: 'Suddenly there came from the sky a sound like the rushing of a mighty wind, and it filled all the house where they were sitting.',
        },
        {
          number: 3,
          text: 'Tongues like fire appeared and were distributed to them, and one sat on each of them.',
        },
        {
          number: 4,
          text: 'They were all filled with the Holy Spirit, and began to speak with other languages, as the Spirit gave them the ability to speak.',
        },
      ],
    },
    reflection: [
      'Pentecost is the birthday of the church — the day when God poured out His Spirit on ordinary people and turned them into a movement that would change the world.',
      'The images are vivid: rushing wind, tongues of fire, new languages. The Holy Spirit is not subtle. He is powerful, transformative, and unmistakable.',
      'But notice where the Spirit came: to people who were gathered together, in one accord, in one place. Community and unity are the conditions for the Spirit\'s fullest work.',
      'On this Pentecost, ask God to fill you afresh with His Spirit. Not for your own benefit alone, but for the sake of the world that needs the love of God through you.',
    ],
    prayer:
      'Holy Spirit, fill me afresh today. I want to be empowered not just for my own growth, but to be Your witness in the world. Set my heart on fire with love and purpose. Amen.',
    reflectionQuestion:
      'Something to think about today: How has the Holy Spirit empowered you recently, and how can you be more open to His work?',
  },
  {
    id: 'devotional-seasonal-pentecost-02',
    dayIndex: 119,
    title: 'Empowered for Mission',
    theme: 'community',
    season: 'pentecost',
    quote: {
      text: 'The church is not a building; the church is not a steeple; the church is the people.',
      attribution: 'Unknown',
    },
    passage: {
      reference: 'Acts 1:8',
      verses: [
        {
          number: 8,
          text: 'But you will receive power when the Holy Spirit has come upon you. You will be witnesses to me in Jerusalem, in all Judea and Samaria, and to the uttermost parts of the earth.',
        },
      ],
    },
    reflection: [
      'Before He ascended, Jesus gave His followers a promise and a mission: "You will receive power... You will be witnesses." The two are inseparable — the power of the Spirit is given for the purpose of witness.',
      'Pentecost reminds us that the Christian life is not meant to be lived in isolation. The Spirit empowers us to go outward — to our neighborhoods, our cities, and to the ends of the earth.',
      'Being a witness does not require eloquence or theological degrees. It requires simply telling what you have seen and experienced of God\'s goodness.',
      'Today, remember that the same Spirit who empowered the first disciples empowers you. You have something to share — your story, your faith, your hope.',
    ],
    prayer:
      'Lord, thank You for the gift of Your Holy Spirit. Empower me to be Your witness today — in my home, my workplace, and my community. Give me courage to share the hope I have found in You. Amen.',
    reflectionQuestion:
      'Something to think about today: Who in your life needs to hear about the hope you have found in Christ?',
  },
]

/**
 * Returns the devotional for a given date with optional day offset.
 * Deterministic — same date always returns same devotional.
 * During named liturgical seasons, prioritizes seasonal devotionals (cycling within the season).
 * Falls back to general pool rotation during Ordinary Time or if no seasonal devotionals exist.
 */
export function getTodaysDevotional(date: Date = new Date(), dayOffset: number = 0): Devotional {
  const adjustedDate = new Date(date)
  adjustedDate.setDate(adjustedDate.getDate() + dayOffset)

  const { currentSeason, isNamedSeason } = getLiturgicalSeason(adjustedDate)

  if (isNamedSeason) {
    const seasonalPool = DEVOTIONAL_POOL.filter((d) => d.season === currentSeason.id)
    const dayInSeason = getDayWithinSeason(currentSeason.id, adjustedDate)
    if (seasonalPool.length > 0 && dayInSeason < seasonalPool.length) {
      return seasonalPool[dayInSeason]
    }
    // Fall through to general pool when seasonal devotionals are exhausted
  }

  // Fallback: general (non-seasonal) pool rotation
  const generalPool = DEVOTIONAL_POOL.filter((d) => !d.season)
  const year = adjustedDate.getFullYear()
  const dayOfYear = Math.floor(
    (Date.UTC(year, adjustedDate.getMonth(), adjustedDate.getDate()) - Date.UTC(year, 0, 0)) /
      (1000 * 60 * 60 * 24),
  )
  return generalPool[dayOfYear % generalPool.length]
}

/**
 * Formats a date with optional day offset for display in the devotional hero.
 * Returns format like "Friday, March 20, 2026".
 */
export function formatDevotionalDate(date: Date = new Date(), dayOffset: number = 0): string {
  const adjustedDate = new Date(date)
  adjustedDate.setDate(adjustedDate.getDate() + dayOffset)
  return adjustedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
