import { useNavigate } from 'react-router-dom'
import { useToastSafe } from '@/components/ui/Toast'
import { clearDashboardLayout } from '@/services/dashboard-layout-storage'

export function DashboardSection() {
  const navigate = useNavigate()
  const { showToast } = useToastSafe()

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6">
      <h2 className="mb-6 text-base font-semibold text-white md:text-lg">Dashboard</h2>
      <div className="space-y-4">
        <button
          onClick={() => navigate('/?customize=true')}
          className="flex w-full min-h-[44px] items-center justify-between rounded-lg bg-white/[0.06] p-4 text-sm text-white hover:bg-white/[0.08] transition-colors"
        >
          <span>Dashboard Layout</span>
          <span className="text-white/40">Customize →</span>
        </button>

        <button
          onClick={() => {
            clearDashboardLayout()
            showToast('Dashboard layout reset to default', 'success')
          }}
          className="w-full min-h-[44px] rounded-lg bg-white/[0.06] p-4 text-left text-sm text-white/60 hover:bg-white/[0.08] hover:text-white transition-colors"
        >
          Reset Dashboard Layout
        </button>
      </div>
    </div>
  )
}
