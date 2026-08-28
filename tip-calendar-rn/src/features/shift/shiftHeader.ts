import { parseLocalDate } from "../../domain/calendar"

export function shiftFormHeader(
  mode: "create" | "edit",
  localDate: string,
): { title: string; subtitle: string } {
  return {
    title: mode === "edit" ? "Edit Shift" : "Record Shift",
    subtitle: parseLocalDate(localDate).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }),
  }
}
