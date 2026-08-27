import { Redirect, router, useLocalSearchParams } from "expo-router"
import { useState } from "react"

import { AnalyticsEvent, shiftSavedParams, track } from "@/features/analytics/track"
import { RecordShiftForm } from "@/features/shift/RecordShiftForm"
import { fromShift, replaceShift, restaurantFromShift, toUpdatedShift } from "@/features/shift/shiftDraft"
import { useAppState } from "@/state/AppStateContext"

export default function EditShiftScreen() {
  const { state, updateState } = useAppState()
  const [saving, setSaving] = useState(false)
  const rawId = useLocalSearchParams<{ id?: string | string[] }>().id
  const shiftId = decodeURIComponent(Array.isArray(rawId) ? (rawId[0] ?? "") : (rawId ?? ""))
  const shift = state.shifts.find((item) => item.id === shiftId)
  const [restaurantId, setRestaurantId] = useState(shift?.restaurantId)
  const liveRestaurant = shift
    ? (state.restaurants.find((item) => item.id === restaurantId) ??
      state.restaurants.find((item) => item.id === shift.restaurantId))
    : undefined

  if (!shift) {
    return <Redirect href="/(tabs)" />
  }

  const restaurant = liveRestaurant ?? restaurantFromShift(shift)

  return (
    <RecordShiftForm
      key={shift.id}
      mode="edit"
      localDate={shift.localDate}
      restaurant={restaurant}
      restaurants={state.restaurants}
      initialDraft={fromShift(shift, restaurant)}
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
          const next = toUpdatedShift(draft, liveRestaurant, shift, new Date().toISOString())
          await updateState((current) => ({
            ...current,
            shifts: replaceShift(current.shifts, next),
          }))
          await track(AnalyticsEvent.shiftSaved, shiftSavedParams(true))
          router.back()
        } finally {
          setSaving(false)
        }
      }}
    />
  )
}
