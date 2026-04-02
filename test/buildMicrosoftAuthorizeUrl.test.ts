/* VIVENTIUM START
 * Purpose: Viventium-owned addition copied into LibreChat fork.
 * Details: docs/requirements_and_learnings/05_Open_Source_Modifications.md#librechat-viventium-additions
 * VIVENTIUM END */
import { describe, expect, test } from 'vitest';
import { buildMicrosoftAuthorizeUrl } from '../src/http/buildMicrosoftAuthorizeUrl.js';

describe('buildMicrosoftAuthorizeUrl', () => {
  test('strips prompt=consent but keeps other prompt values', () => {
    const requestUrl = new URL('http://localhost:6274/authorize');
    requestUrl.searchParams.set('response_type', 'code');
    requestUrl.searchParams.set('redirect_uri', 'http://localhost:3080/api/mcp/ms-365/oauth/callback');
    requestUrl.searchParams.set('scope', 'User.Read offline_access');
    requestUrl.searchParams.append('prompt', 'consent');
    requestUrl.searchParams.append('prompt', 'select_account');

    const url = buildMicrosoftAuthorizeUrl({
      requestUrl,
      tenantId: '00000000-0000-0000-0000-000000000000', // Example tenant ID for testing
      clientId: '00000000-0000-0000-0000-000000000000',
      defaultScope: 'User.Read',
      stripPromptConsent: true,
    });

    expect(url.origin).toBe('https://login.microsoftonline.com');
    expect(url.pathname).toBe('/00000000-0000-0000-0000-000000000000/oauth2/v2.0/authorize');
    expect(url.searchParams.get('client_id')).toBe('00000000-0000-0000-0000-000000000000');
    expect(url.searchParams.get('scope')).toBe('User.Read offline_access');

    const prompts = url.searchParams.getAll('prompt').join(' ');
    expect(prompts).toContain('select_account');
    expect(prompts).not.toContain('consent');
  });

  test('keeps prompt=consent if stripPromptConsent=false', () => {
    const requestUrl = new URL('http://localhost:6274/authorize?prompt=consent&scope=offline_access');

    const url = buildMicrosoftAuthorizeUrl({
      requestUrl,
      tenantId: 'common',
      clientId: '00000000-0000-0000-0000-000000000000',
      defaultScope: 'User.Read',
      stripPromptConsent: false,
    });

    expect(url.searchParams.getAll('prompt')).toContain('consent');
  });

  test('applies defaultScope when request does not include scope', () => {
    const requestUrl = new URL('http://localhost:6274/authorize?response_type=code');

    const url = buildMicrosoftAuthorizeUrl({
      requestUrl,
      tenantId: 'common',
      clientId: '00000000-0000-0000-0000-000000000000',
      defaultScope: 'User.Read',
    });

    expect(url.searchParams.get('scope')).toBe('User.Read');
  });
});


