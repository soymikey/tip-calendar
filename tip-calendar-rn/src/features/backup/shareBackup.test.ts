import * as DocumentPicker from "expo-document-picker"
import * as FileSystem from "expo-file-system/legacy"
import * as Sharing from "expo-sharing"

import { pickJsonText, shareTextFile } from "./shareBackup"

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: jest.fn(),
}))

jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///cache/",
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
}))

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}))

const getDocumentAsync = jest.mocked(DocumentPicker.getDocumentAsync)
const readAsStringAsync = jest.mocked(FileSystem.readAsStringAsync)
const writeAsStringAsync = jest.mocked(FileSystem.writeAsStringAsync)
const isAvailableAsync = jest.mocked(Sharing.isAvailableAsync)
const shareAsync = jest.mocked(Sharing.shareAsync)

describe("shareBackup", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    isAvailableAsync.mockResolvedValue(true)
    writeAsStringAsync.mockResolvedValue(undefined)
    shareAsync.mockResolvedValue(undefined)
  })

  it("writes and shares an exported text file", async () => {
    await shareTextFile("tips-calendar.json", "{\"schemaVersion\":2}", "application/json")

    expect(writeAsStringAsync).toHaveBeenCalledWith(
      "file:///cache/tips-calendar.json",
      "{\"schemaVersion\":2}",
    )
    expect(shareAsync).toHaveBeenCalledWith("file:///cache/tips-calendar.json", {
      dialogTitle: "tips-calendar.json",
      mimeType: "application/json",
    })
  })

  it("rejects export when system sharing is unavailable", async () => {
    isAvailableAsync.mockResolvedValue(false)

    await expect(shareTextFile("tips-calendar.csv", "date\n", "text/csv")).rejects.toThrow(
      "Sharing is not available on this device.",
    )
    expect(shareAsync).not.toHaveBeenCalled()
  })

  it("returns null when the document picker is cancelled", async () => {
    getDocumentAsync.mockResolvedValue({ canceled: true, assets: null })

    await expect(pickJsonText()).resolves.toBeNull()
    expect(readAsStringAsync).not.toHaveBeenCalled()
  })

  it("reads the selected JSON backup file", async () => {
    getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{
        lastModified: 0,
        mimeType: "application/json",
        name: "backup.json",
        uri: "file:///picked/backup.json",
      }],
    })
    readAsStringAsync.mockResolvedValue("{\"schemaVersion\":2}")

    await expect(pickJsonText()).resolves.toBe("{\"schemaVersion\":2}")
    expect(getDocumentAsync).toHaveBeenCalledWith({
      copyToCacheDirectory: true,
      type: "application/json",
    })
    expect(readAsStringAsync).toHaveBeenCalledWith("file:///picked/backup.json")
  })
})
