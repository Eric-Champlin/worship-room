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
  // BB-39 fields
  sessionPageCount: number
  isSessionDismissed: boolean
  dismissSession: () => void
  shouldShowPrompt: (pathname: string) => boolean
}

export const InstallPromptContext = createContext<InstallPromptContextValue | null>(null)
