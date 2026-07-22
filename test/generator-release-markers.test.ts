/* VIVENTIUM START
 * Purpose: Preserve public fork provenance when Graph artifacts are regenerated.
 * Details: Generated artifacts must remain deterministic and retain the public modification boundary.
 * VIVENTIUM END */
import { describe, expect, it } from 'vitest';
import { addTypeScriptProvenance } from '../bin/modules/generate-mcp-tools.mjs';
import { addYamlProvenance } from '../bin/modules/simplified-openapi.mjs';

describe('generated artifact provenance', () => {
  it('adds the TypeScript provenance header exactly once', () => {
    const source = "import { z } from 'zod';\n";
    const generated = addTypeScriptProvenance(source);

    expect(generated).toContain('VIVENTIUM START');
    expect(addTypeScriptProvenance(generated)).toBe(generated);
  });

  it('adds the YAML provenance header exactly once', () => {
    const source = 'openapi: 3.0.4\n';
    const generated = addYamlProvenance(source);

    expect(generated).toContain('# VIVENTIUM START');
    expect(addYamlProvenance(generated)).toBe(generated);
  });
});
