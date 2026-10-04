import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";

describe("export CSV", () => {
  it("neutralise les formules malveillantes", () => {
    expect(csvCell("=HYPERLINK(\"http://evil\")")).toBe("\"'=HYPERLINK(\"\"http://evil\"\")\"");
    expect(csvCell("+33612345678")).toBe("\"'+33612345678\"");
    expect(csvCell("-2+3")).toBe("\"'-2+3\"");
    expect(csvCell("@SUM(A1)")).toBe("\"'@SUM(A1)\"");
    expect(csvCell("\t=1")).toBe("\"'\t=1\"");
    expect(csvCell("  =1")).toBe("\"'  =1\"");
  });

  it("échappe les guillemets et gère les valeurs vides", () => {
    expect(csvCell('Dupont "Jo"')).toBe('"Dupont ""Jo"""');
    expect(csvCell(null)).toBe('""');
    expect(csvCell(42)).toBe('"42"');
  });

  it("produit un fichier avec BOM, séparateur ; et fins de ligne CRLF", () => {
    const csv = toCsv([{ a: "x;y", b: "=1" }], [
      { header: "A", value: (r) => r.a },
      { header: "B", value: (r) => r.b },
    ]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toBe('﻿"A";"B"\r\n"x;y";"\'=1"\r\n');
  });
});
