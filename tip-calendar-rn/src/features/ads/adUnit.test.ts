jest.mock("react-native-google-mobile-ads", () => ({
  TestIds: { ADAPTIVE_BANNER: "test-adaptive-banner" },
}))

// eslint-disable-next-line import/first
import { getBannerAdUnitId } from "./adUnit"

describe("getBannerAdUnitId", () => {
  it("uses test inventory outside production", () => {
    expect(getBannerAdUnitId("development")).toBe("test-adaptive-banner")
    expect(getBannerAdUnitId("preview")).toBe("test-adaptive-banner")
  })

  it("uses the production banner only in production", () => {
    expect(getBannerAdUnitId("production")).toBe(
      "ca-app-pub-3534156575856999/7356442883",
    )
  })
})
