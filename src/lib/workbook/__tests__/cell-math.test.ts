import { describe, expect, it } from "vitest";

import {
  appendNoteSegment,
  appendTerm,
  evaluatePureSum,
  formatTerm,
  removeNoteSegment,
  removeTerm,
  type CellContent,
} from "../cell-math";

const empty: CellContent = { kind: "empty" };
const num = (text: string): CellContent => ({ kind: "number", text });
const f = (expr: string): CellContent => ({ kind: "formula", expr });

describe("formatTerm", () => {
  it("prints whole dollars plainly and everything else to 2 places", () => {
    expect(formatTerm(500)).toBe("5");
    expect(formatTerm(850)).toBe("8.50");
    expect(formatTerm(1099)).toBe("10.99");
    expect(formatTerm(5)).toBe("0.05");
  });
  it("rejects non-positive or fractional cents", () => {
    expect(() => formatTerm(0)).toThrow();
    expect(() => formatTerm(1.5)).toThrow();
  });
});

describe("appendTerm — builds the sum formula from the spec (10.99 + 5 + 8.50)", () => {
  it("empty -> number, number -> formula, formula -> longer formula", () => {
    const a = appendTerm(num("10.99"), "5");
    expect(a).toEqual(f("10.99+5"));
    expect(appendTerm(a, "8.50")).toEqual(f("10.99+5+8.50"));
    expect(appendTerm(empty, "5")).toEqual(num("5"));
  });
});

describe("removeTerm — undoes only the app's own term", () => {
  it("removes the last matching term and leaves hand-typed amounts", () => {
    expect(removeTerm(f("10.99+5+8.50"), "5")).toEqual(f("10.99+8.50"));
    expect(removeTerm(f("10.99+5+8.50"), "8.50")).toEqual(f("10.99+5"));
  });
  it("collapses back to a plain number, then to empty", () => {
    expect(removeTerm(f("10.99+5"), "5")).toEqual(num("10.99"));
    expect(removeTerm(num("5"), "5")).toEqual(empty);
    expect(removeTerm(f("5"), "5")).toEqual(empty);
  });
  it("can remove the first term", () => {
    expect(removeTerm(f("5+8.50"), "5")).toEqual(num("8.50"));
  });
  it('never matches "5" inside "5.50" or "15"', () => {
    expect(removeTerm(f("10+5.50"), "5")).toBeNull();
    expect(removeTerm(f("10+15"), "5")).toBeNull();
  });
  it("works inside formulas the family typed by hand", () => {
    expect(removeTerm(f("SUM(A1:A3)+12.25"), "12.25")).toEqual(f("SUM(A1:A3)"));
  });
  it("returns null when the cell was changed in the spreadsheet", () => {
    expect(removeTerm(empty, "5")).toBeNull();
    expect(removeTerm(num("7"), "5")).toBeNull();
    expect(removeTerm(f("10+3"), "5")).toBeNull();
  });
  it("round-trips: append then remove restores the original content", () => {
    for (const start of [empty, num("10.99"), f("10.99+2")]) {
      expect(removeTerm(appendTerm(start, "42.18"), "42.18")).toEqual(start);
    }
  });
});

describe("evaluatePureSum", () => {
  it("adds in cents (no floating-point drift) and refuses anything else", () => {
    expect(evaluatePureSum("10.99+5+8.50")).toBe(24.49);
    expect(evaluatePureSum("0.10+0.20")).toBe(0.3);
    expect(evaluatePureSum("SUM(A1:A3)+5")).toBeNull();
  });
});

describe("notes", () => {
  it("appends after existing text and removes only its own segment", () => {
    const a = appendNoteSegment("", "9/20 Kroger $42.18 (debit)");
    const b = appendNoteSegment(a, "9/25 Target $31.07 (credit card)");
    expect(b).toBe("9/20 Kroger $42.18 (debit); 9/25 Target $31.07 (credit card)");
    expect(removeNoteSegment(b, "9/20 Kroger $42.18 (debit)")).toBe("9/25 Target $31.07 (credit card)");
    expect(removeNoteSegment(b, "9/25 Target $31.07 (credit card)")).toBe("9/20 Kroger $42.18 (debit)");
    expect(removeNoteSegment("hand written", "9/20 x")).toBeNull();
  });
  it("keeps a case worker's own note text", () => {
    expect(appendNoteSegment("Paid late fee", "9/20 Kroger $5 (cash)")).toBe("Paid late fee; 9/20 Kroger $5 (cash)");
  });
});
