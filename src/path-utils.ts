/* VIVENTIUM START
 * Purpose: Viventium-owned addition copied into LibreChat fork.
 * Details: docs/requirements_and_learnings/05_Open_Source_Modifications.md#librechat-viventium-additions
 * VIVENTIUM END */
// ===== VIVENTIUM MOD START =====
// Normalize HTML entities in generated Graph paths.
export function normalizeGraphPath(path: string): string {
  return path
    .replace(/&#x3D;/g, '=')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&');
}
// ===== VIVENTIUM MOD END =====
