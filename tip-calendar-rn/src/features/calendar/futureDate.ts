import * as Haptics from "expo-haptics"

export const FUTURE_SHIFT_HINT = "Can't add a shift in the future"

export async function warnFutureDate() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
  } catch {
    // web and some simulators have no haptics
  }
}
