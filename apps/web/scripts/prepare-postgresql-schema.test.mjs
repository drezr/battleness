import { describe, expect, it } from "vitest";
import { hasEquivalentSchemaContent, normalizeLineEndings } from "./prepare-postgresql-schema.mjs";

describe("PostgreSQL schema preparation", () => {
  it("compares generated schemas independently of line endings", () => {
    const lf = 'datasource db {\n  provider = "postgresql"\n}\n';
    const crlf = lf.replaceAll("\n", "\r\n");
    const cr = lf.replaceAll("\n", "\r");

    expect(normalizeLineEndings(crlf)).toBe(lf);
    expect(normalizeLineEndings(cr)).toBe(lf);
    expect(hasEquivalentSchemaContent(crlf, lf)).toBe(true);
    expect(hasEquivalentSchemaContent(cr, lf)).toBe(true);
  });

  it("still rejects stale schema content", () => {
    const current = 'datasource db {\r\n  provider = "sqlite"\r\n}\r\n';
    const generated = 'datasource db {\n  provider = "postgresql"\n}\n';

    expect(hasEquivalentSchemaContent(current, generated)).toBe(false);
  });
});
