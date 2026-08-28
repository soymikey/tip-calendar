export type CalendarCellChrome = {
  fill: boolean
  border: boolean
  todayWash: boolean
}

export function calendarCellChrome(input: {
  selected: boolean
  filled: boolean
  peeked: boolean
  isToday: boolean
}): CalendarCellChrome {
  if (input.filled) {
    return { fill: true, border: false, todayWash: false }
  }
  return {
    fill: false,
    border: input.peeked && input.selected,
    todayWash: input.isToday,
  }
}

export function nextCalendarPress(
  armedLocalDate: string | null,
  pressedLocalDate: string,
  isOpening = false,
): { selectedLocalDate: string; armedLocalDate: string; open: boolean } {
  if (isOpening) {
    return {
      selectedLocalDate: pressedLocalDate,
      armedLocalDate: pressedLocalDate,
      open: false,
    }
  }
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

export function nextFilledDate(
  filledLocalDate: string | null,
  pressedLocalDate: string,
  open: boolean,
): string | null {
  if (open) {
    return pressedLocalDate
  }
  return pressedLocalDate === filledLocalDate ? filledLocalDate : null
}
