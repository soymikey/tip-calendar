import { Redirect, router, useLocalSearchParams } from "expo-router"
import { useState } from "react"

import { RecordShiftForm } from "@/features/shift/RecordShiftForm"
import { fromShift, replaceShift, toUpdatedShift } from "@/features/shift/shiftDraft"
import { useAppState } from "@/state/AppStateContext"

export default function EditShiftScreen() {
  const { state, updateState } = useAppState()
  const [saving, setSaving] = useState(false)
  const rawId = useLocalSearchParams<{ id?: string | string[] }>().id
  const shiftId = decodeURIComponent(Array.isArray(rawId) ? (rawId[0] ?? "") : (rawId ?? ""))
  const shift = state.shifts.find((item) => item.id === shiftId)
  const defaultRestaurant = shift
    ? state.restaurants.find((item) => item.id === shift.restaurantId)
    : undefined
  const [restaurantId, setRestaurantId] = useState(defaultRestaurant?.id)
  const restaurant =
    state.restaurants.find((item) => item.id === restaurantId) ?? defaultRestaurant

  if (!shift || !restaurant) {
    return <Redirect href="/(tabs)" />
  }

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
          const next = toUpdatedShift(draft, restaurant, shift, new Date().toISOString())
          await updateState((current) => ({
            ...current,
            shifts: replaceShift(current.shifts, next),
          }))
          router.back()
        } finally {
          setSaving(false)
        }
      }}
    />
  )
}
