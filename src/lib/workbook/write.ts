import { XlsxPackage } from "./package";
import {
  appendNoteSegment,
  appendTerm,
  contentFromCell,
  formatTerm,
  removeNoteSegment,
  removeTerm,
  type CellContent,
} from "./cell-math";
import { addDaysIso, daysBetweenIso } from "./read";
import {
  PAYMENT_TYPES,
  WorkbookError,
  type PaymentType,
  type SheetWrite,
  type WorkbookSummary,
} from "./types";

export interface ExpenseForWrite {
  /** ISO yyyy-MM-dd */
  date: string;
  amountCents: number;
  categoryId: string;
  description: string;
  /** Required for expense categories; ignored for income. */
  payment: PaymentType | null;
}

/** Week number (0-based, as on the workbook's tabs) that a date falls in, or null when outside the program. */
export function weekNumberForIsoDate(summary: WorkbookSummary, iso: string): number | null {
  const n = Math.floor(daysBetweenIso(summary.startDate, iso) / 7);
  return summary.weeks.some((w) => w.number === n) ? n : null;
}

export function formatNoteDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}/${d}`;
}

/**
 * Decide exactly which cells one expense touches. Pure — no workbook access —
 * so the app can show where an entry will land before anything is written.
 */
export function planWrite(summary: WorkbookSummary, e: ExpenseForWrite): SheetWrite {
  const category = summary.categories.find((c) => c.id === e.categoryId);
  if (!category) throw new WorkbookError("layout", "That category isn't in the loaded spreadsheet.");

  const week = weekNumberForIsoDate(summary, e.date);
  if (week === null) {
    const first = summary.weeks[0];
    const last = summary.weeks[summary.weeks.length - 1];
    throw new WorkbookError("date", `That date is outside the program (${first.start} to ${last.end}).`);
  }
  const sheet = summary.weeks.find((w) => w.number === week)!.sheet;
  const cols = summary.columns[category.section];

  let column = cols.actual;
  let how: string;
  if (category.section === "income") {
    how = "received";
  } else {
    if (!e.payment) throw new WorkbookError("layout", "Pick how this was paid.");
    if (e.payment === "credit" && !category.isCreditCardPayment) column = cols.creditCard!;
    how = PAYMENT_TYPES.find((p) => p.id === e.payment)!.noteLabel;
  }

  const cell = `${column}${category.row}`;
  const noteCell = `${cols.notes}${category.row}`;
  for (const ref of [cell, noteCell]) {
    if (summary.blocked.includes(`${sheet}!${ref}`)) {
      throw new WorkbookError(
        "conflict",
        `${category.label} can't take entries for that week — cell ${ref} on "${sheet}" isn't a plain number or text cell. Ask a Case Manager to check the spreadsheet.`,
      );
    }
  }

  const dollars = (e.amountCents / 100).toFixed(2);
  const desc = e.description.replace(/\s+/g, " ").trim();
  return {
    sheet,
    cell,
    term: formatTerm(e.amountCents),
    noteCell,
    noteSegment: `${formatNoteDate(e.date)} ${desc} $${dollars} (${how})`,
  };
}

function sameWrite(a: SheetWrite, b: SheetWrite): boolean {
  return (
    a.sheet === b.sheet &&
    a.cell === b.cell &&
    a.term === b.term &&
    a.noteCell === b.noteCell &&
    a.noteSegment === b.noteSegment
  );
}

export function writesEqual(a: SheetWrite | null | undefined, b: SheetWrite | null | undefined): boolean {
  if (!a || !b) return !a && !b;
  return sameWrite(a, b);
}

export interface ChangeSet {
  remove: SheetWrite[];
  add: SheetWrite[];
}

export interface ApplyResult {
  /** Notes that couldn't be removed (the Notes cell was edited by hand) — informational only. */
  warnings: string[];
}

async function readContent(pkg: XlsxPackage, sheet: string, cell: string): Promise<CellContent> {
  const doc = await pkg.sheet(sheet);
  const data = doc.read(cell);
  if (!data.exists) {
    throw new WorkbookError("layout", `Cell ${cell} on "${sheet}" doesn't exist, so the app can't write there.`);
  }
  return contentFromCell(cell, data);
}

/**
 * Apply removals then additions to an opened workbook. Throws a conflict
 * error — before saving anything — if a cell no longer looks like what the
 * app wrote (someone edited it in the spreadsheet).
 */
export async function applyChanges(pkg: XlsxPackage, changes: ChangeSet): Promise<ApplyResult> {
  const warnings: string[] = [];

  for (const w of changes.remove) {
    const doc = await pkg.sheet(w.sheet);
    const current = await readContent(pkg, w.sheet, w.cell);
    const next = removeTerm(current, w.term);
    if (!next) {
      throw new WorkbookError(
        "conflict",
        `Couldn't undo $${w.term} in ${w.sheet}!${w.cell} — that cell was changed in the spreadsheet. Correct it there instead.`,
      );
    }
    doc.writeContent(w.cell, next);

    const noteData = doc.read(w.noteCell);
    if (noteData.kind === "text" || (noteData.kind === "formula" && noteData.text !== undefined)) {
      const updated = removeNoteSegment(noteData.text ?? "", w.noteSegment);
      if (updated === null) warnings.push(`The note for ${w.sheet}!${w.noteCell} was edited by hand, so it was left as is.`);
      else doc.writeText(w.noteCell, updated);
    }
  }

  for (const w of changes.add) {
    const doc = await pkg.sheet(w.sheet);
    const current = await readContent(pkg, w.sheet, w.cell);
    doc.writeContent(w.cell, appendTerm(current, w.term));

    const noteData = doc.read(w.noteCell);
    if (!noteData.exists) throw new WorkbookError("layout", `Notes cell ${w.noteCell} on "${w.sheet}" doesn't exist.`);
    if (noteData.kind !== "empty" && noteData.kind !== "text") {
      throw new WorkbookError("conflict", `Notes cell ${w.sheet}!${w.noteCell} holds a formula or number, so the app won't change it.`);
    }
    doc.writeText(w.noteCell, appendNoteSegment(noteData.text ?? "", w.noteSegment));
  }

  return { warnings };
}

/** Which of the given writes can no longer be found in this workbook (e.g. an older copy was loaded). */
export async function findMissingWrites(pkg: XlsxPackage, writes: SheetWrite[]): Promise<SheetWrite[]> {
  const missing: SheetWrite[] = [];
  const state = new Map<string, CellContent | null>();
  for (const w of writes) {
    const key = `${w.sheet}!${w.cell}`;
    let content = state.get(key);
    if (content === undefined) {
      try {
        content = await readContent(pkg, w.sheet, w.cell);
      } catch {
        content = null;
      }
    }
    const next = content ? removeTerm(content, w.term) : null;
    if (next) state.set(key, next);
    else {
      state.set(key, content);
      missing.push(w);
    }
  }
  return missing;
}

export { addDaysIso };
