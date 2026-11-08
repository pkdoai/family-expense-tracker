import JSZip from "jszip";

import { SheetDoc } from "./sheet";
import { parseAttrs, unescapeXml } from "./xml";
import { WorkbookError } from "./types";

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * An opened .xlsx. Only the parts the app edits are ever rewritten; every
 * other part of the file (styles, comments, hidden sheets, sheet protection,
 * formulas elsewhere) is carried through byte-for-byte.
 */
export class XlsxPackage {
  private docs = new Map<string, SheetDoc>();
  private constructor(
    private readonly zip: JSZip,
    private readonly sheetPaths: Map<string, string>,
    private readonly sst: string[],
    readonly date1904: boolean,
  ) {}

  static async open(data: ArrayBuffer | Uint8Array): Promise<XlsxPackage> {
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(data);
    } catch {
      throw new WorkbookError("file", "That file isn't a valid Excel (.xlsx) workbook.");
    }
    const wbFile = zip.file("xl/workbook.xml");
    const relsFile = zip.file("xl/_rels/workbook.xml.rels");
    if (!wbFile || !relsFile) throw new WorkbookError("file", "That file isn't a valid Excel (.xlsx) workbook.");

    const wbXml = await wbFile.async("string");
    const relsXml = await relsFile.async("string");

    const targets = new Map<string, string>();
    for (const m of relsXml.matchAll(/<Relationship\b([^>]*?)\/?>/g)) {
      const a = parseAttrs(m[1]);
      if (a.Id && a.Target) targets.set(a.Id, a.Target);
    }

    const sheetPaths = new Map<string, string>();
    for (const m of wbXml.matchAll(/<sheet\b([^>]*?)\/?>/g)) {
      const a = parseAttrs(m[1]);
      const target = targets.get(a["r:id"]);
      if (!a.name || !target) continue;
      sheetPaths.set(a.name, target.startsWith("/") ? target.slice(1) : `xl/${target}`);
    }
    if (sheetPaths.size === 0) throw new WorkbookError("file", "That workbook has no worksheets.");

    let sst: string[] = [];
    const sstFile = zip.file("xl/sharedStrings.xml");
    if (sstFile) {
      const sstXml = await sstFile.async("string");
      sst = [...sstXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => {
        const noPhonetic = m[1].replace(/<rPh\b[\s\S]*?<\/rPh>/g, "");
        return [...noPhonetic.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((t) => unescapeXml(t[1])).join("");
      });
    }

    const date1904 = /<workbookPr\b[^>]*\bdate1904="(1|true)"/.test(wbXml);
    return new XlsxPackage(zip, sheetPaths, sst, date1904);
  }

  sheetNames(): string[] {
    return [...this.sheetPaths.keys()];
  }

  hasSheet(name: string): boolean {
    return this.sheetPaths.has(name);
  }

  async sheet(name: string): Promise<SheetDoc> {
    const cached = this.docs.get(name);
    if (cached) return cached;
    const path = this.sheetPaths.get(name);
    const file = path ? this.zip.file(path) : null;
    if (!path || !file) throw new WorkbookError("layout", `The workbook has no "${name}" tab.`);
    const doc = new SheetDoc(await file.async("string"), this.sst);
    this.docs.set(name, doc);
    return doc;
  }

  /**
   * Serialize. Excel is told to recalculate everything on open, and the
   * calculation-order cache is dropped (Excel rebuilds it silently) so no
   * stale entry can point at a cell whose formula the app removed.
   */
  async save(): Promise<Uint8Array> {
    for (const [name, doc] of this.docs) {
      if (!doc.dirty) continue;
      this.zip.file(this.sheetPaths.get(name)!, doc.xml, { createFolders: false });
    }

    const wbFile = this.zip.file("xl/workbook.xml");
    if (wbFile) {
      let wbXml = await wbFile.async("string");
      if (/<calcPr\b[^>]*\bfullCalcOnLoad=/.test(wbXml)) {
        wbXml = wbXml.replace(/(<calcPr\b[^>]*\bfullCalcOnLoad=")[^"]*(")/, (_m, a: string, b: string) => `${a}1${b}`);
      } else if (/<calcPr\b/.test(wbXml)) {
        wbXml = wbXml.replace(/<calcPr\b/, '<calcPr fullCalcOnLoad="1"');
      } else {
        wbXml = wbXml.replace(/<\/workbook>\s*$/, '<calcPr fullCalcOnLoad="1"/></workbook>');
      }
      this.zip.file("xl/workbook.xml", wbXml, { createFolders: false });
    }

    if (this.zip.file("xl/calcChain.xml")) {
      this.zip.remove("xl/calcChain.xml");
      const rels = this.zip.file("xl/_rels/workbook.xml.rels");
      if (rels) {
        const relsXml = (await rels.async("string")).replace(/<Relationship\b[^>]*calcChain[^>]*\/>/g, "");
        this.zip.file("xl/_rels/workbook.xml.rels", relsXml, { createFolders: false });
      }
      const types = this.zip.file("[Content_Types].xml");
      if (types) {
        const typesXml = (await types.async("string")).replace(/<Override\b[^>]*calcChain[^>]*\/>/g, "");
        this.zip.file("[Content_Types].xml", typesXml, { createFolders: false });
      }
    }

    return this.zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
  }
}
