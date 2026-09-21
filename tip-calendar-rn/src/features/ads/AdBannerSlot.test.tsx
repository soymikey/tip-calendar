import renderer, { act, type ReactTestRenderer } from "react-test-renderer"
import { View } from "react-native"

const mockUseAds = jest.fn()
const mockBannerAd = jest.fn(() => null)

jest.mock("./AdProvider", () => ({ useAds: () => mockUseAds() }))
jest.mock("react-native-google-mobile-ads", () => ({
  BannerAd: (props: unknown) => mockBannerAd(props),
  BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: "ANCHORED_ADAPTIVE_BANNER" },
  TestIds: { ADAPTIVE_BANNER: "test-adaptive-banner" },
}))

import { AdBannerSlot } from "./AdBannerSlot"

describe("AdBannerSlot", () => {
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

    act(() => mockBannerAd.mock.calls.at(-1)?.[0].onAdLoaded())
    expect(tree?.root.findByType(View).props.style).toEqual(
      expect.objectContaining({ height: "auto" }),
    )
  })

  it("removes the slot after a load failure", () => {
    let tree: ReactTestRenderer | undefined
    act(() => {
      tree = renderer.create(<AdBannerSlot testID="ad-slot" />)
    })
    act(() => mockBannerAd.mock.calls.at(-1)?.[0].onAdFailedToLoad())
    expect(tree?.toJSON()).toBeNull()
  })
})
