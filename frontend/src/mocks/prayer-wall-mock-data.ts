import type {
  PrayerWallUser,
  PrayerRequest,
  PrayerComment,
  PrayerReaction,
} from '@/types/prayer-wall'

// --- Mock Users (10) ---

const MOCK_USERS: PrayerWallUser[] = [
  {
    id: 'user-1',
    firstName: 'Sarah',
    lastName: 'Johnson',
    avatarUrl: 'https://i.pravatar.cc/150?u=user1',
    bio: 'Wife, mother, and believer. Finding peace in prayer and gratitude every day.',
    joinedDate: '2025-09-15T00:00:00Z',
  },
  {
    id: 'user-2',
    firstName: 'David',
    lastName: 'Chen',
    avatarUrl: 'https://i.pravatar.cc/150?u=user2',
    bio: 'Worship leader at Grace Community Church. Music is my love language with God.',
    joinedDate: '2025-11-01T00:00:00Z',
  },
  {
    id: 'user-3',
    firstName: 'Emily',
    lastName: 'Rodriguez',
    avatarUrl: 'https://i.pravatar.cc/150?u=user3',
    bio: 'Seminary student. Passionate about scripture study and community prayer.',
    joinedDate: '2026-01-05T00:00:00Z',
  },
  {
    id: 'user-4',
    firstName: 'James',
    lastName: 'Mitchell',
    avatarUrl: 'https://i.pravatar.cc/150?u=user4',
    bio: 'Retired pastor. Still serving through prayer and encouragement.',
    joinedDate: '2025-08-20T00:00:00Z',
  },
  {
    id: 'user-5',
    firstName: 'Rachel',
    lastName: 'Kim',
    avatarUrl: 'https://i.pravatar.cc/150?u=user5',
    bio: 'Teacher and prayer warrior. Lifting up students and families daily.',
    joinedDate: '2025-12-10T00:00:00Z',
  },
  {
    id: 'user-6',
    firstName: 'Michael',
    lastName: 'Thompson',
    avatarUrl: 'https://i.pravatar.cc/150?u=user6',
    bio: 'New to faith. Finding my way one prayer at a time.',
    joinedDate: '2026-02-01T00:00:00Z',
  },
  {
    id: 'user-7',
    firstName: 'Grace',
    lastName: 'Okafor',
    avatarUrl: 'https://i.pravatar.cc/150?u=user7',
    bio: 'Nurse and mother of three. God sustains me through every shift.',
    joinedDate: '2025-10-15T00:00:00Z',
  },
  {
    id: 'user-8',
    firstName: 'Daniel',
    lastName: 'Park',
    avatarUrl: null, // initials avatar
    bio: 'College student navigating faith and life. Grateful for this community.',
    joinedDate: '2026-01-20T00:00:00Z',
  },
  {
    id: 'user-9',
    firstName: 'Maria',
    lastName: 'Santos',
    avatarUrl: null, // initials avatar
    bio: 'Grandmother of five. Every day is a blessing.',
    joinedDate: '2025-07-01T00:00:00Z',
  },
  {
    id: 'user-10',
    firstName: 'Anonymous',
    lastName: 'User',
    avatarUrl: null,
    bio: '',
    joinedDate: '2026-01-01T00:00:00Z',
  },
]

// --- Mock Prayers (18) ---
// Pre-sorted by lastActivityAt DESC

const MOCK_PRAYERS: PrayerRequest[] = [
  {
    id: 'prayer-1',
    userId: 'user-1',
    authorName: 'Sarah',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user1',
    isAnonymous: false,
    content:
      'Please pray for my mother who was just diagnosed with cancer. She starts chemo next week and we are all scared but trusting in God. She has been the rock of our family for 40 years and I cannot imagine life without her strength and love. We need a miracle.',
    isAnswered: false,
    answeredText: null,
    answeredAt: null,
    createdAt: '2026-02-25T14:30:00Z',
    lastActivityAt: '2026-02-26T10:15:00Z',
    prayingCount: 47,
    commentCount: 12,
  },
  {
    id: 'prayer-2',
    userId: 'user-2',
    authorName: 'David',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user2',
    isAnonymous: false,
    content:
      'Our church is going through a difficult transition with our lead pastor retiring. Please pray for unity, wisdom for the elders, and that God would send the right person to shepherd our congregation.',
    isAnswered: false,
    answeredText: null,
    answeredAt: null,
    createdAt: '2026-02-24T09:00:00Z',
    lastActivityAt: '2026-02-26T08:30:00Z',
    prayingCount: 31,
    commentCount: 8,
  },
  {
    id: 'prayer-3',
    userId: null,
    authorName: 'Anonymous',
    authorAvatarUrl: null,
    isAnonymous: true,
    content:
      'I am struggling with addiction and feel so alone. I know God can help me but I keep falling. Please pray that I find the strength to reach out for help and that God would surround me with people who care.',
    isAnswered: false,
    answeredText: null,
    answeredAt: null,
    createdAt: '2026-02-25T22:00:00Z',
    lastActivityAt: '2026-02-26T07:45:00Z',
    prayingCount: 56,
    commentCount: 6,
  },
  {
    id: 'prayer-4',
    userId: 'user-3',
    authorName: 'Emily',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user3',
    isAnonymous: false,
    content: 'Pray for my finals this week. Trusting God with the results.',
    isAnswered: false,
    answeredText: null,
    answeredAt: null,
    createdAt: '2026-02-26T06:00:00Z',
    lastActivityAt: '2026-02-26T06:00:00Z',
    prayingCount: 12,
    commentCount: 3,
  },
  {
    id: 'prayer-5',
    userId: 'user-4',
    authorName: 'James',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user4',
    isAnonymous: false,
    content:
      'Praise God! After two years of infertility, my daughter and her husband are expecting their first child! Thank you to everyone who prayed with us. God is faithful.',
    isAnswered: true,
    answeredText:
      'We prayed for two years and God answered in His perfect timing. Baby is due in July. Our family is overjoyed and so grateful for this community.',
    answeredAt: '2026-02-20T16:00:00Z',
    createdAt: '2024-03-10T12:00:00Z',
    lastActivityAt: '2026-02-25T20:00:00Z',
    prayingCount: 89,
    commentCount: 15,
  },
  {
    id: 'prayer-6',
    userId: 'user-5',
    authorName: 'Rachel',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user5',
    isAnonymous: false,
    content:
      'One of my students lost their parent this week. Please pray for comfort and peace for the whole family. They need to know they are not alone.',
    isAnswered: false,
    answeredText: null,
    answeredAt: null,
    createdAt: '2026-02-23T18:00:00Z',
    lastActivityAt: '2026-02-25T16:30:00Z',
    prayingCount: 38,
    commentCount: 5,
  },
  {
    id: 'prayer-7',
    userId: 'user-6',
    authorName: 'Michael',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user6',
    isAnonymous: false,
    content: 'Starting a new job Monday. Nervous but grateful.',
    isAnswered: false,
    answeredText: null,
    answeredAt: null,
    createdAt: '2026-02-25T10:00:00Z',
    lastActivityAt: '2026-02-25T15:00:00Z',
    prayingCount: 18,
    commentCount: 2,
  },
  {
    id: 'prayer-8',
    userId: 'user-7',
    authorName: 'Grace',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user7',
    isAnonymous: false,
    content:
      'My husband lost his job last month and we are struggling to make ends meet. We have three young children and the bills are piling up. I am trying to trust God but the anxiety is overwhelming. Please pray for provision and for my husband to find work soon. We need doors to open.',
    isAnswered: false,
    answeredText: null,
    answeredAt: null,
    createdAt: '2026-02-22T20:00:00Z',
    lastActivityAt: '2026-02-25T12:00:00Z',
    prayingCount: 42,
    commentCount: 10,
  },
  {
    id: 'prayer-9',
    userId: 'user-8',
    authorName: 'Daniel',
    authorAvatarUrl: null,
    isAnonymous: false,
    content:
      'Feeling disconnected from God lately. Please pray that I can find my way back. I used to feel His presence so strongly and now everything feels quiet.',
    isAnswered: false,
    answeredText: null,
    answeredAt: null,
    createdAt: '2026-02-24T22:00:00Z',
    lastActivityAt: '2026-02-25T09:00:00Z',
    prayingCount: 25,
    commentCount: 4,
  },
  {
    id: 'prayer-10',
    userId: 'user-9',
    authorName: 'Maria',
    authorAvatarUrl: null,
    isAnonymous: false,
    content:
      'Thank you, Lord, for another beautiful day with my grandchildren. Praying for all the grandparents out there raising little ones. You are not forgotten.',
    isAnswered: false,
    answeredText: null,
    answeredAt: null,
    createdAt: '2026-02-24T15:00:00Z',
    lastActivityAt: '2026-02-24T15:00:00Z',
    prayingCount: 15,
    commentCount: 2,
  },
  {
    id: 'prayer-11',
    userId: null,
    authorName: 'Anonymous',
    authorAvatarUrl: null,
    isAnonymous: true,
    content: 'Pray for my marriage. We need God to intervene.',
    isAnswered: false,
    answeredText: null,
    answeredAt: null,
    createdAt: '2026-02-23T08:00:00Z',
    lastActivityAt: '2026-02-24T11:00:00Z',
    prayingCount: 33,
    commentCount: 3,
  },
  {
    id: 'prayer-12',
    userId: 'user-1',
    authorName: 'Sarah',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user1',
    isAnonymous: false,
    content:
      'God answered! My son got accepted into his dream college with a full scholarship. We have been praying about this for over a year. God is so good!',
    isAnswered: true,
    answeredText:
      'After months of waiting and praying, the acceptance letter came today. Full ride. We are in tears. Thank you to everyone who lifted us up.',
    answeredAt: '2026-02-18T10:00:00Z',
    createdAt: '2025-11-15T12:00:00Z',
    lastActivityAt: '2026-02-23T14:00:00Z',
    prayingCount: 64,
    commentCount: 9,
  },
  {
    id: 'prayer-13',
    userId: 'user-2',
    authorName: 'David',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user2',
    isAnonymous: false,
    content:
      'Please lift up our worship team. We have a big Easter service coming up and we want every note to glorify God. Pray for unity and anointing.',
    isAnswered: false,
    answeredText: null,
    answeredAt: null,
    createdAt: '2026-02-21T14:00:00Z',
    lastActivityAt: '2026-02-22T18:00:00Z',
    prayingCount: 20,
    commentCount: 0,
  },
  {
    id: 'prayer-14',
    userId: 'user-5',
    authorName: 'Rachel',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user5',
    isAnonymous: false,
    content: 'Grateful for this community. You all lift me up.',
    isAnswered: false,
    answeredText: null,
    answeredAt: null,
    createdAt: '2026-02-20T08:00:00Z',
    lastActivityAt: '2026-02-20T08:00:00Z',
    prayingCount: 8,
    commentCount: 1,
  },
  {
    id: 'prayer-15',
    userId: 'user-3',
    authorName: 'Emily',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user3',
    isAnonymous: false,
    content:
      'My roommate is going through a really hard time and I do not know how to help. She is not a believer but she is open to prayer. Please pray that God opens her heart and that I can be the friend she needs right now without being pushy.',
    isAnswered: false,
    answeredText: null,
    answeredAt: null,
    createdAt: '2026-02-19T20:00:00Z',
    lastActivityAt: '2026-02-20T06:00:00Z',
    prayingCount: 22,
    commentCount: 4,
  },
  {
    id: 'prayer-16',
    userId: 'user-7',
    authorName: 'Grace',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user7',
    isAnonymous: false,
    content:
      'UPDATE: My husband got a job offer today! It is even better than his last position. God provided exactly when we needed it most. Thank you all for praying with us!',
    isAnswered: true,
    answeredText:
      'Three weeks of uncertainty and God came through. Better pay, better hours, closer to home. He truly works all things for good.',
    answeredAt: '2026-02-15T17:00:00Z',
    createdAt: '2026-01-28T12:00:00Z',
    lastActivityAt: '2026-02-18T09:00:00Z',
    prayingCount: 51,
    commentCount: 7,
  },
  {
    id: 'prayer-17',
    userId: 'user-4',
    authorName: 'James',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user4',
    isAnonymous: false,
    content:
      'Pray for the persecuted church around the world. So many believers are suffering for their faith. May God strengthen them and protect them.',
    isAnswered: false,
    answeredText: null,
    answeredAt: null,
    createdAt: '2026-02-15T07:00:00Z',
    lastActivityAt: '2026-02-17T12:00:00Z',
    prayingCount: 35,
    commentCount: 2,
  },
  {
    id: 'prayer-18',
    userId: 'user-6',
    authorName: 'Michael',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user6',
    isAnonymous: false,
    content:
      'Just got baptized last Sunday! Best decision of my life. Thank you to this community for helping me find my way to faith. I never thought I would be here but God had other plans.',
    isAnswered: false,
    answeredText: null,
    answeredAt: null,
    createdAt: '2026-02-10T16:00:00Z',
    lastActivityAt: '2026-02-14T20:00:00Z',
    prayingCount: 72,
    commentCount: 11,
  },
]

// --- Mock Comments (35) ---

const MOCK_COMMENTS: PrayerComment[] = [
  // prayer-1 (Sarah's mother - 12 comments, showing representative set)
  {
    id: 'comment-1',
    prayerId: 'prayer-1',
    userId: 'user-2',
    authorName: 'David',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user2',
    content: 'Lifting your mother up in prayer right now. God is the great healer.',
    createdAt: '2026-02-26T10:15:00Z',
  },
  {
    id: 'comment-2',
    prayerId: 'prayer-1',
    userId: 'user-3',
    authorName: 'Emily',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user3',
    content: '@Sarah Standing with you in prayer. Psalm 46:1 — God is our refuge and strength.',
    createdAt: '2026-02-26T09:30:00Z',
  },
  {
    id: 'comment-3',
    prayerId: 'prayer-1',
    userId: 'user-4',
    authorName: 'James',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user4',
    content: 'Lord, be with this family. Wrap them in Your peace. Amen.',
    createdAt: '2026-02-26T08:00:00Z',
  },
  {
    id: 'comment-4',
    prayerId: 'prayer-1',
    userId: 'user-5',
    authorName: 'Rachel',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user5',
    content: 'Praying for complete healing. Keep trusting.',
    createdAt: '2026-02-25T22:30:00Z',
  },
  {
    id: 'comment-5',
    prayerId: 'prayer-1',
    userId: 'user-7',
    authorName: 'Grace',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user7',
    content: '@Sarah As a nurse, I have seen miracles happen. Keep your faith strong. Praying for your mom.',
    createdAt: '2026-02-25T21:00:00Z',
  },
  {
    id: 'comment-6',
    prayerId: 'prayer-1',
    userId: 'user-9',
    authorName: 'Maria',
    authorAvatarUrl: null,
    content: 'My heart goes out to you, dear. Praying without ceasing.',
    createdAt: '2026-02-25T19:00:00Z',
  },
  {
    id: 'comment-7',
    prayerId: 'prayer-1',
    userId: 'user-8',
    authorName: 'Daniel',
    authorAvatarUrl: null,
    content: 'God is bigger than any diagnosis. Believing with you.',
    createdAt: '2026-02-25T18:00:00Z',
  },
  {
    id: 'comment-8',
    prayerId: 'prayer-1',
    userId: 'user-6',
    authorName: 'Michael',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user6',
    content: 'Praying for strength for the whole family.',
    createdAt: '2026-02-25T17:00:00Z',
  },

  // prayer-2 (David's church - 8 comments)
  {
    id: 'comment-9',
    prayerId: 'prayer-2',
    userId: 'user-4',
    authorName: 'James',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user4',
    content: 'As a retired pastor, transitions are hard but God always provides. Praying for your elders.',
    createdAt: '2026-02-26T08:30:00Z',
  },
  {
    id: 'comment-10',
    prayerId: 'prayer-2',
    userId: 'user-1',
    authorName: 'Sarah',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user1',
    content: '@David Praying for your church family. God has someone perfect in mind.',
    createdAt: '2026-02-25T20:00:00Z',
  },
  {
    id: 'comment-11',
    prayerId: 'prayer-2',
    userId: 'user-3',
    authorName: 'Emily',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user3',
    content: 'Unity in the body of Christ is so important. Lifting this up.',
    createdAt: '2026-02-25T15:00:00Z',
  },

  // prayer-3 (Anonymous addiction - 6 comments)
  {
    id: 'comment-12',
    prayerId: 'prayer-3',
    userId: 'user-4',
    authorName: 'James',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user4',
    content: 'You are not alone in this fight. God sees you and loves you exactly where you are. One step at a time.',
    createdAt: '2026-02-26T07:45:00Z',
  },
  {
    id: 'comment-13',
    prayerId: 'prayer-3',
    userId: 'user-7',
    authorName: 'Grace',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user7',
    content: 'Praying for freedom and healing. Reach out to someone you trust today.',
    createdAt: '2026-02-26T06:00:00Z',
  },
  {
    id: 'comment-14',
    prayerId: 'prayer-3',
    userId: 'user-2',
    authorName: 'David',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user2',
    content: 'Romans 8:38-39 — nothing can separate you from the love of God. Keep fighting.',
    createdAt: '2026-02-26T01:00:00Z',
  },

  // prayer-4 (Emily's finals - 3 comments)
  {
    id: 'comment-15',
    prayerId: 'prayer-4',
    userId: 'user-1',
    authorName: 'Sarah',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user1',
    content: 'You got this, Emily! Praying for peace and focus.',
    createdAt: '2026-02-26T07:00:00Z',
  },
  {
    id: 'comment-16',
    prayerId: 'prayer-4',
    userId: 'user-9',
    authorName: 'Maria',
    authorAvatarUrl: null,
    content: '@Emily Praying for you sweetheart. Do your best and leave the rest to God.',
    createdAt: '2026-02-26T06:30:00Z',
  },
  {
    id: 'comment-17',
    prayerId: 'prayer-4',
    userId: 'user-8',
    authorName: 'Daniel',
    authorAvatarUrl: null,
    content: 'Same here! Finals are stressful. We can do this.',
    createdAt: '2026-02-26T06:15:00Z',
  },

  // prayer-5 (James's daughter - answered, 15 comments showing a few)
  {
    id: 'comment-18',
    prayerId: 'prayer-5',
    userId: 'user-1',
    authorName: 'Sarah',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user1',
    content: 'This makes my heart so full! Congratulations to your daughter!',
    createdAt: '2026-02-20T17:00:00Z',
  },
  {
    id: 'comment-19',
    prayerId: 'prayer-5',
    userId: 'user-7',
    authorName: 'Grace',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user7',
    content: '@James What beautiful news! God is so faithful. Praying for a healthy pregnancy.',
    createdAt: '2026-02-20T18:00:00Z',
  },

  // prayer-6 (Rachel's student - 5 comments)
  {
    id: 'comment-20',
    prayerId: 'prayer-6',
    userId: 'user-4',
    authorName: 'James',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user4',
    content: 'Lord, comfort this child and their family. Be their strength.',
    createdAt: '2026-02-25T16:30:00Z',
  },
  {
    id: 'comment-21',
    prayerId: 'prayer-6',
    userId: 'user-3',
    authorName: 'Emily',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user3',
    content: '@Rachel You are such a caring teacher. Praying for your student.',
    createdAt: '2026-02-24T10:00:00Z',
  },

  // prayer-7 (Michael's new job - 2 comments)
  {
    id: 'comment-22',
    prayerId: 'prayer-7',
    userId: 'user-2',
    authorName: 'David',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user2',
    content: 'You will do great! Praying for confidence and favor.',
    createdAt: '2026-02-25T15:00:00Z',
  },
  {
    id: 'comment-23',
    prayerId: 'prayer-7',
    userId: 'user-5',
    authorName: 'Rachel',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user5',
    content: 'New beginnings are exciting! God has great plans for you.',
    createdAt: '2026-02-25T12:00:00Z',
  },

  // prayer-8 (Grace's husband - 10 comments showing a few)
  {
    id: 'comment-24',
    prayerId: 'prayer-8',
    userId: 'user-1',
    authorName: 'Sarah',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user1',
    content: '@Grace My family went through the same thing. God will provide. Philippians 4:19.',
    createdAt: '2026-02-25T12:00:00Z',
  },
  {
    id: 'comment-25',
    prayerId: 'prayer-8',
    userId: 'user-4',
    authorName: 'James',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user4',
    content: 'Praying for provision and peace. God has not forgotten you.',
    createdAt: '2026-02-24T08:00:00Z',
  },

  // prayer-9 (Daniel's disconnection - 4 comments)
  {
    id: 'comment-26',
    prayerId: 'prayer-9',
    userId: 'user-4',
    authorName: 'James',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user4',
    content: 'Spiritual dry seasons happen to everyone. Keep seeking Him. He is closer than you think.',
    createdAt: '2026-02-25T09:00:00Z',
  },
  {
    id: 'comment-27',
    prayerId: 'prayer-9',
    userId: 'user-3',
    authorName: 'Emily',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user3',
    content: '@Daniel I have been there. Sometimes silence is where God does His deepest work. Praying for you.',
    createdAt: '2026-02-25T07:00:00Z',
  },

  // prayer-10 (Maria's gratitude - 2 comments)
  {
    id: 'comment-28',
    prayerId: 'prayer-10',
    userId: 'user-5',
    authorName: 'Rachel',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user5',
    content: 'What a beautiful heart you have, Maria. Blessings to you and your grandchildren!',
    createdAt: '2026-02-24T16:00:00Z',
  },

  // prayer-11 (Anonymous marriage - 3 comments)
  {
    id: 'comment-29',
    prayerId: 'prayer-11',
    userId: 'user-9',
    authorName: 'Maria',
    authorAvatarUrl: null,
    content: 'Marriage is worth fighting for. Praying God restores what feels broken.',
    createdAt: '2026-02-24T11:00:00Z',
  },

  // prayer-15 (Emily's roommate - 4 comments)
  {
    id: 'comment-30',
    prayerId: 'prayer-15',
    userId: 'user-1',
    authorName: 'Sarah',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user1',
    content: '@Emily Just be present. Sometimes the best witness is a faithful friend.',
    createdAt: '2026-02-20T06:00:00Z',
  },
  {
    id: 'comment-31',
    prayerId: 'prayer-15',
    userId: 'user-4',
    authorName: 'James',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user4',
    content: 'Praying for open doors and open hearts.',
    createdAt: '2026-02-19T22:00:00Z',
  },

  // prayer-16 (Grace's husband answered - 7 comments showing a few)
  {
    id: 'comment-32',
    prayerId: 'prayer-16',
    userId: 'user-2',
    authorName: 'David',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user2',
    content: 'God is so good! Rejoicing with you!',
    createdAt: '2026-02-18T09:00:00Z',
  },

  // prayer-18 (Michael's baptism - 11 comments showing a few)
  {
    id: 'comment-33',
    prayerId: 'prayer-18',
    userId: 'user-1',
    authorName: 'Sarah',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user1',
    content: '@Michael Welcome to the family! This is the best news!',
    createdAt: '2026-02-14T20:00:00Z',
  },
  {
    id: 'comment-34',
    prayerId: 'prayer-18',
    userId: 'user-4',
    authorName: 'James',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user4',
    content: 'The angels are celebrating with you! What a journey. Praise God.',
    createdAt: '2026-02-11T10:00:00Z',
  },
  {
    id: 'comment-35',
    prayerId: 'prayer-18',
    userId: 'user-7',
    authorName: 'Grace',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=user7',
    content: 'Tears of joy reading this. God changes lives!',
    createdAt: '2026-02-10T20:00:00Z',
  },
]

// --- Mock Reactions (for mock logged-in user, keyed by prayerId) ---

const MOCK_REACTIONS: Record<string, PrayerReaction> = {
  'prayer-1': { prayerId: 'prayer-1', isPraying: true, isBookmarked: true },
  'prayer-3': { prayerId: 'prayer-3', isPraying: true, isBookmarked: false },
  'prayer-5': { prayerId: 'prayer-5', isPraying: true, isBookmarked: true },
  'prayer-8': { prayerId: 'prayer-8', isPraying: false, isBookmarked: false },
  'prayer-12': { prayerId: 'prayer-12', isPraying: true, isBookmarked: true },
  'prayer-18': { prayerId: 'prayer-18', isPraying: true, isBookmarked: false },
}

// --- Mock current user (for dashboard testing) ---

export const MOCK_CURRENT_USER: PrayerWallUser = {
  id: 'user-1',
  firstName: 'Sarah',
  lastName: 'Johnson',
  avatarUrl: 'https://i.pravatar.cc/150?u=user1',
  bio: 'Wife, mother, and believer. Finding peace in prayer and gratitude every day.',
  joinedDate: '2025-09-15T00:00:00Z',
}

// --- Helper functions (return fresh copies) ---

export function getMockPrayers(): PrayerRequest[] {
  return [...MOCK_PRAYERS]
}

export function getMockComments(prayerId: string): PrayerComment[] {
  return MOCK_COMMENTS.filter((c) => c.prayerId === prayerId).map((c) => ({ ...c }))
}

export function getMockAllComments(): PrayerComment[] {
  return [...MOCK_COMMENTS]
}

export function getMockUser(userId: string): PrayerWallUser | undefined {
  return MOCK_USERS.find((u) => u.id === userId)
}

export function getMockUsers(): PrayerWallUser[] {
  return [...MOCK_USERS]
}

export function getMockReactions(): Record<string, PrayerReaction> {
  return { ...MOCK_REACTIONS }
}

export function getMockUserByName(firstName: string): PrayerWallUser | undefined {
  return MOCK_USERS.find((u) => u.firstName.toLowerCase() === firstName.toLowerCase())
}
