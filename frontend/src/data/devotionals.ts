import type { Devotional } from '@/types/devotional'

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
]

/**
 * Returns the devotional for a given date with optional day offset.
 * Deterministic — same date always returns same devotional.
 * Uses day-of-year modulo pool size. Matches verse-of-the-day.ts pattern.
 */
export function getTodaysDevotional(date: Date = new Date(), dayOffset: number = 0): Devotional {
  const adjustedDate = new Date(date)
  adjustedDate.setDate(adjustedDate.getDate() + dayOffset)
  const year = adjustedDate.getFullYear()
  const dayOfYear = Math.floor(
    (Date.UTC(year, adjustedDate.getMonth(), adjustedDate.getDate()) - Date.UTC(year, 0, 0)) /
      (1000 * 60 * 60 * 24),
  )
  return DEVOTIONAL_POOL[dayOfYear % DEVOTIONAL_POOL.length]
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
