import { Redirect } from "expo-router"

import { OnboardingFlow } from "@/features/onboarding/OnboardingFlow"
import { useAppState } from "@/state/AppStateContext"
import { needsOnboarding } from "@/state/session"

export default function OnboardingScreen() {
  const { state } = useAppState()
  if (!needsOnboarding(state)) {
    return <Redirect href="/(tabs)" />
  }

  return <OnboardingFlow />
}
