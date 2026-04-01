import { useContext } from 'react'
import { InstallPromptContext, type InstallPromptContextValue } from '@/contexts/InstallPromptContext'

const NOOP_CONTEXT: InstallPromptContextValue = {
  isInstallable: false,
  isInstalled: false,
  isIOS: false,
  visitCount: 0,
  isDismissed: false,
  isDashboardCardShown: false,
  promptInstall: async () => null,
  dismissBanner: () => {},
  markDashboardCardShown: () => {},
}

export function useInstallPrompt(): InstallPromptContextValue {
  const ctx = useContext(InstallPromptContext)
  return ctx ?? NOOP_CONTEXT
}
