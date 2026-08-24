# Phase 4: Advanced Shift Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the default Record Shift form short, and let users expand Base Pay, Tip-out, More options, and calculation details, with plain-language validation and a no-restaurant intercept.

**Architecture:** Extend `ShiftDraft` so `previewShiftIncome` / `toShift` / `toUpdatedShift` carry unpaid break, other income, clock times, tags, notes, per-shift pay, and tip-out. Validation is a pure helper. The default form stays Hours / Cash / Card / Results; expanders reveal the rest. No restaurant → dedicated intercept, not a blank form. No extra tab bar.

**Tech Stack:** Existing domain, NativeWind, `Switch`, `ActionSheetIOS`, `@react-native-community/datetimepicker` for clock times.

**Figma:** `record-shift-form-more-options` `41:4`, `calculation-breakdown` `48:811`, `form-validation-errors` `48:884`, `record-shift-no-restaurant` `56:4`.

Use `#0066CC` and `#1F7A4D`. Warning orange `#FF9500`. Overnight clock-out is allowed and labeled `(next day)`, not an error.

**Out of this phase:** Stats, Me, changing the shift date, restaurant settings screens.

---

## File map

Create:

- `tip-calendar-rn/src/features/shift/shiftValidation.ts`
- `tip-calendar-rn/src/features/shift/shiftValidation.test.ts`
- `tip-calendar-rn/src/features/shift/calculationBreakdown.ts`
- `tip-calendar-rn/src/features/shift/calculationBreakdown.test.ts`
- `tip-calendar-rn/src/features/shift/NoRestaurantShift.tsx`

Modify:

- `tip-calendar-rn/src/domain/shift.ts` — persist `clockIn` / `clockOut` / `tag` / `paySnapshot`
- `tip-calendar-rn/src/features/shift/shiftDraft.ts`
- `tip-calendar-rn/src/features/shift/shiftDraft.test.ts`
- `tip-calendar-rn/src/features/shift/RecordShiftForm.tsx`
- `tip-calendar-rn/src/features/calendar/calendarSummary.ts`
- `tip-calendar-rn/src/features/calendar/DayDetailsSheet.tsx`
- `tip-calendar-rn/src/components/TextField.tsx`
- `tip-calendar-rn/src/app/shift/new.tsx`
- `tip-calendar-rn/src/app/shift/[id].tsx`
- `tip-calendar-rn/src/theme/colors.ts`
- `docs/plans/README.md`

---

### Task 1: Draft extras, pay snapshot, validation

**Files:** `shift.ts`, `shiftDraft.ts`, `shiftValidation.ts`, tests

- [ ] **Step 1: Failing tests** for clock hours, unpaid break, other income, overnight, blocking validation, high-tip warning.

```ts
it("uses clock in/out hours and marks overnight", () => {
  const income = previewShiftIncome(
    { ...draft, useClock: true, clockIn: "18:00", clockOut: "00:30" },
    restaurant,
  )
  expect(income.effectiveHours).toBe(6.5)
  const shift = toShift(
    { ...draft, useClock: true, clockIn: "18:00", clockOut: "00:30" },
    restaurant,
    "2026-08-21T20:00:00.000Z",
  )
  expect(shift.overnight).toBe(true)
  expect(shift.hours).toBe(6.5)
})

it("blocks save when tip-out exceeds gross or break exceeds hours", () => {
  expect(
    canSaveShift(
      { ...draft, unpaidBreakHours: 7 },
      restaurant,
    ),
  ).toBe(false)
})
```

- [ ] **Step 2–4:** Implement optional draft fields; `resolveShiftHours`; `validateShiftDraft`; persist `paySnapshot`; `createShift` copies `clockIn` / `clockOut` / `tag`. High tip warning at `>= $1,000` per cash or card field, still saveable. Run tests. Commit `feat: validate advanced shift draft fields`.

---

### Task 2: Calculation breakdown helper

**Files:** `calculationBreakdown.ts`, test

Return English lines matching Figma: cash, card, total tips formula, wages formula, gross, tip-out with basis, net, actual hourly.

- [ ] Implement, test, commit `feat: build shift calculation breakdown copy`.

---

### Task 3: Expandable form + no-restaurant intercept

**Files:** `RecordShiftForm.tsx`, `NoRestaurantShift.tsx`, `new.tsx`, `[id].tsx`, `TextField.tsx`

Default path unchanged. Collapsed links: `+ Base Pay`, `+ Tip-out`, `+ More Options` (action color). Expanded titles: `− Base Pay` etc.

- Base pay: Hourly / Per Shift / No Base Pay; rate field; `HOURS X hrs (from shift duration)`; `Base pay amount: $…`
- Tip-out: Fixed / % of Sales / % of Tips (plus None); live explanation; does not change restaurant settings
- More options: Lunch/Dinner pills (toggle off if tapped again); clock switch; Clock In/Out; `(next day)` when overnight; italic effective hours; unpaid break in minutes; other income; notes
- Results: `? How is this calculated?` expands inline; `Hide details` collapses. No separate screen, no tab bar
- Multiple restaurants: chevron + action sheet. One restaurant: read-only as now
- Validation: red error / orange warning on fields; Save disabled for hard errors
- No restaurant: Figma copy, `+ Add Restaurant` → `/onboarding`, other fields disabled

- [ ] Implement, `npm test`, commit `feat: expand shift form options and block missing restaurant`.

---

## Acceptance

- Default form still only needs hours and tips.
- Clock in/out fills hours; earlier clock-out is overnight, not an error.
- Lunch/Dinner appear on Day Details cards.
- Breakdown shows percent tip-out basis.
- Hours / break / tip-out errors use plain English; high tips warn but still save.
- No restaurant cannot save a blank shift.

## Out of this phase

Stats, Me, CSV, changing date, restaurant settings.
