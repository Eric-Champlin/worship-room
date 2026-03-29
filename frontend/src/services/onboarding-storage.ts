const ONBOARDING_KEY = 'wr_onboarding_complete'

export function isOnboardingComplete(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === 'true'
  } catch (_e) {
    return false
  }
}

export function setOnboardingComplete(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, 'true')
  } catch (_e) {
    // localStorage unavailable — wizard will show again next visit (acceptable)
  }
}
