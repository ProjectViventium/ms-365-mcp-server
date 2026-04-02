/* VIVENTIUM START
 * Purpose: Viventium-owned addition copied into LibreChat fork.
 * Details: docs/requirements_and_learnings/05_Open_Source_Modifications.md#librechat-viventium-additions
 * VIVENTIUM END */
import { describe, expect, it } from 'vitest';
// ===== PAI Mod Start =====
import { normalizeGraphPath } from '../src/path-utils.js';
// ===== PAI Mod End =====

describe('normalizeGraphPath', () => {
  it('decodes HTML entities in Graph paths', () => {
    // ===== PAI Mod Start =====
    const input =
      "/drives/:driveId/items/:driveItemId/workbook/worksheets/:workbookWorksheetId/range(address&#x3D;&#x27;:address&#x27;)";
    const expected =
      "/drives/:driveId/items/:driveItemId/workbook/worksheets/:workbookWorksheetId/range(address=':address')";

    expect(normalizeGraphPath(input)).toBe(expected);
    // ===== PAI Mod End =====
  });

  it('decodes &amp; in Graph paths', () => {
    // ===== PAI Mod Start =====
    const input = "/sites/:siteId/getByPath(path&#x3D;&#x27;:path&#x27;)&amp;$select=id";
    const expected = "/sites/:siteId/getByPath(path=':path')&$select=id";

    expect(normalizeGraphPath(input)).toBe(expected);
    // ===== PAI Mod End =====
  });
});
