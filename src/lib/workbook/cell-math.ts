import { WorkbookError } from "./types";

/**
 * What an Actual / Credit Card Actual cell currently holds, as far as the
 * app cares. Anything else (text, errors, shared formulas) is a conflict —
 * the app refuses to write rather than guess.
 */
export type CellContent =
  | { kind: "empty" }
  | { kind: "number"; text: string }
  | { kind: "formula"; expr: string };

/** 5 -> "5", 8.5 -> "8.50", 10.99 -> "10.99" (cents in, spreadsheet term out). */
export function formatTerm(cents: number): string {
  if (!Number.isInteger(cents) || cents <= 0) throw new Error(`Invalid amount: ${cents}`);
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

const PURE_SUM = /^\d+(\.\d+)?(\+\d+(\.\d+)?)*$/;

/** The cached value to store next to a formula, when the formula is nothing but numbers added together. */
export function evaluatePureSum(expr: string): number | null {
  if (!PURE_SUM.test(expr)) return null;
  const cents = expr.split("+").reduce((sum, t) => sum + Math.round(parseFloat(t) * 100), 0);
  return cents / 100;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function appendTerm(content: CellContent, term: string): CellContent {
  switch (content.kind) {
    case "empty":
      return { kind: "number", text: term };
    case "number":
      return { kind: "formula", expr: `${content.text}+${term}` };
    case "formula":
      return { kind: "formula", expr: `${content.expr}+${term}` };
  }
}

/** Normalise a result like "5" (a formula that is just a number) back to a plain number cell. */
function simplify(content: CellContent): CellContent {
  if (content.kind === "formula" && /^\d+(\.\d+)?$/.test(content.expr)) {
    return { kind: "number", text: content.expr };
  }
  return content;
}

/**
 * Remove one previously-added "+term" and nothing else. Returns null when the
 * term can't be found — meaning the cell was changed in the spreadsheet since
 * the app wrote it.
 */
export function removeTerm(content: CellContent, term: string): CellContent | null {
  const same = (a: string, b: string) => Math.round(parseFloat(a) * 100) === Math.round(parseFloat(b) * 100);

  if (content.kind === "empty") return null;
  if (content.kind === "number") return same(content.text, term) ? { kind: "empty" } : null;

  const expr = content.expr;
  // 1) a trailing/embedded "+term" not followed by more digits (so "+5" never matches inside "+5.50")
  const re = new RegExp(`\\+${escapeRegExp(term)}(?![0-9.])`, "g");
  let last: RegExpExecArray | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(expr))) last = m;
  if (last) {
    return simplify({ kind: "formula", expr: expr.slice(0, last.index) + expr.slice(last.index + last[0].length) });
  }
  // 2) the term is the first one: "term+rest"
  const lead = new RegExp(`^${escapeRegExp(term)}\\+`);
  if (lead.test(expr)) return simplify({ kind: "formula", expr: expr.replace(lead, "") });
  // 3) the formula is exactly the term
  if (expr === term) return { kind: "empty" };
  return null;
}

export function contentFromCell(
  ref: string,
  cell: { kind: string; numberText?: string; formula?: string; sharedFormula?: boolean },
): CellContent {
  if (cell.sharedFormula) {
    throw new WorkbookError("conflict", `Cell ${ref} is part of a shared formula, so the app won't change it.`);
  }
  switch (cell.kind) {
    case "empty":
      return { kind: "empty" };
    case "number":
      return { kind: "number", text: cell.numberText ?? "0" };
    case "formula":
      return { kind: "formula", expr: cell.formula ?? "" };
    default:
      throw new WorkbookError("conflict", `Cell ${ref} holds something other than a number, so the app won't change it.`);
  }
}

/** Remove one note segment ("9/20 Kroger $42.18 (debit)") from a Notes cell's text. */
export function removeNoteSegment(text: string, segment: string): string | null {
  const parts = text.split("; ");
  const i = parts.lastIndexOf(segment);
  if (i === -1) return text === segment ? "" : null;
  parts.splice(i, 1);
  return parts.join("; ");
}

export function appendNoteSegment(text: string, segment: string): string {
  return text.trim() ? `${text}; ${segment}` : segment;
}
