import { shiftFormHeader } from "./shiftHeader"

describe("shiftFormHeader", () => {
  it("uses a clear task title and read-only date subtitle when creating a shift", () => {
    expect(shiftFormHeader("create", "2026-08-27")).toEqual({
      title: "Record Shift",
      subtitle: "Thursday, August 27",
    })
  })

  it("keeps edit mode focused on editing the existing shift", () => {
    expect(shiftFormHeader("edit", "2026-08-27")).toEqual({
      title: "Edit Shift",
      subtitle: "Thursday, August 27",
    })
  })
})
