import { FormEvent, useMemo, useState } from "react";
import "./styles.css";
import type { AppState, PayType } from "./domain/restaurant";
import { formatPaySummary, normalizePayAmount } from "./domain/restaurant";
import { loadAppState, resetDemoData, saveAppState } from "./storage/localStore";

type SaveStatus = "idle" | "saved" | "reset";

function parseAmount(value: string): number {
  return normalizePayAmount(Number(value));
}

export default function App() {
  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  const [name, setName] = useState(appState.restaurant.name);
  const [payType, setPayType] = useState<PayType>(appState.restaurant.payType);
  const [payAmount, setPayAmount] = useState(String(appState.restaurant.payAmount));
  const [status, setStatus] = useState<SaveStatus>("idle");

  const paySummary = useMemo(
    () => formatPaySummary({ payType, payAmount: parseAmount(payAmount) }),
    [payAmount, payType],
  );

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
    setStatus("reset");
  }

  return (
    <main className="app-shell">
      <section className="hero-panel" aria-labelledby="app-title">
        <p className="eyebrow">Tip Calendar</p>
        <h1 id="app-title">Default restaurant</h1>
        <p className="intro">
          Keep the restaurant defaults that will later make shift entry fast after work.
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

        <div className="status-line" aria-live="polite">
          {status === "saved" && "Settings saved locally."}
          {status === "reset" && "Demo data restored."}
          {status === "idle" && "Stored only in this browser."}
        </div>

        <div className="actions">
          <button className="primary-button" type="submit">
            Save settings
          </button>
          <button className="secondary-button" type="button" onClick={handleReset}>
            Reset demo data
          </button>
        </div>
      </form>
    </main>
  );
}
