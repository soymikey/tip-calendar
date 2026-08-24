import { requestOpenDate, takeOpenDateRequest } from "./openDateRequest"

describe("openDateRequest", () => {
  it("returns the pending date once", () => {
    requestOpenDate("2026-08-24")
    expect(takeOpenDateRequest()).toBe("2026-08-24")
    expect(takeOpenDateRequest()).toBeNull()
  })
})
