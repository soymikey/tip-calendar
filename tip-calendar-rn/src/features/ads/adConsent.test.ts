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
import { requestAdConsent, showAdPrivacyOptions } from "./adConsent"

describe("ad consent", () => {
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
  })

  it("denies ad requests when UMP fails", async () => {
    mockGatherConsent.mockRejectedValue(new Error("unavailable"))
    await expect(requestAdConsent()).resolves.toEqual({
      canRequestAds: false,
      privacyOptionsRequired: false,
    })
  })

  it("opens the UMP privacy options form", async () => {
    await showAdPrivacyOptions()
    expect(mockShowPrivacyOptionsForm).toHaveBeenCalledTimes(1)
  })
})
