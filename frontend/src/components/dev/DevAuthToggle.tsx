import { useAuth } from '@/hooks/useAuth'

export function DevAuthToggle() {
  const { isAuthenticated, login, logout } = useAuth()

  return (
    <button
      type="button"
      onClick={() => (isAuthenticated ? logout() : login('Eric'))}
      className="fixed bottom-4 right-4 z-50 min-h-[36px] rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white/60 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white/90"
    >
      {isAuthenticated ? 'Simulate Logout' : 'Simulate Login'}
    </button>
  )
}
