import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"

import { createLocalStore } from "../storage/localStore"
import { emptyState, type AppState } from "../storage/types"
import { needsOnboarding } from "./session"

const store = createLocalStore()

type AppStateContextValue = {
  state: AppState
  ready: boolean
  startedOnboarding: boolean
  updateState: (updater: (current: AppState) => AppState) => Promise<void>
}

const AppStateContext = createContext<AppStateContextValue | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(emptyState)
  const [ready, setReady] = useState(false)
  const [startedOnboarding, setStartedOnboarding] = useState(false)

  useEffect(() => {
    void store.load().then((loaded) => {
      setStartedOnboarding(needsOnboarding(loaded))
      setState(loaded)
      setReady(true)
    })
  }, [])

  const updateState = useCallback(async (updater: (current: AppState) => AppState) => {
    const current = await store.load()
    const next = updater(current)
    await store.save(next)
    setState(next)
  }, [])

  return (
    <AppStateContext.Provider value={{ state, ready, startedOnboarding, updateState }}>
      {children}
    </AppStateContext.Provider>
  )
}

export function useAppState(): AppStateContextValue {
  const value = useContext(AppStateContext)
  if (!value) {
    throw new Error("useAppState must be used inside AppStateProvider")
  }
  return value
}
