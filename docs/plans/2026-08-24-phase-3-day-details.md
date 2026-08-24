# Phase 3: Day Details, Edit, and Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dates with shifts open a Day Details sheet; each shift can be edited or deleted with confirmation and a short Undo.

**Architecture:** Empty dates still go to `/shift/new`. Dates with shifts open a calendar modal sheet (not a tab). Edit reuses `RecordShiftForm` at `/shift/[id]`. Delete removes the shift immediately, then a 5s toast can restore it.

**Tech Stack:** Expo Router, React Native `Modal` + `Alert`, existing `calculateShiftIncome` / `createLocalStore` / tokens.

**Figma:** `day-details-sheet` `3:160`, `day-details-multi-shift` `48:195`, `edit-shift-form` `48:260`, `delete-shift-confirmation` `48:555`, `delete-undo-toast` `48:678`.

Use `#0066CC` and `#1F7A4D`. Icons: SF Symbols `plus`, `pencil`, `trash`. No extra tab bar. Overlay `colors.overlay`. Do not implement More options or changing the shift date.

---

## File map

Create:

- `tip-calendar-rn/src/features/calendar/DayDetailsSheet.tsx`
- `tip-calendar-rn/src/features/calendar/UndoToast.tsx`
- `tip-calendar-rn/src/app/shift/[id].tsx`

Modify:

- `tip-calendar-rn/src/features/shift/shiftDraft.ts`
- `tip-calendar-rn/src/features/shift/shiftDraft.test.ts`
- `tip-calendar-rn/src/features/shift/RecordShiftForm.tsx`
- `tip-calendar-rn/src/app/_layout.tsx`
- `tip-calendar-rn/src/app/(tabs)/index.tsx`
- `docs/plans/README.md`

---

### Task 1: Date filter, replace, and remove helpers

**Files:** `shiftDraft.ts`, `shiftDraft.test.ts`

- [ ] **Step 1: Failing tests**

```ts
it("lists shifts on one local date", () => {
  expect(shiftsOnDate([lunch, dinner, otherDay], "2026-08-21").map((s) => s.id)).toEqual([
    "sft_lunch",
    "sft_dinner",
  ])
})

it("replaces a shift by id and keeps createdAt", () => {
  const next = toUpdatedShift({ ...fromShift(lunch), hours: 4 }, restaurant, lunch, "2026-08-22T00:00:00.000Z")
  const list = replaceShift([lunch, dinner], next)
  expect(list[0]?.hours).toBe(4)
  expect(list[0]?.id).toBe(lunch.id)
  expect(list[0]?.createdAt).toBe(lunch.createdAt)
})

it("removes a shift and returns it for undo", () => {
  const { remaining, removed } = removeShift([lunch, dinner], lunch.id)
  expect(remaining).toEqual([dinner])
  expect(removed?.id).toBe(lunch.id)
})
```

- [ ] **Step 2–4:** Implement `shiftsOnDate`, `fromShift`, `toUpdatedShift`, `replaceShift`, `removeShift`. Run tests. Commit `feat: add shift list replace and undo helpers`.

---

### Task 2: Day Details sheet

**Files:** `DayDetailsSheet.tsx`

Modal sheet: dim overlay, handle, date title `Thursday, August 21`, 36 circular plus. Each card: title (`Lunch Shift` / `Dinner Shift` / `Shift`), restaurant, hours, optional clock line, cash/card/wages/tip-out, net in `colors.income`. Edit 32 and delete 32 icon buttons. Multi-shift: daily total bar `#E5F2FF` with action-colored label and green total.

- [ ] Implement. Commit `feat: show day details sheet for recorded dates`.

---

### Task 3: Edit form + delete confirm + undo

**Files:** `RecordShiftForm.tsx`, `shift/[id].tsx`, `_layout.tsx`, `UndoToast.tsx`, `(tabs)/index.tsx`

- Empty date → `/shift/new`. Recorded date → sheet.
- Plus → same new route with that date.
- Edit → `/shift/[id]`, title `Edit Shift`, subtitle date, `Save Changes`.
- Delete → `Alert`: title `Delete Shift?`, body `This will permanently remove this shift record. You can undo this briefly after deletion.`, destructive `Delete Shift` / `Cancel`.
- Toast: `Shift deleted` + `Undo`, 5 seconds, `#333` bar above the tab bar.

- [ ] Implement, `npm test`, commit `feat: edit shifts and delete with undo`.

---

## Acceptance

- Empty date still opens add form.
- Date with shifts opens sheet; multiple cards; calendar cell is the day sum.
- Edit recalculates calendar immediately.
- Delete asks first; Undo restores within ~5s.
- Overlay tap closes the sheet.

## Out of this phase

More options, clock-in fields, changing date, Stats, Me.
