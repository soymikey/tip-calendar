export function nextCalendarPress(
  armedLocalDate: string | null,
  pressedLocalDate: string,
): { selectedLocalDate: string; armedLocalDate: string; open: boolean } {
  if (armedLocalDate === pressedLocalDate) {
    return {
      selectedLocalDate: pressedLocalDate,
      armedLocalDate: pressedLocalDate,
      open: true,
    }
  }
  return {
    selectedLocalDate: pressedLocalDate,
    armedLocalDate: pressedLocalDate,
    open: false,
  }
}
