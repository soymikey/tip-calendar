import { useState } from "react"
import { Alert, ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { SettingsGroup, SettingsRow } from "@/components/SettingsRow"
import { StackHeader } from "@/components/StackHeader"
import { dataSizeLabel, exportCsv, exportJson, parseBackupJson } from "@/features/backup/backup"
import { pickJsonText, shareTextFile } from "@/features/backup/shareBackup"
import { useAppState } from "@/state/AppStateContext"

export default function DataBackupScreen() {
  const { state, updateState } = useAppState()
  const [busy, setBusy] = useState(false)

  async function exportFile(kind: "csv" | "json") {
    if (busy) {
      return
    }
    setBusy(true)
    try {
      if (kind === "csv") {
        await shareTextFile("tips-calendar.csv", exportCsv(state), "text/csv")
        return
      }
      await shareTextFile("tips-calendar.json", exportJson(state), "application/json")
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
        "This will replace every restaurant and shift on this iPhone with the backup. This cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Replace Data",
            style: "destructive",
            onPress: () => {
              void updateState(() => next)
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

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
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
      </ScrollView>
    </SafeAreaView>
  )
}
