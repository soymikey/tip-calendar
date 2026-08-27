import { Redirect, router, useLocalSearchParams } from "expo-router"
import { useState } from "react"

import { AnalyticsEvent, shiftSavedParams, track } from "@/features/analytics/track"
import { NoRestaurantShift } from "@/features/shift/NoRestaurantShift"
import { RecordShiftForm } from "@/features/shift/RecordShiftForm"
import { toShift } from "@/features/shift/shiftDraft"
import { useAppState } from "@/state/AppStateContext"

export default function NewShiftScreen() {
  const { state, updateState } = useAppState()
  const [saving, setSaving] = useState(false)
  const rawDate = useLocalSearchParams<{ date?: string | string[] }>().date
  const localDate = Array.isArray(rawDate) ? rawDate[0] : rawDate
  const defaultId =
    state.preferences.defaultRestaurantId &&
    state.restaurants.some((item) => item.id === state.preferences.defaultRestaurantId)
      ? state.preferences.defaultRestaurantId
      : state.restaurants[0]?.id
  const [restaurantId, setRestaurantId] = useState(defaultId)
  const restaurant =
    state.restaurants.find((item) => item.id === restaurantId) ?? state.restaurants[0]

  if (!localDate) {
    return <Redirect href="/(tabs)" />
  }

  if (!restaurant) {
    return (
      <NoRestaurantShift
        localDate={localDate}
        onCancel={() => router.back()}
        onAddRestaurant={() => router.push("/onboarding")}
      />
    )
  }

  return (
    <RecordShiftForm
      localDate={localDate}
      restaurant={restaurant}
      restaurants={state.restaurants}
      saving={saving}
      timeFormat={state.preferences.timeFormat}
      onRestaurantChange={(next) => setRestaurantId(next.id)}
      onCancel={() => router.back()}
      onSave={async (draft) => {
        if (saving) {
          return
        }
        setSaving(true)
        try {
          const shift = toShift(draft, restaurant, new Date().toISOString())
          await updateState((current) => ({
            ...current,
            shifts: [...current.shifts, shift],
          }))
          await track(AnalyticsEvent.shiftSaved, shiftSavedParams(false))
          router.back()
        } finally {
          setSaving(false)
        }
      }}
    />
  )
}
