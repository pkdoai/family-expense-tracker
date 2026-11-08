import { escapeXml, parseAttrs, unescapeXml } from "./xml";
import type { CellContent } from "./cell-math";
import { evaluatePureSum } from "./cell-math";

export interface CellData {
  ref: string;
  exists: boolean;
  kind: "empty" | "number" | "text" | "formula" | "error" | "bool";
  /** Raw numeric text exactly as stored (e.g. "10.99"). */
  numberText?: string;
  number?: number;
  /** Text content for string cells; cached result text for formula cells that return text. */
  text?: string;
  formula?: string;
  sharedFormula: boolean;
}

interface Span {
  start: number;
  end: number;
}

const CELL_RE = /<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;

/** One worksheet's XML, with cheap cell lookup and surgical cell replacement. */
export class SheetDoc {
  private index: Map<string, Span> | null = null;
  private hiddenRows: Set<number> | null = null;
  dirty = false;

  constructor(
    public xml: string,
    private readonly sst: string[],
  ) {}

  private buildIndex(): Map<string, Span> {
    if (this.index) return this.index;
    const idx = new Map<string, Span>();
    const re = new RegExp(CELL_RE.source, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(this.xml))) idx.set(m[1], { start: m.index, end: m.index + m[0].length });
    this.index = idx;
    return idx;
  }

  refs(): string[] {
    return [...this.buildIndex().keys()];
  }

  isRowHidden(row: number): boolean {
    if (!this.hiddenRows) {
      const set = new Set<number>();
      const re = /<row r="(\d+)"([^>]*)>/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(this.xml))) {
        if (/\shidden="(1|true)"/.test(m[2])) set.add(Number(m[1]));
      }
      this.hiddenRows = set;
    }
    return this.hiddenRows.has(row);
  }

  read(ref: string): CellData {
    const span = this.buildIndex().get(ref);
    if (!span) return { ref, exists: false, kind: "empty", sharedFormula: false };
    const source = this.xml.slice(span.start, span.end);
    const open = /^<c\b([^>]*?)(\/?)>/.exec(source);
    const attrs = parseAttrs(open ? open[1] : "");
    const inner = /^<c\b[^>]*?>([\s\S]*)<\/c>$/.exec(source)?.[1] ?? "";

    const fm = /<f\b([^>]*?)(?:\/>|>([\s\S]*?)<\/f>)/.exec(inner);
    const vm = /<v>([\s\S]*?)<\/v>/.exec(inner);
    const isTexts = /<is>([\s\S]*?)<\/is>/.exec(inner);
    const t = attrs.t;
    const rawV = vm ? unescapeXml(vm[1]) : undefined;

    const base: CellData = { ref, exists: true, kind: "empty", sharedFormula: false };

    if (fm) {
      const fAttrs = parseAttrs(fm[1]);
      base.sharedFormula = fAttrs.t === "shared";
      base.formula = unescapeXml(fm[2] ?? "");
      base.kind = "formula";
      if (t === "str" && rawV !== undefined) base.text = rawV;
      else if (t === "s" && rawV !== undefined) base.text = this.sst[Number(rawV)];
      else if (rawV !== undefined && (t === undefined || t === "n")) {
        base.numberText = rawV;
        base.number = Number(rawV);
      }
      return base;
    }

    if (t === "inlineStr" && isTexts) {
      base.kind = "text";
      base.text = [...isTexts[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((x) => unescapeXml(x[1])).join("");
      return base;
    }
    if (t === "s" && rawV !== undefined) {
      base.kind = "text";
      base.text = this.sst[Number(rawV)] ?? "";
      return base;
    }
    if (t === "str" && rawV !== undefined) {
      base.kind = "text";
      base.text = rawV;
      return base;
    }
    if (t === "e") return { ...base, kind: "error", text: rawV };
    if (t === "b") return { ...base, kind: "bool", text: rawV };
    if (rawV !== undefined && rawV !== "") {
      base.kind = "number";
      base.numberText = rawV;
      base.number = Number(rawV);
    }
    return base;
  }

  /** Plain text of a cell whatever its kind (shared string, inline, formula result, number). */
  textOf(ref: string): string {
    const c = this.read(ref);
    if (c.kind === "number") return c.numberText ?? "";
    if (c.kind === "formula") return c.text ?? c.numberText ?? "";
    return c.text ?? "";
  }

  numberOf(ref: string): number | null {
    const c = this.read(ref);
    return typeof c.number === "number" && Number.isFinite(c.number) ? c.number : null;
  }

  private styleAttr(ref: string): string {
    const span = this.buildIndex().get(ref);
    if (!span) return "";
    const open = /^<c\b([^>]*?)\/?>/.exec(this.xml.slice(span.start, span.end));
    const s = open ? parseAttrs(open[1]).s : undefined;
    return s ? ` s="${s}"` : "";
  }

  private replaceCell(ref: string, replacement: string) {
    const span = this.buildIndex().get(ref);
    if (!span) throw new Error(`Cell ${ref} does not exist in this sheet`);
    this.xml = this.xml.slice(0, span.start) + replacement + this.xml.slice(span.end);
    this.index = null;
    this.dirty = true;
  }

  /** Write an Actual-style numeric/formula cell, keeping the cell's existing style. */
  writeContent(ref: string, content: CellContent) {
    const s = this.styleAttr(ref);
    if (content.kind === "empty") return this.replaceCell(ref, `<c r="${ref}"${s}/>`);
    if (content.kind === "number") return this.replaceCell(ref, `<c r="${ref}"${s}><v>${content.text}</v></c>`);
    const cached = evaluatePureSum(content.expr);
    const v = cached === null ? "" : `<v>${cached}</v>`;
    this.replaceCell(ref, `<c r="${ref}"${s}><f>${escapeXml(content.expr)}</f>${v}</c>`);
  }

  /** Write a text cell as an inline string (leaves the shared-strings table untouched). */
  writeText(ref: string, text: string) {
    const s = this.styleAttr(ref);
    if (text === "") return this.replaceCell(ref, `<c r="${ref}"${s}/>`);
    this.replaceCell(
      ref,
      `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`,
    );
  }
}
