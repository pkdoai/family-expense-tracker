import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { XlsxPackage, readWorkbookSummary, planWrite, applyChanges, findMissingWrites } from "..";

/**
 * Runs only when SPENDING_PLAN_SAMPLE points at a real workbook on disk.
 * The program's template is deliberately not committed to this (public) repo.
 */
const samplePath = process.env.SPENDING_PLAN_SAMPLE;

describe.skipIf(!samplePath || !existsSync(samplePath))("real spending plan workbook", () => {
  const bytes = () => new Uint8Array(readFileSync(samplePath!));

  it("reads family, dates, weeks and categories", async () => {
    const pkg = await XlsxPackage.open(bytes());
    const s = await readWorkbookSummary(pkg);
    console.log(JSON.stringify({ family: s.familyName, start: s.startDate, weeks: s.weeks.length, first: s.weeks[0], last: s.weeks.at(-1), columns: s.columns }, null, 1));
    console.log(s.categories.map((c) => `${c.row} [${c.section}] ${c.label}${c.isCreditCardPayment ? " (CCP)" : ""}`).join("\n"));
    console.log("plan week1:", JSON.stringify(s.planCents["1"]));
    expect(s.weeks).toHaveLength(17);
    expect(s.categories.length).toBeGreaterThan(20);
  });

  it("writes an expense, saves, reopens, and only the intended cells differ", async () => {
    const pkg = await XlsxPackage.open(bytes());
    const s = await readWorkbookSummary(pkg);
    const groceries = s.categories.find((c) => /groceries/i.test(c.label))!;
    const w = planWrite(s, { date: "2024-12-20", amountCents: 4218, categoryId: groceries.id, description: "Kroger", payment: "debit" });
    const w2 = planWrite(s, { date: "2024-12-21", amountCents: 3107, categoryId: groceries.id, description: "Target", payment: "credit" });
    console.log(w, w2);
    await applyChanges(pkg, { remove: [], add: [w, w2] });
    const out = await pkg.save();
    if (process.env.SPENDING_PLAN_OUT) writeFileSync(process.env.SPENDING_PLAN_OUT, out);

    const re = await XlsxPackage.open(out);
    const s2 = await readWorkbookSummary(re);
    expect(s2.categories.length).toBe(s.categories.length);
    const doc = await re.sheet(w.sheet);
    console.log("G:", doc.read(w.cell), "notes:", doc.read(w.noteCell).text);
    expect(await findMissingWrites(re, [w, w2])).toEqual([]);

    // undo both → back to empty cells
    await applyChanges(re, { remove: [w, w2], add: [] });
    const d2 = await re.sheet(w.sheet);
    expect(d2.read(w.cell).kind).toBe("empty");
    expect(d2.read(w.noteCell).kind).toBe("empty");
  });
});
