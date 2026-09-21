/// <reference types="node" />
import fs from "node:fs"
import path from "node:path"

const website = path.resolve(__dirname, "../../../tip-calendar-html")

describe("advertising disclosure", () => {
  it("publishes authorized seller and privacy details", () => {
    const appAds = fs.readFileSync(path.join(website, "app-ads.txt"), "utf8")
    const privacy = fs.readFileSync(path.join(website, "privacy.html"), "utf8")

    expect(appAds.trim()).toBe("google.com, pub-3534156575856999, DIRECT, f08c47fec0942fa0")
    expect(privacy).toMatch(/AdMob|advertis/i)
    expect(privacy).toMatch(/withdraw|privacy choices/i)
    expect(privacy).toMatch(/income data.*not.*advertis/is)
  })
})
