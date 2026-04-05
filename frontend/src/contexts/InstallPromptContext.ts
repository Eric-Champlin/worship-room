import { createContext } from 'react'

export interface InstallPromptContextValue {
  isInstallable: boolean
  isInstalled: boolean
  isIOS: boolean
  visitCount: number
  isDismissed: boolean
  isDashboardCardShown: boolean
  promptInstall: () => Promise<'accepted' | 'dismissed' | null>
  dismissBanner: () => void
  markDashboardCardShown: () => void
}

export const InstallPromptContext = createContext<InstallPromptContextValue | null>(null)
