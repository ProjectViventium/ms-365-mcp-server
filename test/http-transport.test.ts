/* VIVENTIUM START: Exercise the native stateless transport with overlapping synthetic owners. */
import express from 'express';
import http from 'node:http';
import { once } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import MicrosoftGraphServer from '../src/server.js';
import type AuthManager from '../src/auth.js';
import type GraphClient from '../src/graph-client.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const control = vi.hoisted(() => ({
  waitBeforeGraph: undefined as (() => Promise<void>) | undefined,
}));
vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
  enableConsoleLogging: vi.fn(),
}));
vi.mock('../src/secrets.js', () => ({
  getSecrets: vi.fn(async () => ({ clientId: 'synthetic-client', tenantId: 'common' })),
}));
vi.mock('../src/graph-tools.js', () => ({
  registerGraphTools: (server: McpServer, graphClient: GraphClient) => {
    server.tool('owner-probe', 'Read synthetic request identity', {}, async () => {
      await control.waitBeforeGraph?.();
      return graphClient.graphRequest('/me');
    });
  },
  registerDiscoveryTools: vi.fn(),
}));

describe('stateless HTTP transport', () => {
  const realFetch = global.fetch;
  let listener: http.Server;
  let endpoint: URL;
  let clients: Client[];
  let fallbackToken: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    clients = [];
    control.waitBeforeGraph = undefined;
    fallbackToken = vi.fn(async () => 'must-not-use-shared-token');
    vi.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      if (String(input).startsWith('https://graph.microsoft.com/')) {
        const authorization = new Headers(init?.headers).get('Authorization');
        return new Response(JSON.stringify({ authorization }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return realFetch(input, init);
    });
    vi.spyOn(express.application, 'listen').mockImplementation(function (
      this: express.Application
    ) {
      listener = http.createServer(this);
      return listener.listen(0, '127.0.0.1');
    });
    const server = new MicrosoftGraphServer({ getToken: fallbackToken } as unknown as AuthManager, {
      http: '127.0.0.1:3000',
    });
    await server.initialize('synthetic-test');
    await server.start();
    if (!listener.listening) await once(listener, 'listening');
    const address = listener.address();
    if (!address || typeof address === 'string') throw new Error('test_listener_missing');
    endpoint = new URL(`http://127.0.0.1:${address.port}/mcp`);
  });

  afterEach(async () => {
    control.waitBeforeGraph = undefined;
    await Promise.allSettled(clients.map((client) => client.close()));
    listener.closeAllConnections();
    await new Promise<void>((resolve) => listener.close(() => resolve()));
    vi.restoreAllMocks();
  });

  async function connect(owner: string): Promise<Client> {
    const client = new Client({ name: 'synthetic-owner', version: '1' });
    clients.push(client);
    await client.connect(
      new StreamableHTTPClientTransport(endpoint, {
        requestInit: { headers: { Authorization: `Bearer ${owner}` } },
      })
    );
    return client;
  }

  it('rejects missing and empty bearer credentials before transport or Graph access', async () => {
    for (const authorization of [undefined, 'Bearer ']) {
      const response = await realFetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authorization ? { Authorization: authorization } : {}),
        },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'initialize', id: 1 }),
      });
      expect(response.status).toBe(401);
    }
    expect(fallbackToken).not.toHaveBeenCalled();
  });

  it('supports repeated native initialization and discovery without a shared transport', async () => {
    for (const owner of ['synthetic-a', 'synthetic-b', 'synthetic-a']) {
      const client = await connect(owner);
      expect((await client.listTools()).tools.map((tool) => tool.name)).toEqual(['owner-probe']);
      await client.close();
    }
  });

  it('isolates two overlapping Graph tool calls by each authenticated request', async () => {
    const [a, b] = await Promise.all([connect('synthetic-a'), connect('synthetic-b')]);
    let arrivals = 0;
    let release: () => void;
    const bothArrived = new Promise<void>((resolve) => {
      release = resolve;
    });
    control.waitBeforeGraph = async () => {
      arrivals += 1;
      if (arrivals === 2) release();
      await bothArrived;
    };
    const [resultA, resultB] = await Promise.all([
      a.callTool({ name: 'owner-probe', arguments: {} }),
      b.callTool({ name: 'owner-probe', arguments: {} }),
    ]);
    expect(JSON.stringify(resultA)).toContain('Bearer synthetic-a');
    expect(JSON.stringify(resultA)).not.toContain('Bearer synthetic-b');
    expect(JSON.stringify(resultB)).toContain('Bearer synthetic-b');
    expect(JSON.stringify(resultB)).not.toContain('Bearer synthetic-a');
    expect(fallbackToken).not.toHaveBeenCalled();
  });

  it('returns stateless GET method truth without occupying another request transport', async () => {
    const response = await realFetch(endpoint, {
      headers: { Authorization: 'Bearer synthetic-a', Accept: 'text/event-stream' },
    });
    expect(response.status).toBe(405);
    expect((await (await connect('synthetic-b')).listTools()).tools).toHaveLength(1);
  });
});
/* VIVENTIUM END */
