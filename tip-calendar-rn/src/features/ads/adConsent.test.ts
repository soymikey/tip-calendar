const mockGatherConsent = jest.fn()
const mockShowPrivacyOptionsForm = jest.fn()

jest.mock("react-native-google-mobile-ads", () => ({
  AdsConsent: {
    gatherConsent: mockGatherConsent,
    showPrivacyOptionsForm: mockShowPrivacyOptionsForm,
  },
  AdsConsentPrivacyOptionsRequirementStatus: { REQUIRED: "REQUIRED" },
}))

// eslint-disable-next-line import/first
import { canPreviewTestAdWithoutForm, requestAdConsent, showAdPrivacyOptions } from "./adConsent"

describe("ad consent", () => {
  const logSpy = jest.spyOn(console, "info").mockImplementation(() => undefined)

  beforeEach(() => {
    jest.clearAllMocks()
    mockGatherConsent.mockResolvedValue({
      canRequestAds: true,
      privacyOptionsRequirementStatus: "REQUIRED",
    })
    mockShowPrivacyOptionsForm.mockResolvedValue(undefined)
  })

  it("maps the UMP consent result", async () => {
    await expect(requestAdConsent()).resolves.toEqual({
      canRequestAds: true,
      privacyOptionsRequired: true,
    })
    expect(logSpy).toHaveBeenCalledWith("[Ads] consent", {
      canRequestAds: true,
      privacyOptionsRequired: true,
    })
  })

  it("denies ad requests when UMP fails", async () => {
    mockGatherConsent.mockRejectedValue(new Error("unavailable"))
    await expect(requestAdConsent()).resolves.toEqual({
      canRequestAds: false,
      privacyOptionsRequired: false,
    })
    expect(logSpy).toHaveBeenCalledWith("[Ads] consent failed", { error: "unavailable" })
  })

  it("allows only a debug test ad when the AdMob form is missing", async () => {
    const message = "Failed to read publisher's account configuration; no form(s) configured for the input app ID."
    expect(canPreviewTestAdWithoutForm(true, "development", message)).toBe(true)
    expect(canPreviewTestAdWithoutForm(false, "development", message)).toBe(false)
    expect(canPreviewTestAdWithoutForm(true, "production", message)).toBe(false)
    expect(canPreviewTestAdWithoutForm(true, "development", "network unavailable")).toBe(false)

    mockGatherConsent.mockRejectedValue(new Error(message))
    await expect(requestAdConsent()).resolves.toEqual({
      canRequestAds: __DEV__,
      privacyOptionsRequired: false,
    })
  })

  it("opens the UMP privacy options form", async () => {
    await showAdPrivacyOptions()
    expect(mockShowPrivacyOptionsForm).toHaveBeenCalledTimes(1)
  })
})
