import renderer, { act, type ReactTestRenderer } from "react-test-renderer"
import { View } from "react-native"

const mockUseAds = jest.fn()
type BannerProps = {
  onAdLoaded: () => void
  onAdFailedToLoad: (error: Error) => void
}
const mockBannerAd = jest.fn<null, [BannerProps]>(() => null)

jest.mock("./AdProvider", () => ({ useAds: () => mockUseAds() }))
jest.mock("react-native-google-mobile-ads", () => ({
  BannerAd: (props: unknown) => mockBannerAd(props as BannerProps),
  BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: "ANCHORED_ADAPTIVE_BANNER" },
  TestIds: { ADAPTIVE_BANNER: "test-adaptive-banner" },
}))

// eslint-disable-next-line import/first
import { AdBannerSlot } from "./AdBannerSlot"

function latestBannerProps(): BannerProps {
  const call = mockBannerAd.mock.calls[mockBannerAd.mock.calls.length - 1]
  if (!call) {
    throw new Error("BannerAd was not rendered")
  }
  return call[0]
}

describe("AdBannerSlot", () => {
  const logSpy = jest.spyOn(console, "info").mockImplementation(() => undefined)
  const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined)

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAds.mockReturnValue({ eligible: true })
  })

  it("does not mount an ad when ineligible", () => {
    mockUseAds.mockReturnValue({ eligible: false })
    let tree: ReactTestRenderer | undefined
    act(() => {
      tree = renderer.create(<AdBannerSlot testID="ad-slot" />)
    })
    expect(tree?.toJSON()).toBeNull()
    expect(mockBannerAd).not.toHaveBeenCalled()
  })

  it("reveals the slot only after the banner loads", () => {
    let tree: ReactTestRenderer | undefined
    act(() => {
      tree = renderer.create(<AdBannerSlot testID="ad-slot" />)
    })
    expect(tree?.root.findByType(View).props.style).toEqual(
      expect.objectContaining({ height: 0 }),
    )

    act(() => latestBannerProps().onAdLoaded())
    expect(logSpy).toHaveBeenCalledWith("[Ads] banner loaded")
    expect(tree?.root.findByType(View).props.style).toEqual(
      expect.objectContaining({ height: "auto" }),
    )
  })

  it("removes the slot after a load failure", () => {
    let tree: ReactTestRenderer | undefined
    act(() => {
      tree = renderer.create(<AdBannerSlot testID="ad-slot" />)
    })
    act(() => latestBannerProps().onAdFailedToLoad(new Error("no fill")))
    expect(warnSpy).toHaveBeenCalledWith("[Ads] banner failed", { error: "no fill" })
    expect(tree?.toJSON()).toBeNull()
  })
})
