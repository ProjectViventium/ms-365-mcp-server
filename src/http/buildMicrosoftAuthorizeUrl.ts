/* VIVENTIUM START
 * Purpose: Viventium-owned addition copied into LibreChat fork.
 * Details: docs/requirements_and_learnings/05_Open_Source_Modifications.md#librechat-viventium-additions
 * VIVENTIUM END */
/**
 * Build the Microsoft Entra authorization URL from an incoming `/authorize` request.
 *
 * Why this exists:
 * - LibreChat (via the MCP SDK) generates an authorization URL using the OAuth metadata we provide.
 * - The MCP SDK **automatically appends `prompt=consent` whenever the requested scope includes
 *   `offline_access`** (see `@modelcontextprotocol/sdk` `startAuthorization()`).
 * - In tenants where **user consent is restricted** for the requested Microsoft Graph scopes,
 *   forcing `prompt=consent` causes non-admin users to hit AADSTS90094 / "Need admin approval"
 *   even if an admin has already granted tenant-wide consent.
 *
 * This helper allows the server to safely strip the forced `prompt=consent` while still requesting
 * `offline_access` (refresh tokens) and other scopes.
 */
export function buildMicrosoftAuthorizeUrl(params: {
  /** Full request URL for our local `/authorize` endpoint */
  requestUrl: URL;
  /** Entra tenant identifier (tenant id GUID, 'organizations', etc.) */
  tenantId: string;
  /** Application (client) ID for the Entra app registration */
  clientId: string;
  /** Default scope used only if the caller did not provide a scope */
  defaultScope: string;
  /**
   * When true (default), removes `prompt=consent` from the forwarded request.
   * Other prompt values (e.g. `select_account`) are preserved.
   */
  stripPromptConsent?: boolean;
}): URL {
  const {
    requestUrl,
    tenantId,
    clientId,
    defaultScope,
    stripPromptConsent = true,
  } = params;

  const microsoftAuthUrl = new URL(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`);

  // Only forward parameters that Microsoft OAuth 2.0 v2.0 supports
  const allowedParams = [
    'response_type',
    'redirect_uri',
    'scope',
    'state',
    'response_mode',
    'code_challenge',
    'code_challenge_method',
    'login_hint',
    'domain_hint',
  ] as const;

  for (const param of allowedParams) {
    const value = requestUrl.searchParams.get(param);
    if (value) {
      microsoftAuthUrl.searchParams.set(param, value);
    }
  }

  // Prompt is multi-valued and the MCP SDK appends `prompt=consent` if scope contains `offline_access`.
  const promptValues = requestUrl.searchParams.getAll('prompt');
  if (promptValues.length > 0) {
    const normalized = new Set<string>();
    for (const raw of promptValues) {
      for (const token of raw.split(/\s+/).map((t) => t.trim()).filter(Boolean)) {
        if (stripPromptConsent && token.toLowerCase() === 'consent') {
          continue;
        }
        normalized.add(token);
      }
    }
    if (normalized.size > 0) {
      microsoftAuthUrl.searchParams.set('prompt', Array.from(normalized).join(' '));
    }
  }

  // Always use our Microsoft app's client_id (never trust upstream).
  microsoftAuthUrl.searchParams.set('client_id', clientId);

  // Ensure we have minimal required scopes if none provided.
  if (!microsoftAuthUrl.searchParams.get('scope')) {
    microsoftAuthUrl.searchParams.set('scope', defaultScope);
  }

  return microsoftAuthUrl;
}


