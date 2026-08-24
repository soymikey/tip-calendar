import * as DocumentPicker from "expo-document-picker"
import * as FileSystem from "expo-file-system/legacy"
import * as Sharing from "expo-sharing"

export async function shareTextFile(filename: string, contents: string, mimeType: string) {
  const directory = FileSystem.cacheDirectory
  if (!directory) {
    throw new Error("Sharing is not available on this device.")
  }
  const uri = `${directory}${filename}`
  await FileSystem.writeAsStringAsync(uri, contents)
  const available = await Sharing.isAvailableAsync()
  if (!available) {
    throw new Error("Sharing is not available on this device.")
  }
  await Sharing.shareAsync(uri, { mimeType, dialogTitle: filename })
}

export async function pickJsonText(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/json",
    copyToCacheDirectory: true,
  })
  if (result.canceled) {
    return null
  }
  const uri = result.assets[0]?.uri
  if (!uri) {
    throw new Error("Couldn't read that file.")
  }
  return FileSystem.readAsStringAsync(uri)
}
