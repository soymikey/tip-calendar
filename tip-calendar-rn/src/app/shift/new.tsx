import { Redirect, router, useLocalSearchParams } from "expo-router"
import { useState } from "react"

import { RecordShiftForm } from "@/features/shift/RecordShiftForm"
import { toShift } from "@/features/shift/shiftDraft"
import { useAppState } from "@/state/AppStateContext"

export default function NewShiftScreen() {
  const { state, updateState } = useAppState()
  const [saving, setSaving] = useState(false)
  const rawDate = useLocalSearchParams<{ date?: string | string[] }>().date
  const localDate = Array.isArray(rawDate) ? rawDate[0] : rawDate
  const restaurant =
    state.restaurants.find((item) => item.isDefault) ?? state.restaurants[0]

  if (!localDate || !restaurant) {
    return <Redirect href="/(tabs)" />
  }

  return (
    <RecordShiftForm
      localDate={localDate}
      restaurant={restaurant}
      saving={saving}
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
          router.back()
        } finally {
          setSaving(false)
        }
      }}
    />
  )
}
