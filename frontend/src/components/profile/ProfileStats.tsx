import type { ProfileData } from '@/hooks/useProfileData'

interface ProfileStatsProps {
  profileData: ProfileData
}

export function ProfileStats({ profileData }: ProfileStatsProps) {
  if (!profileData.statsVisible) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <p className="text-center text-base text-white/40">
          {profileData.privacyMessage || 'This user keeps their stats private'}
        </p>
      </div>
    )
  }

  // Level progress percentage
  let levelProgressText = ''
  if (profileData.totalPoints != null && profileData.pointsToNextLevel != null) {
    const threshold = getLevelThreshold(profileData.currentLevel ?? 1)
    const pointsInLevel = profileData.totalPoints - threshold
    const levelRange = (profileData.pointsToNextLevel ?? 0) + pointsInLevel
    const percent = levelRange > 0 ? Math.round((pointsInLevel / levelRange) * 100) : 100
    levelProgressText = `${percent}% to next`
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard
        value={profileData.totalPoints?.toLocaleString() ?? '0'}
        label="Faith Points"
      />
      <StatCard
        value={profileData.daysActive?.toString() ?? '0'}
        label="Days Active"
      />
      <StatCard
        value={profileData.levelName ?? 'Seedling'}
        label={`Level ${profileData.currentLevel ?? 1}`}
        extra={levelProgressText}
      />
    </div>
  )
}

interface StatCardProps {
  value: string
  label: string
  extra?: string
}

function StatCard({ value, label, extra }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6">
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-sm text-white/50">{label}</p>
      {extra && <p className="mt-1 text-xs text-white/40">{extra}</p>}
    </div>
  )
}

function getLevelThreshold(level: number): number {
  const thresholds: Record<number, number> = { 1: 0, 2: 100, 3: 500, 4: 1500, 5: 4000, 6: 10000 }
  return thresholds[level] ?? 0
}
