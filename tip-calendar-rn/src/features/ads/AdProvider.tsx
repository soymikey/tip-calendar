import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react"

import { initializeMobileAds, requestAdConsent, showAdPrivacyOptions } from "./adConsent"
import { loadShowAd } from "./adConfig"
import { isAdEligible } from "./adEligibility"

type AdState = {
  ready: boolean
  showAd: boolean
  canRequestAds: boolean
  privacyOptionsRequired: boolean
}

type AdContextValue = AdState & {
  eligible: boolean
  openPrivacyOptions: () => Promise<void>
}

const initialState: AdState = {
  ready: false,
  showAd: false,
  canRequestAds: false,
  privacyOptionsRequired: false,
}

const AdContext = createContext<AdContextValue | null>(null)

export function AdProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState(initialState)

  useEffect(() => {
    let active = true

    void Promise.all([loadShowAd(), requestAdConsent()]).then(async ([showAd, consent]) => {
      const eligible = isAdEligible(showAd, consent.canRequestAds)
      const initialized = eligible ? await initializeMobileAds() : false
      console.info("[Ads] eligibility", {
        showAd,
        canRequestAds: consent.canRequestAds,
        initialized,
        eligible: eligible && initialized,
      })
      if (active) {
        setState({
          ready: true,
          showAd: initialized ? showAd : false,
          ...consent,
        })
      }
    })

    return () => {
      active = false
    }
  }, [])

  const value = useMemo<AdContextValue>(
    () => ({
      ...state,
      eligible: state.ready && isAdEligible(state.showAd, state.canRequestAds),
      openPrivacyOptions: async () => {
        await showAdPrivacyOptions()
        const consent = await requestAdConsent()
        setState((current) => ({ ...current, ...consent }))
      },
    }),
    [state],
  )

  return <AdContext.Provider value={value}>{children}</AdContext.Provider>
}

export function useAds(): AdContextValue {
  const context = useContext(AdContext)
  if (!context) {
    throw new Error("useAds must be used within AdProvider")
  }
  return context
}
