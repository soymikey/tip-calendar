# Phase 5: Stats, Me, and Backup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stats matches calendar math; Me has four settings entries; users can change restaurants and week start, share CSV/JSON, and restore JSON only after confirmation.

**Architecture:** Reuse `calculateShiftIncome` / `paySnapshot`. Stats is a range summary (week or month) plus a daily bar list. Me routes are root Stack screens (no second tab bar). Backup is pure CSV/JSON helpers plus the system share sheet and document picker.

**Tech Stack:** Existing domain/storage, `ActionSheetIOS`, `expo-sharing`, `expo-document-picker`, `expo-file-system`.

**Figma:** `stats` `27:162`, `me` `3:269`, `preferences` `43:4`, `data-and-backup` `43:124`, plus restaurant-settings / add-restaurant / about / json-restore.

Use `#0066CC` and `#1F7A4D`. Storage copy: **Local (on this iPhone)**, not “browser”. No ads, no account UI.

---

## File map

Create: `src/features/stats/statsSummary.ts` (+ test), `src/features/stats/StatsScreen.tsx`, `src/features/backup/backup.ts` (+ test), Me stack screens under `src/app/`.

Modify: `calendar.ts` (addDays), `CalendarMonth` (weekStartsOn), `(tabs)/index.tsx` (open `?date=`), `_layout.tsx`, `docs/plans/README.md`.

---

### Task 1: Stats math

- [x] Week/month range, restaurant filter, five metrics, `byDate` for bars. Same net as calendar.

### Task 2: Stats UI

- [x] Week/Month toggle (action selected), range chevrons, All Restaurants filter, five cards (net green), Daily Earnings bars, tap a day → Calendar with that date opened, View in Calendar.

### Task 3: Me + restaurants + preferences

- [x] Four rows. Restaurant list/add/edit/delete/default. Preferences: week starts on (checkmark) + 12/24 time. Calendar grid follows week start.

### Task 4: Backup + privacy

- [x] CSV + JSON share. Import JSON with confirm. About: on-device, no account, no cloud, no ads, no tracking.

---

## Acceptance

Stats totals match Calendar for the same week/month. Week start changes Stats and Calendar. CSV shares. JSON import asks first. Privacy copy matches local-only storage.
