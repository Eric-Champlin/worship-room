import type { LeaderboardEntry } from '@/types/dashboard';

/**
 * 50 mock global leaderboard users.
 * Distribution:
 * - Top 5: 150-170 weekly pts
 * - Middle 20: 60-100 weekly pts
 * - Bottom 25: 10-40 weekly pts
 * Level distribution weighted lower (~20 Seedlings, ~12 Sprouts, ~8 Blooming, ~5 Flourishing, ~3 Oak, ~2 Lighthouse)
 * Badge counts 1-20, loosely correlated with level.
 * Current user is NOT in this list.
 */
export const MOCK_GLOBAL_LEADERBOARD: LeaderboardEntry[] = [
  // Top 5 (150-170 weekly pts)
  { id: 'gl-01', displayName: 'Alex T.', weeklyPoints: 170, totalPoints: 5200, level: 5, levelName: 'Oak', badgeCount: 18 },
  { id: 'gl-02', displayName: 'Priya K.', weeklyPoints: 168, totalPoints: 11500, level: 6, levelName: 'Lighthouse', badgeCount: 20 },
  { id: 'gl-03', displayName: 'Samuel O.', weeklyPoints: 165, totalPoints: 4800, level: 5, levelName: 'Oak', badgeCount: 16 },
  { id: 'gl-04', displayName: 'Mei L.', weeklyPoints: 158, totalPoints: 2800, level: 4, levelName: 'Flourishing', badgeCount: 14 },
  { id: 'gl-05', displayName: 'Carlos R.', weeklyPoints: 152, totalPoints: 12000, level: 6, levelName: 'Lighthouse', badgeCount: 19 },

  // Middle 20 (60-100 weekly pts)
  { id: 'gl-06', displayName: 'Nadia B.', weeklyPoints: 100, totalPoints: 2200, level: 4, levelName: 'Flourishing', badgeCount: 12 },
  { id: 'gl-07', displayName: 'Ethan W.', weeklyPoints: 98, totalPoints: 1800, level: 4, levelName: 'Flourishing', badgeCount: 11 },
  { id: 'gl-08', displayName: 'Fatima H.', weeklyPoints: 95, totalPoints: 980, level: 3, levelName: 'Blooming', badgeCount: 9 },
  { id: 'gl-09', displayName: 'Liam D.', weeklyPoints: 92, totalPoints: 750, level: 3, levelName: 'Blooming', badgeCount: 8 },
  { id: 'gl-10', displayName: 'Aisha M.', weeklyPoints: 90, totalPoints: 620, level: 3, levelName: 'Blooming', badgeCount: 7 },
  { id: 'gl-11', displayName: 'Noah P.', weeklyPoints: 88, totalPoints: 1600, level: 4, levelName: 'Flourishing', badgeCount: 10 },
  { id: 'gl-12', displayName: 'Sofia C.', weeklyPoints: 85, totalPoints: 560, level: 3, levelName: 'Blooming', badgeCount: 7 },
  { id: 'gl-13', displayName: 'Marcus J.', weeklyPoints: 82, totalPoints: 480, level: 2, levelName: 'Sprout', badgeCount: 6 },
  { id: 'gl-14', displayName: 'Elena V.', weeklyPoints: 80, totalPoints: 350, level: 2, levelName: 'Sprout', badgeCount: 5 },
  { id: 'gl-15', displayName: 'David N.', weeklyPoints: 78, totalPoints: 700, level: 3, levelName: 'Blooming', badgeCount: 8 },
  { id: 'gl-16', displayName: 'Amara S.', weeklyPoints: 76, totalPoints: 420, level: 2, levelName: 'Sprout', badgeCount: 5 },
  { id: 'gl-17', displayName: 'Isaiah G.', weeklyPoints: 74, totalPoints: 310, level: 2, levelName: 'Sprout', badgeCount: 4 },
  { id: 'gl-18', displayName: 'Leah F.', weeklyPoints: 72, totalPoints: 580, level: 3, levelName: 'Blooming', badgeCount: 6 },
  { id: 'gl-19', displayName: 'Omar A.', weeklyPoints: 70, totalPoints: 280, level: 2, levelName: 'Sprout', badgeCount: 4 },
  { id: 'gl-20', displayName: 'Ruth E.', weeklyPoints: 68, totalPoints: 240, level: 2, levelName: 'Sprout', badgeCount: 4 },
  { id: 'gl-21', displayName: 'Gabriel I.', weeklyPoints: 66, totalPoints: 380, level: 2, levelName: 'Sprout', badgeCount: 5 },
  { id: 'gl-22', displayName: 'Yuna P.', weeklyPoints: 64, totalPoints: 190, level: 2, levelName: 'Sprout', badgeCount: 3 },
  { id: 'gl-23', displayName: 'Josiah K.', weeklyPoints: 62, totalPoints: 520, level: 3, levelName: 'Blooming', badgeCount: 6 },
  { id: 'gl-24', displayName: 'Hannah Z.', weeklyPoints: 60, totalPoints: 150, level: 2, levelName: 'Sprout', badgeCount: 3 },
  { id: 'gl-25', displayName: 'Tobias M.', weeklyPoints: 60, totalPoints: 130, level: 2, levelName: 'Sprout', badgeCount: 3 },

  // Bottom 25 (10-40 weekly pts)
  { id: 'gl-26', displayName: 'Chloe A.', weeklyPoints: 40, totalPoints: 450, level: 2, levelName: 'Sprout', badgeCount: 5 },
  { id: 'gl-27', displayName: 'Malik W.', weeklyPoints: 38, totalPoints: 90, level: 1, levelName: 'Seedling', badgeCount: 2 },
  { id: 'gl-28', displayName: 'Esther D.', weeklyPoints: 36, totalPoints: 85, level: 1, levelName: 'Seedling', badgeCount: 2 },
  { id: 'gl-29', displayName: 'Kai T.', weeklyPoints: 35, totalPoints: 75, level: 1, levelName: 'Seedling', badgeCount: 2 },
  { id: 'gl-30', displayName: 'Lydia R.', weeklyPoints: 34, totalPoints: 95, level: 1, levelName: 'Seedling', badgeCount: 2 },
  { id: 'gl-31', displayName: 'Micah B.', weeklyPoints: 32, totalPoints: 70, level: 1, levelName: 'Seedling', badgeCount: 1 },
  { id: 'gl-32', displayName: 'Zara J.', weeklyPoints: 30, totalPoints: 65, level: 1, levelName: 'Seedling', badgeCount: 1 },
  { id: 'gl-33', displayName: 'Caleb S.', weeklyPoints: 28, totalPoints: 55, level: 1, levelName: 'Seedling', badgeCount: 1 },
  { id: 'gl-34', displayName: 'Naomi G.', weeklyPoints: 27, totalPoints: 80, level: 1, levelName: 'Seedling', badgeCount: 2 },
  { id: 'gl-35', displayName: 'Isaac F.', weeklyPoints: 26, totalPoints: 50, level: 1, levelName: 'Seedling', badgeCount: 1 },
  { id: 'gl-36', displayName: 'Abigail N.', weeklyPoints: 25, totalPoints: 45, level: 1, levelName: 'Seedling', badgeCount: 1 },
  { id: 'gl-37', displayName: 'Elijah H.', weeklyPoints: 24, totalPoints: 60, level: 1, levelName: 'Seedling', badgeCount: 1 },
  { id: 'gl-38', displayName: 'Tara C.', weeklyPoints: 22, totalPoints: 40, level: 1, levelName: 'Seedling', badgeCount: 1 },
  { id: 'gl-39', displayName: 'Joel V.', weeklyPoints: 21, totalPoints: 35, level: 1, levelName: 'Seedling', badgeCount: 1 },
  { id: 'gl-40', displayName: 'Miriam E.', weeklyPoints: 20, totalPoints: 55, level: 1, levelName: 'Seedling', badgeCount: 1 },
  { id: 'gl-41', displayName: 'Seth L.', weeklyPoints: 19, totalPoints: 30, level: 1, levelName: 'Seedling', badgeCount: 1 },
  { id: 'gl-42', displayName: 'Dina O.', weeklyPoints: 18, totalPoints: 42, level: 1, levelName: 'Seedling', badgeCount: 1 },
  { id: 'gl-43', displayName: 'Aaron K.', weeklyPoints: 17, totalPoints: 28, level: 1, levelName: 'Seedling', badgeCount: 1 },
  { id: 'gl-44', displayName: 'Clara P.', weeklyPoints: 16, totalPoints: 38, level: 1, levelName: 'Seedling', badgeCount: 1 },
  { id: 'gl-45', displayName: 'Jonah D.', weeklyPoints: 15, totalPoints: 25, level: 1, levelName: 'Seedling', badgeCount: 1 },
  { id: 'gl-46', displayName: 'Bethany S.', weeklyPoints: 14, totalPoints: 22, level: 1, levelName: 'Seedling', badgeCount: 1 },
  { id: 'gl-47', displayName: 'Reuben M.', weeklyPoints: 13, totalPoints: 20, level: 1, levelName: 'Seedling', badgeCount: 1 },
  { id: 'gl-48', displayName: 'Eve T.', weeklyPoints: 12, totalPoints: 18, level: 1, levelName: 'Seedling', badgeCount: 1 },
  { id: 'gl-49', displayName: 'Silas W.', weeklyPoints: 11, totalPoints: 15, level: 1, levelName: 'Seedling', badgeCount: 1 },
  { id: 'gl-50', displayName: 'Ada J.', weeklyPoints: 10, totalPoints: 12, level: 1, levelName: 'Seedling', badgeCount: 1 },
];
