// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./button";
import { Chip } from "./chip";

describe("ui primitives", () => {
  it("renders a primary (solid ink) button by default", () => {
    render(<Button>Check availability</Button>);
    const btn = screen.getByRole("button", { name: "Check availability" });
    expect(btn.className).toContain("bg-ink");
  });

  it("renders a secondary button with a hairline border", () => {
    render(<Button variant="secondary">See the cakes</Button>);
    const btn = screen.getByRole("button", { name: "See the cakes" });
    expect(btn.className).toContain("border-hairline");
  });

  it("applies the wine state style to a chip", () => {
    render(<Chip variant="wine">Selected</Chip>);
    const chip = screen.getByText("Selected");
    expect(chip.getAttribute("style")).toContain("--wine-bg");
  });

  it("maps a category variant to its fixed color", () => {
    render(<Chip variant="category-wedding">Wedding</Chip>);
    const chip = screen.getByText("Wedding");
    expect(chip.getAttribute("style")).toContain("--teal-bg");
  });
});
