import { describe, expect, it } from "vitest";

import { SheetDoc } from "../sheet";

const xml = (rows: string) =>
  `<?xml version="1.0"?><worksheet xmlns="x"><sheetData>${rows}</sheetData></worksheet>`;

describe("SheetDoc", () => {
  const sst = ["Groceries", "Notes"];
  const doc = () =>
    new SheetDoc(
      xml(
        `<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" s="3"/><c r="C1" t="str"><f>Other!$B$7</f><v>Gift cards</v></c></row>` +
          `<row r="2" hidden="1"><c r="A2"><v>12.5</v></c><c r="B2"><f t="shared" si="3"/><v>8</v></c><c r="G2" s="312"><f>10.99+5</f><v>15.99</v></c></row>`,
      ),
      sst,
    );

  it("reads shared strings, empties, formula text and cached results", () => {
    const d = doc();
    expect(d.read("A1")).toMatchObject({ kind: "text", text: "Groceries" });
    expect(d.read("B1")).toMatchObject({ exists: true, kind: "empty" });
    expect(d.read("C1")).toMatchObject({ kind: "formula", formula: "Other!$B$7", text: "Gift cards" });
    expect(d.read("A2")).toMatchObject({ kind: "number", numberText: "12.5", number: 12.5 });
    expect(d.read("B2").sharedFormula).toBe(true);
    expect(d.read("Z9").exists).toBe(false);
  });

  it("knows which rows are hidden", () => {
    const d = doc();
    expect(d.isRowHidden(1)).toBe(false);
    expect(d.isRowHidden(2)).toBe(true);
  });

  it("replaces one cell, keeps its style, and leaves every other byte alone", () => {
    const d = doc();
    const before = d.xml;
    d.writeContent("B1", { kind: "formula", expr: "5+8.50" });
    expect(d.read("B1")).toMatchObject({ kind: "formula", formula: "5+8.50", number: 13.5 });
    expect(d.xml).toContain('<c r="B1" s="3"><f>5+8.50</f><v>13.5</v></c>');
    expect(d.xml.replace(/<c r="B1"[^]*?<\/c>/, '<c r="B1" s="3"/>')).toBe(before);
    expect(d.dirty).toBe(true);
  });

  it("writes escaped inline text and can clear a cell", () => {
    const d = doc();
    d.writeText("B1", `9/20 Kroger & Sons $5 (cash)`);
    expect(d.read("B1")).toMatchObject({ kind: "text", text: "9/20 Kroger & Sons $5 (cash)" });
    expect(d.xml).toContain("Kroger &amp; Sons");
    d.writeText("B1", "");
    expect(d.read("B1").kind).toBe("empty");
  });

  it("doesn't confuse G2 with G20", () => {
    const d = new SheetDoc(xml(`<row r="2"><c r="G2"><v>1</v></c><c r="G20"><v>2</v></c></row>`), []);
    expect(d.read("G2").numberText).toBe("1");
    expect(d.read("G20").numberText).toBe("2");
  });
});
