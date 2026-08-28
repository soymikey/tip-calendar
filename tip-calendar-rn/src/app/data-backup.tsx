import { router } from "expo-router"
import { useEffect, useRef, useState } from "react"
import { Alert, ScrollView, Text, View } from "react-native"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"

import { HintToast } from "@/components/HintToast"
import { SettingsGroup, SettingsRow } from "@/components/SettingsRow"
import { StackHeader } from "@/components/StackHeader"
import { AnalyticsEvent, track } from "@/features/analytics/track"
import {
  backupSummaryLabel,
  clearedAppState,
  dataSizeLabel,
  exportCsv,
  exportJson,
  importSuccessLabel,
  parseBackupJson,
} from "@/features/backup/backup"
import { pickJsonText, shareTextFile } from "@/features/backup/shareBackup"
import { useAppState } from "@/state/AppStateContext"

const HINT_MS = 2500

export default function DataBackupScreen() {
  const { state, updateState } = useAppState()
  const insets = useSafeAreaInsets()
  const [busy, setBusy] = useState(false)
  const [importHint, setImportHint] = useState<string | null>(null)
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (hintTimer.current) {
        clearTimeout(hintTimer.current)
      }
    }
  }, [])

  function showImportHint(message: string) {
    if (hintTimer.current) {
      clearTimeout(hintTimer.current)
    }
    setImportHint(message)
    hintTimer.current = setTimeout(() => {
      setImportHint(null)
      hintTimer.current = null
    }, HINT_MS)
  }

  async function exportFile(kind: "csv" | "json") {
    if (busy) {
      return
    }
    setBusy(true)
    try {
      if (kind === "csv") {
        await shareTextFile("tips-calendar.csv", exportCsv(state), "text/csv")
        await track(AnalyticsEvent.backupExported, { kind: "csv" })
        return
      }
      await shareTextFile("tips-calendar.json", exportJson(state), "application/json")
      await track(AnalyticsEvent.backupExported, { kind: "json" })
    } catch (error) {
      Alert.alert("Couldn't export", error instanceof Error ? error.message : "Please try again.")
    } finally {
      setBusy(false)
    }
  }

  async function importJson() {
    if (busy) {
      return
    }
    setBusy(true)
    try {
      const raw = await pickJsonText()
      if (raw === null) {
        return
      }
      const next = parseBackupJson(raw)
      Alert.alert(
        "Replace all data?",
        `${backupSummaryLabel(next)} This will replace every restaurant and shift on this iPhone with the backup. This cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Replace Data",
            style: "destructive",
            onPress: () => {
              void replaceWithBackup(next)
            },
          },
        ],
      )
    } catch (error) {
      Alert.alert(
        "Couldn't restore backup",
        error instanceof Error ? error.message : "That file isn't a Tips Calendar backup.",
      )
    } finally {
      setBusy(false)
    }
  }

  async function replaceWithBackup(next: typeof state) {
    if (busy) {
      return
    }
    setBusy(true)
    try {
      await updateState(() => next)
      await track(AnalyticsEvent.backupImported)
      showImportHint(importSuccessLabel(next))
    } catch (error) {
      Alert.alert(
        "Couldn't restore backup",
        error instanceof Error ? error.message : "Please try again.",
      )
    } finally {
      setBusy(false)
    }
  }

  function requestDeleteAll() {
    if (busy) {
      return
    }
    Alert.alert(
      "Delete all data?",
      "This will permanently delete every restaurant, shift, and preference on this iPhone. This cannot be undone. Export a JSON backup first if you want a copy.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: () => {
            void confirmDeleteAll()
          },
        },
      ],
    )
  }

  async function confirmDeleteAll() {
    if (busy) {
      return
    }
    setBusy(true)
    try {
      await updateState(() => clearedAppState())
      await track(AnalyticsEvent.dataDeleted)
      router.replace("/onboarding")
    } catch (error) {
      Alert.alert("Couldn't delete data", error instanceof Error ? error.message : "Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="flex-1">
        <StackHeader title="Data & backup" />
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: 40 }}>
          <SettingsGroup>
            <SettingsRow
              title="Export CSV"
              subtitle="Share a spreadsheet of every shift"
              onPress={() => {
                void exportFile("csv")
              }}
            />
            <SettingsRow
              title="Export JSON"
              subtitle="Full backup of restaurants and shifts"
              onPress={() => {
                void exportFile("json")
              }}
            />
            <SettingsRow
              title="Import JSON"
              subtitle="Replace data on this iPhone with a backup"
              onPress={() => {
                void importJson()
              }}
            />
          </SettingsGroup>

          <View className="gap-2">
            <Text className="px-1 text-[13px] font-semibold uppercase text-[#8E8E93]">Storage</Text>
            <SettingsGroup>
              <SettingsRow title="Total Shifts" subtitle={String(state.shifts.length)} showChevron={false} />
              <SettingsRow title="Data Size" subtitle={dataSizeLabel(state)} showChevron={false} />
              <SettingsRow title="Storage" subtitle="Local (on this iPhone)" showChevron={false} />
            </SettingsGroup>
          </View>

          <SettingsGroup>
            <SettingsRow
              title="Delete all data"
              subtitle="Remove restaurants, shifts, and preferences from this iPhone"
              destructive
              onPress={requestDeleteAll}
            />
          </SettingsGroup>
        </ScrollView>
        {importHint ? (
          <HintToast message={importHint} style={{ bottom: Math.max(12, insets.bottom + 8) }} />
        ) : null}
      </View>
    </SafeAreaView>
  )
}
