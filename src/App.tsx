import { FormEvent, useMemo, useState } from "react";
import "./styles.css";
import type { AppState, PayType } from "./domain/restaurant";
import { formatPaySummary, normalizePayAmount } from "./domain/restaurant";
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
  resetDemoData,
  restoreShift,
  saveAppState,
  saveShift,
} from "./storage/localStore";

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
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [draft, setDraft] = useState<ShiftDraft>(() => createEmptyShiftDraft());
  const [showMore, setShowMore] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ShiftRecord | null>(null);
  const [undoShift, setUndoShift] = useState<ShiftRecord | null>(null);

  const currentRestaurant = {
    ...appState.restaurant,
    payType,
    payAmount: parseAmount(payAmount),
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
  };
  const calculation = calculateShift(calculationInput);
  const validationMessages = validateShiftInput(calculationInput);

  const paySummary = useMemo(
    () => formatPaySummary({ payType, payAmount: parseAmount(payAmount) }),
    [payAmount, payType],
  );

  function refreshState() {
    const nextState = loadAppState();
    setAppState(nextState);
    return nextState;
  }

  function updateDraft(updates: Partial<ShiftDraft>) {
    setDraft((current) => ({ ...current, ...updates }));
  }

  function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextState = saveAppState({
      ...appState,
      restaurant: {
        id: "default",
        name: name.trim() || "Default Restaurant",
        payType,
        payAmount: parseAmount(payAmount),
      },
    });

    setAppState(nextState);
    setName(nextState.restaurant.name);
    setPayType(nextState.restaurant.payType);
    setPayAmount(String(nextState.restaurant.payAmount));
    setStatus("saved");
  }

  function handleReset() {
    const nextState = resetDemoData();
    setAppState(nextState);
    setName(nextState.restaurant.name);
    setPayType(nextState.restaurant.payType);
    setPayAmount(String(nextState.restaurant.payAmount));
    setDraft(createEmptyShiftDraft());
    setUndoShift(null);
    setDeleteTarget(null);
    setStatus("reset");
  }

  function handleShiftSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (validationMessages.length > 0) {
      return;
    }

    saveShift(draft);
    refreshState();
    setDraft(createEmptyShiftDraft());
    setShowDetails(false);
    setStatus("shiftSaved");
  }

  function handleEditShift(shift: ShiftRecord) {
    setDraft({ ...shift });
    setShowMore(Boolean(shift.useClock || shift.unpaidBreak || shift.notes));
    setShowDetails(false);
    setStatus("idle");
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
        <h1 id="app-title">Default restaurant</h1>
        <p className="intro">
          Keep defaults local, then record a single-restaurant shift without an account.
        </p>
      </section>

      <form className="settings-panel" onSubmit={saveSettings}>
        <div className="section-heading">
          <h2>Restaurant settings</h2>
          <p>{paySummary}</p>
        </div>

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

        <div className="actions">
          <button className="primary-button" type="submit">
            Save settings
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
            <p>Tip-out: {money(draft.manualTipOut)}</p>
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
            payType: appState.restaurant.payType,
            payAmount: appState.restaurant.payAmount,
            hours: shift.hours,
            useClock: shift.useClock,
            clockIn: shift.clockIn,
            clockOut: shift.clockOut,
            unpaidBreak: shift.unpaidBreak,
            cashTips: shift.cashTips,
            creditTips: shift.creditTips,
            otherIncome: shift.otherIncome,
            manualTipOut: shift.manualTipOut,
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
