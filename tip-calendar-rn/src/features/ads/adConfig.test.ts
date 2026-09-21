const mockSetDefaults = jest.fn().mockResolvedValue(undefined)
const mockSetConfigSettings = jest.fn().mockResolvedValue(undefined)
const mockFetchAndActivate = jest.fn().mockResolvedValue(true)
const mockAsBoolean = jest.fn(() => false)
const mockGetValue = jest.fn(() => ({ asBoolean: mockAsBoolean }))

jest.mock("@react-native-firebase/remote-config", () => ({
  default: () => ({
    setDefaults: mockSetDefaults,
    setConfigSettings: mockSetConfigSettings,
    fetchAndActivate: mockFetchAndActivate,
    getValue: mockGetValue,
  }),
}))

// eslint-disable-next-line import/first
import { loadShowAd, resetAdConfigForTests } from "./adConfig"

describe("loadShowAd", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetAdConfigForTests()
    mockAsBoolean.mockReturnValue(false)
    mockFetchAndActivate.mockResolvedValue(true)
  })

  it("defaults to disabled", async () => {
    await expect(loadShowAd()).resolves.toBe(false)
    expect(mockSetDefaults).toHaveBeenCalledWith({ showAd: false })
  })

  it("returns the remote boolean when enabled", async () => {
    mockAsBoolean.mockReturnValue(true)
    await expect(loadShowAd()).resolves.toBe(true)
  })

  it("falls back to disabled when fetching fails", async () => {
    mockFetchAndActivate.mockRejectedValue(new Error("offline"))
    await expect(loadShowAd()).resolves.toBe(false)
  })

  it("fetches only once for concurrent consumers", async () => {
    await Promise.all([loadShowAd(), loadShowAd()])
    expect(mockFetchAndActivate).toHaveBeenCalledTimes(1)
  })
})
