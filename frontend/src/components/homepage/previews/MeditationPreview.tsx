import { CloudRain, Waves, TreePine, Flame, Moon, Droplets } from 'lucide-react'
import { cn } from '@/lib/utils'

const SOUNDS = [
  { icon: CloudRain, label: 'Rain', active: true },
  { icon: Waves, label: 'Ocean', active: true },
  { icon: TreePine, label: 'Forest', active: false },
  { icon: Flame, label: 'Fireplace', active: false },
  { icon: Moon, label: 'Night', active: false },
  { icon: Droplets, label: 'Stream', active: false },
]

export function MeditationPreview() {
  return (
    <div className="rounded-xl bg-white/[0.03] p-4 sm:p-5 space-y-3">
      {/* Sound grid */}
      <div className="grid grid-cols-3 gap-2">
        {SOUNDS.map(({ icon: Icon, label, active }) => (
          <div
            key={label}
            className={cn(
              'bg-white/[0.04] rounded-xl p-3 text-center',
              active && 'bg-white/[0.08] border border-purple-500/30'
            )}
          >
            <Icon
              className={cn(
                'w-5 h-5 mx-auto mb-1',
                active ? 'text-purple-400' : 'text-white/40'
              )}
            />
            <span className="text-white/50 text-[11px]">{label}</span>
          </div>
        ))}
      </div>

      {/* Volume bars */}
      <div className="space-y-1.5">
        <div className="h-1.5 rounded-full bg-purple-500/40" style={{ width: '70%' }} />
        <div className="h-1.5 rounded-full bg-purple-500/40" style={{ width: '45%' }} />
      </div>
    </div>
  )
}
