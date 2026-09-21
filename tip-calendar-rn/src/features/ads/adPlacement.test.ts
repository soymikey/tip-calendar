import { shouldShowBannerOnRoute } from "./adPlacement"

describe("ad placement", () => {
  it("allows banners only on Calendar and Stats", () => {
    expect(shouldShowBannerOnRoute("index")).toBe(true)
    expect(shouldShowBannerOnRoute("stats")).toBe(true)
    expect(shouldShowBannerOnRoute("me")).toBe(false)
    expect(shouldShowBannerOnRoute("shift/new")).toBe(false)
  })
})
