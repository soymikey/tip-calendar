const mockFetchAndActivate = jest.fn().mockResolvedValue(true)
const mockAsBoolean = jest.fn(() => false)
const mockGetSource = jest.fn(() => "remote")
const mockGetValue = jest.fn(() => ({ asBoolean: mockAsBoolean, getSource: mockGetSource }))
const mockConfig = {
  defaultConfig: {} as Record<string, string | number | boolean>,
  settings: { minimumFetchIntervalMillis: 43_200_000, fetchTimeoutMillis: 60_000 },
}

jest.mock("@react-native-firebase/remote-config", () => ({
  getRemoteConfig: () => mockConfig,
  fetchAndActivate: mockFetchAndActivate,
  getValue: mockGetValue,
}))

// eslint-disable-next-line import/first
import { loadShowAd, resetAdConfigForTests } from "./adConfig"

describe("loadShowAd", () => {
  const logSpy = jest.spyOn(console, "info").mockImplementation(() => undefined)

  beforeEach(() => {
    jest.clearAllMocks()
    resetAdConfigForTests()
    mockAsBoolean.mockReturnValue(false)
    mockFetchAndActivate.mockResolvedValue(true)
    mockGetSource.mockReturnValue("remote")
    mockConfig.defaultConfig = {}
    mockConfig.settings = { minimumFetchIntervalMillis: 43_200_000, fetchTimeoutMillis: 60_000 }
  })

  it("defaults to disabled", async () => {
    await expect(loadShowAd()).resolves.toBe(false)
    expect(mockConfig.defaultConfig).toEqual({ showAd: false })
    expect(mockConfig.settings.minimumFetchIntervalMillis).toBe(__DEV__ ? 0 : 43_200_000)
  })

  it("returns the remote boolean when enabled", async () => {
    mockAsBoolean.mockReturnValue(true)
    await expect(loadShowAd()).resolves.toBe(true)
    expect(mockFetchAndActivate).toHaveBeenCalledWith(mockConfig)
    expect(mockGetValue).toHaveBeenCalledWith(mockConfig, "showAd")
    expect(logSpy).toHaveBeenCalledWith("[Remote Config]", {
      key: "showAd",
      value: true,
      source: "remote",
    })
  })

  it("falls back to disabled when fetching fails", async () => {
    mockFetchAndActivate.mockRejectedValue(new Error("offline"))
    await expect(loadShowAd()).resolves.toBe(false)
    expect(logSpy).toHaveBeenCalledWith("[Remote Config]", {
      key: "showAd",
      value: false,
      source: "fallback",
      error: "offline",
    })
  })

  it("fetches only once for concurrent consumers", async () => {
    await Promise.all([loadShowAd(), loadShowAd()])
    expect(mockFetchAndActivate).toHaveBeenCalledTimes(1)
  })
})
