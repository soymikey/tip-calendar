import { FormEvent, useMemo, useState } from "react";
import "./styles.css";
import {
  buildMonthDays,
  formatMonth,
  shiftMonth,
  summarizePeriod,
  summarizeShifts,
  summarizeShiftsByDate,
} from "./domain/calendar";
import type { AppState, PayType } from "./domain/restaurant";
import type { CreditTipPayout, RestaurantSettings, TipOutRule } from "./domain/restaurant";
import {
  formatPaySummary,
  normalizePayAmount,
  normalizeTipOutRule,
  restaurantDisplayName,
  tipOutRuleLabel,
} from "./domain/restaurant";
import type { ShiftDraft, ShiftRecord } from "./domain/shift";
import {
  calculateShift,
  createEmptyShiftDraft,
  money,
  validateShiftInput,
} from "./domain/shift";
import {
  deleteShift,
  loadAppState,
  replaceAppState,
  resetDemoData,
  restoreShift,
  saveRestaurant,
  saveShift,
  setDefaultRestaurant,
  deleteRestaurant,
} from "./storage/localStore";
import { exportCsv, exportJsonBackup, importJsonBackup } from "./storage/backup";

type SaveStatus = "idle" | "saved" | "reset" | "shiftSaved" | "shiftDeleted" | "shiftRestored";

function parseAmount(value: string): number {
  return normalizePayAmount(Number(value));
}

function numberValue(value: number): string {
  return value === 0 ? "" : String(value);
}

export default function App() {
  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  const [name, setName] = useState(appState.restaurant.name);
  const [payType, setPayType] = useState<PayType>(appState.restaurant.payType);
  const [payAmount, setPayAmount] = useState(String(appState.restaurant.payAmount));
  const [editingRestaurantId, setEditingRestaurantId] = useState(appState.defaultRestaurantId);
  const [creditTipPayout, setCreditTipPayout] = useState<CreditTipPayout>(appState.restaurant.creditTipPayout);
  const [tipOutType, setTipOutType] = useState<TipOutRule["type"]>(appState.restaurant.defaultTipOut.type);
  const [tipOutAmount, setTipOutAmount] = useState(
    "amount" in appState.restaurant.defaultTipOut ? String(appState.restaurant.defaultTipOut.amount) : "",
  );
  const [tipOutPercent, setTipOutPercent] = useState(
    "percent" in appState.restaurant.defaultTipOut ? String(appState.restaurant.defaultTipOut.percent) : "",
  );
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [draft, setDraft] = useState<ShiftDraft>(() => createEmptyShiftDraft());
  const [showMore, setShowMore] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ShiftRecord | null>(null);
  const [undoShift, setUndoShift] = useState<ShiftRecord | null>(null);
  const [selectedDate, setSelectedDate] = useState(draft.date);
  const [exportOutput, setExportOutput] = useState("");
  const [importText, setImportText] = useState("");
  const [importConfirmed, setImportConfirmed] = useState(false);
  const [backupMessage, setBackupMessage] = useState("No account or cloud sync. Data stays in this browser.");

  const selectedRestaurant =
    appState.restaurants.find((restaurant) => restaurant.id === draft.restaurantId) ?? appState.restaurant;
  const currentRestaurant = {
    ...selectedRestaurant,
    payType: selectedRestaurant.payType,
    payAmount: selectedRestaurant.payAmount,
  };
  const calculationInput = {
    payType: currentRestaurant.payType,
    payAmount: currentRestaurant.payAmount,
    hours: draft.hours,
    useClock: draft.useClock,
    clockIn: draft.clockIn,
    clockOut: draft.clockOut,
    unpaidBreak: draft.unpaidBreak,
    cashTips: draft.cashTips,
    creditTips: draft.creditTips,
    otherIncome: draft.otherIncome,
    manualTipOut: draft.manualTipOut,
    salesAmount: draft.salesAmount,
    tipOutRule: draft.tipOutRuleSnapshot,
  };
  const calculation = calculateShift(calculationInput);
  const validationMessages = validateShiftInput(calculationInput);

  const paySummary = useMemo(
    () => formatPaySummary({ payType, payAmount: parseAmount(payAmount) }),
    [payAmount, payType],
  );
  const payForShift = (shift: ShiftRecord) => {
    const restaurant = appState.restaurants.find((item) => item.id === shift.restaurantId) ?? appState.restaurant;
    return { payType: restaurant.payType, payAmount: restaurant.payAmount };
  };
  const dateSummaries = summarizeShiftsByDate(appState.shifts, payForShift);
  const selectedShifts = appState.shifts.filter((shift) => shift.date === selectedDate);
  const selectedSummary = summarizeShifts(selectedShifts, payForShift);
  const weekSummary = summarizePeriod(appState.shifts, payForShift, selectedDate, "week");
  const monthSummary = summarizePeriod(appState.shifts, payForShift, selectedDate, "month");
  const monthDays = buildMonthDays(selectedDate);

  function refreshState() {
    const nextState = loadAppState();
    setAppState(nextState);
    return nextState;
  }

  function updateDraft(updates: Partial<ShiftDraft>) {
    setDraft((current) => ({ ...current, ...updates }));
  }

  function currentTipOutRule(): TipOutRule {
    return normalizeTipOutRule({
      type: tipOutType,
      amount: parseAmount(tipOutAmount),
      percent: parseAmount(tipOutPercent),
    } as Partial<TipOutRule>);
  }

  function loadRestaurantIntoForm(restaurant: RestaurantSettings) {
    setEditingRestaurantId(restaurant.id);
    setName(restaurant.name);
    setPayType(restaurant.payType);
    setPayAmount(String(restaurant.payAmount));
    setCreditTipPayout(restaurant.creditTipPayout);
    setTipOutType(restaurant.defaultTipOut.type);
    setTipOutAmount("amount" in restaurant.defaultTipOut ? String(restaurant.defaultTipOut.amount) : "");
    setTipOutPercent("percent" in restaurant.defaultTipOut ? String(restaurant.defaultTipOut.percent) : "");
  }

  function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = saveRestaurant({
      id: editingRestaurantId,
      name: name.trim() || "Default Restaurant",
      payType,
      payAmount: parseAmount(payAmount),
      creditTipPayout,
      defaultTipOut: currentTipOutRule(),
    });
    setDefaultRestaurant(saved.id);
    const nextState = refreshState();
    loadRestaurantIntoForm(nextState.restaurants.find((restaurant) => restaurant.id === saved.id) ?? saved);
    setStatus("saved");
  }

  function handleReset() {
    const nextState = resetDemoData();
    setAppState(nextState);
    setName(nextState.restaurant.name);
    setPayType(nextState.restaurant.payType);
    setPayAmount(String(nextState.restaurant.payAmount));
    setCreditTipPayout(nextState.restaurant.creditTipPayout);
    setTipOutType(nextState.restaurant.defaultTipOut.type);
    setTipOutAmount("");
    setTipOutPercent("");
    setDraft(createEmptyShiftDraft());
    setUndoShift(null);
    setDeleteTarget(null);
    setStatus("reset");
  }

  function startShiftForDate(date: string) {
    const restaurant = appState.restaurants.find((item) => item.id === appState.defaultRestaurantId) ?? appState.restaurant;
    setSelectedDate(date);
    setDraft({
      ...createEmptyShiftDraft(date),
      restaurantId: restaurant.id,
      tipOutRuleSnapshot: restaurant.defaultTipOut,
    });
    setShowDetails(false);
    setShowMore(false);
    setStatus("idle");
  }

  function handleShiftSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (validationMessages.length > 0) {
      return;
    }

    saveShift({
      ...draft,
      tipOutRuleSnapshot: normalizeTipOutRule(draft.tipOutRuleSnapshot),
    });
    refreshState();
    setSelectedDate(draft.date);
    setDraft(createEmptyShiftDraft(draft.date));
    setShowDetails(false);
    setStatus("shiftSaved");
  }

  function handleEditShift(shift: ShiftRecord) {
    setDraft({ ...shift });
    setSelectedDate(shift.date);
    setShowMore(Boolean(shift.useClock || shift.unpaidBreak || shift.notes));
    setShowDetails(false);
    setStatus("idle");
  }

  function handleAddRestaurant() {
    setEditingRestaurantId("");
    setName("");
    setPayType("hourly");
    setPayAmount("");
    setCreditTipPayout("sameDay");
    setTipOutType("none");
    setTipOutAmount("");
    setTipOutPercent("");
    setStatus("idle");
  }

  function handleRestaurantDelete(id: string) {
    deleteRestaurant(id);
    const nextState = refreshState();
    loadRestaurantIntoForm(nextState.restaurant);
  }

  function handleExportCsv() {
    setExportOutput(exportCsv(appState));
    setBackupMessage("CSV export ready.");
  }

  function handleExportJson() {
    setExportOutput(exportJsonBackup(appState));
    setBackupMessage("JSON backup ready.");
  }

  function handleImportJson() {
    const result = importJsonBackup(importText, importConfirmed);

    if (!result.ok || !result.state) {
      setBackupMessage(result.message);
      return;
    }

    replaceAppState(result.state);
    const nextState = refreshState();
    loadRestaurantIntoForm(nextState.restaurant);
    setSelectedDate(nextState.shifts[0]?.date ?? selectedDate);
    setDraft(createEmptyShiftDraft(nextState.shifts[0]?.date ?? selectedDate));
    setImportConfirmed(false);
    setBackupMessage(result.message);
  }

  function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    const deleted = deleteShift(deleteTarget.id);
    setDeleteTarget(null);
    if (deleted) {
      setUndoShift(deleted);
      refreshState();
      setStatus("shiftDeleted");
      window.setTimeout(() => setUndoShift(null), 6000);
    }
  }

  function undoDelete() {
    if (!undoShift) {
      return;
    }

    restoreShift(undoShift);
    setUndoShift(null);
    refreshState();
    setStatus("shiftRestored");
  }

  const isEditing = Boolean(draft.id);

  return (
    <main className="app-shell">
      <section className="hero-panel" aria-labelledby="app-title">
        <p className="eyebrow">Tip Calendar</p>
        <h1 id="app-title">Tip Calendar</h1>
        <p className="intro">
          Keep defaults local, then record a single-restaurant shift without an account.
        </p>
      </section>

      <section className="settings-panel calendar-panel" aria-labelledby="calendar-title">
        <div className="section-heading">
          <h2 id="calendar-title">{formatMonth(selectedDate)}</h2>
          <div className="month-actions">
            <button type="button" onClick={() => setSelectedDate(shiftMonth(selectedDate, -1))}>
              Previous month
            </button>
            <button type="button" onClick={() => setSelectedDate(shiftMonth(selectedDate, 1))}>
              Next month
            </button>
          </div>
        </div>

        <div className="summary-strip" aria-label="Income summaries">
          <div>
            <span>Week net</span>
            <strong>{money(weekSummary.netIncome)}</strong>
            <small>{weekSummary.shiftCount} shifts</small>
          </div>
          <div>
            <span>Month net</span>
            <strong>{money(monthSummary.netIncome)}</strong>
            <small>{monthSummary.effectiveHours} hrs</small>
          </div>
          <div>
            <span>Avg hourly</span>
            <strong>{monthSummary.averageActualHourly === null ? "$0.00/hr" : `${money(monthSummary.averageActualHourly)}/hr`}</strong>
            <small>{money(monthSummary.totalTips)} tips</small>
          </div>
        </div>

        <div className="weekday-grid" aria-hidden="true">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="calendar-grid">
          {monthDays.map((day) => {
            const summary = dateSummaries[day.date];
            return (
              <button
                aria-pressed={day.date === selectedDate}
                className={[
                  "calendar-day",
                  day.isCurrentMonth ? "" : "outside-month",
                  day.date === selectedDate ? "selected-day" : "",
                ].join(" ")}
                key={day.date}
                type="button"
                onClick={() => setSelectedDate(day.date)}
                aria-label={`Select ${day.date}`}
              >
                <span>{day.dayNumber}</span>
                {summary && (
                  <small data-testid={`calendar-net-${day.date}`}>{money(summary.netIncome)}</small>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="settings-panel day-detail" aria-labelledby="day-detail-title">
        <div className="section-heading">
          <div>
            <h2 id="day-detail-title">Day detail</h2>
            <p data-testid="selected-date">{selectedDate}</p>
          </div>
          <p>{selectedSummary.shiftCount} shifts</p>
        </div>
        {selectedSummary.shiftCount > 0 ? (
          <div className="day-totals">
            <p>Day net {money(selectedSummary.netIncome)}</p>
            <p>Week net {money(weekSummary.netIncome)}</p>
            <p>Month net {money(monthSummary.netIncome)}</p>
            <p>Total tips {money(selectedSummary.totalTips)}</p>
            <p>Average actual hourly {selectedSummary.averageActualHourly === null ? "$0.00/hr" : `${money(selectedSummary.averageActualHourly)}/hr`}</p>
            <p>Total effective hours {selectedSummary.effectiveHours}</p>
          </div>
        ) : (
          <p className="empty-state">This day has no shifts yet.</p>
        )}
        <button className="primary-button" type="button" onClick={() => startShiftForDate(selectedDate)}>
          Record a shift
        </button>
        {selectedShifts.map((shift) => {
          const itemCalculation = calculateShift({
            payType: payForShift(shift).payType,
            payAmount: payForShift(shift).payAmount,
            hours: shift.hours,
            useClock: shift.useClock,
            clockIn: shift.clockIn,
            clockOut: shift.clockOut,
            unpaidBreak: shift.unpaidBreak,
            cashTips: shift.cashTips,
            creditTips: shift.creditTips,
            otherIncome: shift.otherIncome,
            manualTipOut: shift.manualTipOut,
            salesAmount: shift.salesAmount,
            tipOutRule: shift.tipOutRuleSnapshot,
          });

          return (
            <article className="shift-card" key={shift.id}>
              <div>
                <h3>{shift.date}</h3>
                <p>Net income {money(itemCalculation.netIncome)}</p>
                {itemCalculation.isCrossMidnight && <p>Cross-midnight shift</p>}
              </div>
              <div className="card-actions">
                <button type="button" onClick={() => handleEditShift(shift)}>
                  Edit shift {shift.date}
                </button>
                <button type="button" onClick={() => setDeleteTarget(shift)}>
                  Delete shift {shift.date}
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <form className="settings-panel" onSubmit={saveSettings}>
        <div className="section-heading">
          <h2>Restaurant settings</h2>
          <p>{paySummary}</p>
        </div>

        <div className="restaurant-list">
          {appState.restaurants.map((restaurant) => (
            <div key={restaurant.id} className="restaurant-row">
              <span>
                {restaurantDisplayName({
                  name: restaurant.name,
                  isDefault: restaurant.id === appState.defaultRestaurantId,
                })}
              </span>
              <button type="button" onClick={() => loadRestaurantIntoForm(restaurant)}>
                Edit
              </button>
              <button type="button" onClick={() => handleRestaurantDelete(restaurant.id)}>
                Delete
              </button>
            </div>
          ))}
        </div>

        <button className="secondary-button" type="button" onClick={handleAddRestaurant}>
          Add restaurant
        </button>

        <label className="field">
          <span>Restaurant name</span>
          <input
            aria-label="Restaurant name"
            autoComplete="organization"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <fieldset className="segmented-field">
          <legend>Pay method</legend>
          <label className={payType === "hourly" ? "segment selected" : "segment"}>
            <input
              aria-label="Hourly pay"
              checked={payType === "hourly"}
              name="payType"
              onChange={() => setPayType("hourly")}
              type="radio"
            />
            Hourly
          </label>
          <label className={payType === "fixedShift" ? "segment selected" : "segment"}>
            <input
              aria-label="Fixed pay per shift"
              checked={payType === "fixedShift"}
              name="payType"
              onChange={() => setPayType("fixedShift")}
              type="radio"
            />
            Per shift
          </label>
        </fieldset>

        <label className="field">
          <span>Pay amount</span>
          <div className="money-input">
            <span aria-hidden="true">$</span>
            <input
              aria-label="Pay amount"
              inputMode="decimal"
              min="0"
              step="0.01"
              type="number"
              value={payAmount}
              onChange={(event) => setPayAmount(event.target.value)}
            />
          </div>
        </label>

        <fieldset className="segmented-field">
          <legend>Credit card tips</legend>
          <label className={creditTipPayout === "sameDay" ? "segment selected" : "segment"}>
            <input
              aria-label="Credit tips same day"
              checked={creditTipPayout === "sameDay"}
              name="creditTipPayout"
              onChange={() => setCreditTipPayout("sameDay")}
              type="radio"
            />
            Same day
          </label>
          <label className={creditTipPayout === "paycheck" ? "segment selected" : "segment"}>
            <input
              aria-label="Credit tips with paycheck"
              checked={creditTipPayout === "paycheck"}
              name="creditTipPayout"
              onChange={() => setCreditTipPayout("paycheck")}
              type="radio"
            />
            Paycheck
          </label>
        </fieldset>

        <label className="field">
          <span>Default tip-out rule</span>
          <select
            aria-label="Default tip-out rule"
            value={tipOutType}
            onChange={(event) => setTipOutType(event.target.value as TipOutRule["type"])}
          >
            <option value="none">No tip-out</option>
            <option value="fixed">Fixed amount</option>
            <option value="salesPercent">% of sales</option>
            <option value="tipsPercent">% of total tips</option>
          </select>
        </label>

        {tipOutType === "fixed" && (
          <label className="field">
            <span>Tip-out amount</span>
            <input
              aria-label="Tip-out amount"
              inputMode="decimal"
              type="number"
              value={tipOutAmount}
              onChange={(event) => setTipOutAmount(event.target.value)}
            />
          </label>
        )}

        {(tipOutType === "salesPercent" || tipOutType === "tipsPercent") && (
          <label className="field">
            <span>Tip-out percent</span>
            <input
              aria-label="Tip-out percent"
              inputMode="decimal"
              type="number"
              value={tipOutPercent}
              onChange={(event) => setTipOutPercent(event.target.value)}
            />
          </label>
        )}

        <div className="actions">
          <button className="primary-button" type="submit">
            Save restaurant
          </button>
          <button className="secondary-button" type="button" onClick={handleReset}>
            Reset demo data
          </button>
        </div>
      </form>

      <form className="settings-panel shift-panel" onSubmit={handleShiftSave}>
        <div className="section-heading">
          <div>
            <h2>Record Shift</h2>
            <p>{currentRestaurant.name}</p>
          </div>
          <p>{draft.date}</p>
        </div>

        <label className="field">
          <span>Restaurant</span>
          <select
            aria-label="Shift restaurant"
            value={draft.restaurantId}
            onChange={(event) => {
              const restaurant = appState.restaurants.find((item) => item.id === event.target.value);
              updateDraft({
                restaurantId: event.target.value,
                tipOutRuleSnapshot: restaurant?.defaultTipOut ?? { type: "none" },
                manualTipOut: 0,
                salesAmount: 0,
              });
            }}
          >
            {appState.restaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>
                {restaurant.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Work hours</span>
          <input
            aria-label="Work hours"
            disabled={draft.useClock}
            inputMode="decimal"
            min="0"
            step="0.25"
            type="number"
            value={numberValue(draft.hours)}
            onChange={(event) => updateDraft({ hours: parseAmount(event.target.value) })}
          />
        </label>

        <div className="input-grid">
          <label className="field">
            <span>Cash tips</span>
            <input
              aria-label="Cash tips"
              inputMode="decimal"
              type="number"
              value={numberValue(draft.cashTips)}
              onChange={(event) => updateDraft({ cashTips: parseAmount(event.target.value) })}
            />
          </label>
          <label className="field">
            <span>Credit card tips</span>
            <input
              aria-label="Credit card tips"
              inputMode="decimal"
              type="number"
              value={numberValue(draft.creditTips)}
              onChange={(event) => updateDraft({ creditTips: parseAmount(event.target.value) })}
            />
          </label>
          <label className="field">
            <span>Other income</span>
            <input
              aria-label="Other income"
              inputMode="decimal"
              type="number"
              value={numberValue(draft.otherIncome)}
              onChange={(event) => updateDraft({ otherIncome: parseAmount(event.target.value) })}
            />
          </label>
          <label className="field">
            <span>Manual tip-out</span>
            <input
              aria-label="Manual tip-out"
              inputMode="decimal"
              type="number"
              value={numberValue(draft.manualTipOut)}
              onChange={(event) => updateDraft({ manualTipOut: parseAmount(event.target.value) })}
            />
          </label>
        </div>

        <label className="field">
          <span>Shift tip-out rule</span>
          <select
            aria-label="Shift tip-out rule"
            value={draft.tipOutRuleSnapshot.type}
            onChange={(event) =>
              updateDraft({
                tipOutRuleSnapshot: normalizeTipOutRule({
                  type: event.target.value as TipOutRule["type"],
                  amount: draft.tipOutRuleSnapshot.type === "fixed" ? draft.tipOutRuleSnapshot.amount : 0,
                  percent:
                    draft.tipOutRuleSnapshot.type === "salesPercent" ||
                    draft.tipOutRuleSnapshot.type === "tipsPercent"
                      ? draft.tipOutRuleSnapshot.percent
                      : 0,
                } as Partial<TipOutRule>),
              })
            }
          >
            <option value="none">No tip-out</option>
            <option value="fixed">Fixed amount</option>
            <option value="salesPercent">% of sales</option>
            <option value="tipsPercent">% of total tips</option>
          </select>
        </label>

        {draft.tipOutRuleSnapshot.type === "salesPercent" && (
          <label className="field">
            <span>Sales amount</span>
            <input
              aria-label="Sales amount"
              inputMode="decimal"
              type="number"
              value={numberValue(draft.salesAmount)}
              onChange={(event) => updateDraft({ salesAmount: parseAmount(event.target.value) })}
            />
          </label>
        )}

        <section className="result-panel" aria-label="Shift results">
          <div>
            <span>Net income</span>
            <strong>{money(calculation.netIncome)}</strong>
          </div>
          <div>
            <span>Actual hourly</span>
            <strong>{calculation.actualHourly === null ? "Add hours" : `${money(calculation.actualHourly)}/hr`}</strong>
          </div>
          <dl>
            <div>
              <dt>Total tips</dt>
              <dd>{money(calculation.totalTips)}</dd>
            </div>
            <div>
              <dt>Wage income</dt>
              <dd>{money(calculation.wageIncome)}</dd>
            </div>
            <div>
              <dt>Total income</dt>
              <dd>{money(calculation.totalIncome)}</dd>
            </div>
          </dl>
          {calculation.isCrossMidnight && <p className="pill-note">Cross-midnight shift</p>}
        </section>

        {validationMessages.length > 0 && (
          <div className="error-list" aria-live="polite">
            {validationMessages.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        )}

        <button
          className="text-button"
          type="button"
          aria-expanded={showMore}
          onClick={() => setShowMore((value) => !value)}
        >
          More options
        </button>

        {showMore && (
          <div className="advanced-panel">
            <label className="check-field">
              <input
                aria-label="Use clock in and out"
                checked={Boolean(draft.useClock)}
                type="checkbox"
                onChange={(event) => updateDraft({ useClock: event.target.checked })}
              />
              Use clock in and out
            </label>
            {draft.useClock && (
              <div className="input-grid">
                <label className="field">
                  <span>Clock in</span>
                  <input
                    aria-label="Clock in"
                    type="time"
                    value={draft.clockIn}
                    onChange={(event) => updateDraft({ clockIn: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Clock out</span>
                  <input
                    aria-label="Clock out"
                    type="time"
                    value={draft.clockOut}
                    onChange={(event) => updateDraft({ clockOut: event.target.value })}
                  />
                </label>
              </div>
            )}
            <label className="field">
              <span>Unpaid break hours</span>
              <input
                aria-label="Unpaid break hours"
                inputMode="decimal"
                min="0"
                step="0.25"
                type="number"
                value={numberValue(draft.unpaidBreak)}
                onChange={(event) => updateDraft({ unpaidBreak: parseAmount(event.target.value) })}
              />
            </label>
            <label className="field">
              <span>Notes</span>
              <input
                aria-label="Notes"
                value={draft.notes}
                onChange={(event) => updateDraft({ notes: event.target.value })}
              />
            </label>
          </div>
        )}

        <button
          className="text-button"
          type="button"
          aria-expanded={showDetails}
          onClick={() => setShowDetails((value) => !value)}
        >
          Calculation details
        </button>

        {showDetails && (
          <div className="details-panel">
            <p>Effective hours: {calculation.effectiveHours}</p>
            <p>Total tips: {money(draft.cashTips)} cash + {money(draft.creditTips)} credit</p>
            <p>Wage income: {money(calculation.wageIncome)}</p>
            <p>Other income: {money(draft.otherIncome)}</p>
            <p>Tip-out: {money(calculation.tipOut)}</p>
            <p>Tip-out rule: {tipOutRuleLabel(draft.tipOutRuleSnapshot)}</p>
          </div>
        )}

        <div className="status-line" aria-live="polite">
          {status === "saved" && "Settings saved locally."}
          {status === "reset" && "Demo data restored."}
          {status === "shiftSaved" && "Shift saved locally."}
          {status === "shiftDeleted" && "Shift deleted."}
          {status === "shiftRestored" && "Shift restored."}
          {status === "idle" && "Stored only in this browser."}
        </div>

        <button className="primary-button" type="submit" disabled={validationMessages.length > 0}>
          {isEditing ? "Update shift" : "Save shift"}
        </button>
      </form>

      <section className="settings-panel shift-list" aria-labelledby="saved-shifts">
        <div className="section-heading">
          <h2 id="saved-shifts">Saved shifts</h2>
          <p>{appState.shifts.length} total</p>
        </div>

        {appState.shifts.length === 0 && <p className="empty-state">No shifts recorded yet.</p>}

        {appState.shifts.map((shift) => {
          const itemCalculation = calculateShift({
            payType: payForShift(shift).payType,
            payAmount: payForShift(shift).payAmount,
            hours: shift.hours,
            useClock: shift.useClock,
            clockIn: shift.clockIn,
            clockOut: shift.clockOut,
            unpaidBreak: shift.unpaidBreak,
            cashTips: shift.cashTips,
            creditTips: shift.creditTips,
            otherIncome: shift.otherIncome,
            manualTipOut: shift.manualTipOut,
            salesAmount: shift.salesAmount,
            tipOutRule: shift.tipOutRuleSnapshot,
          });

          return (
            <article className="shift-card" key={shift.id}>
              <div>
                <h3>{shift.date}</h3>
                <p>Net income {money(itemCalculation.netIncome)}</p>
                {itemCalculation.isCrossMidnight && <p>Cross-midnight shift</p>}
              </div>
              <div className="card-actions">
                <button type="button" onClick={() => handleEditShift(shift)}>
                  Edit shift {shift.date}
                </button>
                <button type="button" onClick={() => setDeleteTarget(shift)}>
                  Delete shift {shift.date}
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <section className="settings-panel backup-panel" aria-labelledby="backup-title">
        <div className="section-heading">
          <h2 id="backup-title">Export and backup</h2>
          <p>Local only</p>
        </div>
        <p className="empty-state">Net income is not the same as cash in hand.</p>
        <div className="actions">
          <button className="secondary-button" type="button" onClick={handleExportCsv}>
            Export CSV
          </button>
          <button className="secondary-button" type="button" onClick={handleExportJson}>
            Export JSON
          </button>
        </div>
        <label className="field">
          <span>Export output</span>
          <textarea
            aria-label="Export output"
            readOnly
            rows={7}
            value={exportOutput}
          />
        </label>
        <label className="field">
          <span>JSON backup to import</span>
          <textarea
            aria-label="JSON backup to import"
            rows={6}
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
          />
        </label>
        <label className="check-field">
          <input
            aria-label="Replace local data with this backup"
            checked={importConfirmed}
            type="checkbox"
            onChange={(event) => setImportConfirmed(event.target.checked)}
          />
          Replace local data with this backup
        </label>
        <button className="primary-button" type="button" onClick={handleImportJson}>
          Import JSON backup
        </button>
        <div className="status-line" aria-live="polite">
          {backupMessage}
        </div>
      </section>

      {undoShift && (
        <div className="undo-bar">
          <span>Shift deleted.</span>
          <button type="button" onClick={undoDelete}>
            Undo delete
          </button>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title">
            <h2 id="delete-title">Delete this shift?</h2>
            <p>This removes it from this browser. You can undo briefly after deleting.</p>
            <div className="actions">
              <button className="primary-button" type="button" onClick={confirmDelete}>
                Delete
              </button>
              <button className="secondary-button" type="button" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
