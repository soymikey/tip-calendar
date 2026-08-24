import { render, screen } from "@testing-library/react";
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

    await user.clear(screen.getByLabelText("Restaurant name"));
    await user.type(screen.getByLabelText("Restaurant name"), "Blue Plate Diner");
    await user.click(screen.getByLabelText("Fixed pay per shift"));
    await user.clear(screen.getByLabelText("Pay amount"));
    await user.type(screen.getByLabelText("Pay amount"), "95");
    await user.click(screen.getByRole("button", { name: "Save settings" }));

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

    await user.clear(screen.getByLabelText("Restaurant name"));
    await user.type(screen.getByLabelText("Restaurant name"), "Changed");
    await user.click(screen.getByRole("button", { name: "Save settings" }));
    await user.click(screen.getByRole("button", { name: "Reset demo data" }));

    expect(screen.getByDisplayValue(demoState.restaurant.name)).toBeInTheDocument();
    expect(screen.getByText("Demo data restored.")).toBeInTheDocument();
  });
});
