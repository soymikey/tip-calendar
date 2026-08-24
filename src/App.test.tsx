import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";
import { demoState } from "./fixtures/demoData";
import { loadAppState } from "./storage/localStore";

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("edits and persists the default restaurant settings", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("tab", { name: "My" }));
    await user.click(screen.getByRole("button", { name: "Restaurant settings" }));
    await user.clear(screen.getByLabelText("Restaurant name"));
    await user.type(screen.getByLabelText("Restaurant name"), "Blue Plate Diner");
    await user.click(screen.getByLabelText("Fixed pay per shift"));
    await user.clear(screen.getByLabelText("Pay amount"));
    await user.type(screen.getByLabelText("Pay amount"), "95");
    await user.click(screen.getByRole("button", { name: "Save restaurant" }));

    expect(screen.getByText("Settings saved locally.")).toBeInTheDocument();
    expect(loadAppState().restaurant).toMatchObject({
      name: "Blue Plate Diner",
      payType: "fixedShift",
      payAmount: 95,
    });
  });

  it("resets edited values back to demo data", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("tab", { name: "My" }));
    await user.click(screen.getByRole("button", { name: "Restaurant settings" }));
    await user.clear(screen.getByLabelText("Restaurant name"));
    await user.type(screen.getByLabelText("Restaurant name"), "Changed");
    await user.click(screen.getByRole("button", { name: "Save restaurant" }));
    await user.click(screen.getByRole("button", { name: "Reset demo data" }));

    expect(screen.getByLabelText("Restaurant name")).toHaveValue(demoState.restaurant.name);
    expect(screen.getByText("Demo data restored.")).toBeInTheDocument();
  });

  it("creates a shift with live calculations and persists it", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Select 2026-08-10" }));
    await user.type(screen.getByLabelText("Work hours"), "6");
    await user.type(screen.getByLabelText("Cash tips"), "45");
    await user.type(screen.getByLabelText("Credit card tips"), "180");
    await user.type(screen.getByLabelText("Other income"), "20");
    await user.type(screen.getByLabelText("Manual tip-out"), "35");

    expect(screen.getByText("$285.00")).toBeInTheDocument();
    expect(screen.getByText("$47.50/hr")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save shift" }));

    expect(loadAppState().shifts).toHaveLength(1);
    expect(screen.getAllByText("Net income $285.00").length).toBeGreaterThan(0);
  });

  it("edits, deletes, and restores a saved shift", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Select 2026-08-10" }));
    await user.type(screen.getByLabelText("Work hours"), "4");
    await user.type(screen.getByLabelText("Cash tips"), "20");
    await user.click(screen.getByRole("button", { name: "Save shift" }));
    await user.click(screen.getAllByRole("button", { name: /Edit shift/ })[0]);
    await user.clear(screen.getByLabelText("Cash tips"));
    await user.type(screen.getByLabelText("Cash tips"), "40");
    await user.click(screen.getByRole("button", { name: "Update shift" }));

    expect(loadAppState().shifts[0].cashTips).toBe(40);

    await user.click(screen.getAllByRole("button", { name: /Delete shift/ })[0]);
    const deleteDialog = screen.getByRole("dialog", { name: "Delete this shift?" });
    await user.click(within(deleteDialog).getByRole("button", { name: "Delete" }));

    expect(loadAppState().shifts).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Undo delete" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Undo delete" }));
    expect(loadAppState().shifts).toHaveLength(1);
  });

  it("shows validation and calculation details for advanced options", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Select 2026-08-10" }));
    await user.click(screen.getByRole("button", { name: "More options" }));
    await user.click(screen.getByLabelText("Use clock in and out"));
    await user.type(screen.getByLabelText("Clock in"), "22:30");
    await user.type(screen.getByLabelText("Clock out"), "02:00");
    await user.type(screen.getByLabelText("Unpaid break hours"), "0.5");
    await user.type(screen.getByLabelText("Manual tip-out"), "999");
    await user.click(screen.getByRole("button", { name: "Calculation details" }));

    expect(screen.getByText("Cross-midnight shift")).toBeInTheDocument();
    expect(screen.getByText("Tip-out cannot be higher than total income.")).toBeInTheDocument();
    expect(screen.getByText(/Effective hours: 3/)).toBeInTheDocument();
  });
});
