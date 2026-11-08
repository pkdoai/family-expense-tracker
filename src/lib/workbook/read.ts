import { XlsxPackage } from "./package";
import { contentFromCell } from "./cell-math";
import type { SheetDoc } from "./sheet";
import {
  WorkbookError,
  type CategorySection,
  type SectionColumns,
  type WorkbookCategory,
  type WorkbookSummary,
  type WorkbookWeek,
} from "./types";

const START_HERE = "Start Here";
const WEEK_TAB = /^Week (\d+)$/;
/** A week-tab category label is a pointer into CategoryAdditions (or a debt name on Start Here). */
const LABEL_REF = /^'?([^'!]+)'?!\$?([A-Z]+)\$?(\d+)$/;
const DEBT_PLACEHOLDER = /^debt\s*\d+\s*:?$/i;

const COLS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function normalizeLabel(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/['’]$/, "")
    .trim();
}

function isUnused(label: string): boolean {
  return label === "" || /^do not use$/i.test(label);
}

export function serialToIso(serial: number, date1904: boolean): string {
  const base = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
  return new Date(base + Math.round(serial) * 86_400_000).toISOString().slice(0, 10);
}

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function daysBetweenIso(fromIso: string, toIso: string): number {
  const [y1, m1, d1] = fromIso.split("-").map(Number);
  const [y2, m2, d2] = toIso.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

interface Candidate {
  row: number;
  formula: string;
}

/** Rows whose label cell (column C) is a formula pointing at CategoryAdditions or a debt name on Start Here. */
function findCandidates(doc: SheetDoc): Candidate[] {
  const out: Candidate[] = [];
  for (const ref of doc.refs()) {
    const m = /^C(\d+)$/.exec(ref);
    if (!m) continue;
    const cell = doc.read(ref);
    if (cell.kind !== "formula" || !cell.formula) continue;
    const f = LABEL_REF.exec(cell.formula);
    if (!f) continue;
    if (f[1] !== "CategoryAdditions" && f[1] !== START_HERE) continue;
    out.push({ row: Number(m[1]), formula: cell.formula });
  }
  return out.sort((a, b) => a.row - b.row);
}

async function resolveLabel(pkg: XlsxPackage, doc: SheetDoc, row: number, formula: string): Promise<string> {
  const f = LABEL_REF.exec(formula);
  if (f && pkg.hasSheet(f[1])) {
    const target = await pkg.sheet(f[1]);
    return normalizeLabel(target.textOf(`${f[2]}${f[3]}`));
  }
  return normalizeLabel(doc.textOf(`C${row}`));
}

function findTotalRow(doc: SheetDoc, pattern: RegExp): number | null {
  let found: number | null = null;
  for (const ref of doc.refs()) {
    const m = /^C(\d+)$/.exec(ref);
    if (!m) continue;
    if (pattern.test(doc.textOf(ref).trim())) {
      const row = Number(m[1]);
      if (found === null || row < found) found = row;
    }
  }
  return found;
}

interface HeaderRow {
  row: number;
  columns: SectionColumns;
}

/** Header rows are the ones that carry both a "Plan" and an "Actual" column heading. */
function findHeaderRows(doc: SheetDoc): HeaderRow[] {
  const rows = new Set<number>();
  for (const ref of doc.refs()) {
    const m = /^([A-Z]+)(\d+)$/.exec(ref);
    if (m && m[1].length === 1) rows.add(Number(m[2]));
  }
  const out: HeaderRow[] = [];
  for (const row of [...rows].sort((a, b) => a - b)) {
    let plan: string | null = null;
    let actual: string | null = null;
    let creditCard: string | null = null;
    let notes: string | null = null;
    for (const col of COLS) {
      const t = doc.textOf(`${col}${row}`).trim().toLowerCase();
      if (t === "plan") plan = col;
      else if (t === "actual") actual = col;
      else if (t === "credit card actual") creditCard = col;
      else if (/^notes:?$/.test(t)) notes = col;
    }
    if (plan && actual && notes) out.push({ row, columns: { plan, actual, creditCard, notes } });
  }
  return out;
}

function parseStartHereAmountRef(formula: string): string | null {
  const f = LABEL_REF.exec(formula);
  if (!f || f[1] !== START_HERE) return null;
  return `B${f[3]}`;
}

export async function readWorkbookSummary(pkg: XlsxPackage): Promise<WorkbookSummary> {
  if (!pkg.hasSheet(START_HERE) || !pkg.hasSheet("CategoryAdditions")) {
    throw new WorkbookError(
      "layout",
      'This doesn\'t look like a Spending Plan workbook — it needs "Start Here" and "CategoryAdditions" tabs.',
    );
  }

  const weekTabs = pkg
    .sheetNames()
    .map((name) => ({ name, m: WEEK_TAB.exec(name) }))
    .filter((x): x is { name: string; m: RegExpExecArray } => Boolean(x.m))
    .map((x) => ({ name: x.name, number: Number(x.m[1]) }))
    .sort((a, b) => a.number - b.number);
  if (weekTabs.length === 0) throw new WorkbookError("layout", 'The workbook has no "Week" tabs.');

  const start = await pkg.sheet(START_HERE);
  const familyName = start.textOf("B5").trim();
  const startSerial = start.numberOf("B6");
  if (startSerial === null) {
    throw new WorkbookError("layout", "The Week 0 program start date (Start Here, cell B6) is empty.");
  }
  const startDate = serialToIso(startSerial, pkg.date1904);

  const template = weekTabs.find((w) => w.number === 1) ?? weekTabs[0];
  const tdoc = await pkg.sheet(template.name);

  const incomeTotal = findTotalRow(tdoc, /^total available to spend/i);
  const fixedTotal = findTotalRow(tdoc, /^total fixed expenses/i);
  const variableTotal = findTotalRow(tdoc, /^total variable expenses/i);
  if (!incomeTotal || !fixedTotal || !variableTotal) {
    throw new WorkbookError(
      "layout",
      `The ${template.name} tab doesn't have the expected "Total Available to Spend / Fixed / Variable" rows.`,
    );
  }

  const candidates = findCandidates(tdoc);
  const sectionOf = (row: number): CategorySection | null =>
    row < incomeTotal ? "income" : row < fixedTotal ? "fixed" : row < variableTotal ? "variable" : null;

  const headers = findHeaderRows(tdoc);
  const columns = {} as Record<CategorySection, SectionColumns>;
  for (const section of ["income", "fixed", "variable"] as const) {
    const first = candidates.find((c) => sectionOf(c.row) === section);
    if (!first) throw new WorkbookError("layout", `The ${template.name} tab has no ${section} category rows.`);
    const header = [...headers].reverse().find((h) => h.row < first.row);
    if (!header) {
      throw new WorkbookError("layout", `Couldn't find the Plan / Actual / Notes column headings above the ${section} rows.`);
    }
    columns[section] = header.columns;
  }
  if (!columns.fixed.creditCard || !columns.variable.creditCard) {
    throw new WorkbookError("layout", 'Couldn\'t find the "Credit Card Actual" column in the expense sections.');
  }

  const categories: WorkbookCategory[] = [];
  for (const c of candidates) {
    const section = sectionOf(c.row);
    if (!section) continue;
    if (tdoc.isRowHidden(c.row)) continue;
    const label = await resolveLabel(pkg, tdoc, c.row, c.formula);
    if (isUnused(label)) continue;

    const amountRef = parseStartHereAmountRef(c.formula);
    if (amountRef) {
      // A debt slot is only in use once it's been renamed or given a balance.
      const amount = start.numberOf(amountRef) ?? 0;
      if (DEBT_PLACEHOLDER.test(label) && amount <= 0) continue;
    }

    categories.push({
      id: `row-${c.row}`,
      row: c.row,
      label,
      section,
      isCreditCardPayment: /credit card payment/i.test(label),
    });
  }
  if (categories.length === 0) throw new WorkbookError("layout", "No usable categories were found in the workbook.");

  // Every week tab must share the template's row layout — the app writes by row number.
  for (const week of weekTabs) {
    if (week.name === template.name) continue;
    const doc = await pkg.sheet(week.name);
    for (const c of candidates) {
      const here = doc.read(`C${c.row}`);
      if (here.kind !== "formula" || here.formula !== c.formula) {
        throw new WorkbookError(
          "layout",
          `The "${week.name}" tab doesn't match the layout of "${template.name}" (row ${c.row}). The app can't safely write to it.`,
        );
      }
    }
  }

  const weeks: WorkbookWeek[] = weekTabs.map((w) => ({
    number: w.number,
    sheet: w.name,
    start: addDaysIso(startDate, w.number * 7),
    end: addDaysIso(startDate, w.number * 7 + 6),
  }));

  const planCents: Record<string, Record<string, number>> = {};
  for (const week of weekTabs) {
    const doc = await pkg.sheet(week.name);
    const byCat: Record<string, number> = {};
    for (const cat of categories) {
      const v = doc.numberOf(`${columns[cat.section].plan}${cat.row}`);
      if (v !== null && v > 0) byCat[cat.id] = Math.round(v * 100);
    }
    planCents[String(week.number)] = byCat;
  }

  // Cells the app could never write to — found now so the entry form can say so up front.
  const blocked: string[] = [];
  for (const week of weekTabs) {
    const doc = await pkg.sheet(week.name);
    for (const cat of categories) {
      const cols = columns[cat.section];
      const targets = [cols.actual, ...(cols.creditCard && cat.section !== "income" ? [cols.creditCard] : [])];
      for (const col of targets) {
        const ref = `${col}${cat.row}`;
        const data = doc.read(ref);
        try {
          if (!data.exists) throw new Error("missing");
          contentFromCell(ref, data);
        } catch {
          blocked.push(`${week.name}!${ref}`);
        }
      }
      const notesRef = `${cols.notes}${cat.row}`;
      const notes = doc.read(notesRef);
      if (!notes.exists || (notes.kind !== "empty" && notes.kind !== "text")) blocked.push(`${week.name}!${notesRef}`);
    }
  }

  return { familyName, startDate, weeks, categories, columns, planCents, blocked };
}
