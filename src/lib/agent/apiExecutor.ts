/**
 * API Executor
 * ------------
 * Central place where any HTTP request goes out. Currently routes to the
 * in-memory mock backend so the demo works offline.
 *
 * To wire a real backend:
 *   - Replace `mockFetch(req)` with `realFetch(req)` below.
 *   - You can also branch by hostname (e.g. send `mock.local/*` to mock and
 *     everything else to real fetch).
 */

import { mockFetch } from "./mockBackend";
import type { ApiRequest, ApiResponse } from "./types";

export async function executeRequest(req: ApiRequest): Promise<ApiResponse> {
  // TODO: swap to realFetch(req) to hit a real backend.
  return mockFetch(req);
}

// Reference implementation for a real fetch — unused by default.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function realFetch(req: ApiRequest): Promise<ApiResponse> {
  const started = performance.now();
  const res = await fetch(req.url, {
    method: req.method,
    headers: req.headers,
    body: req.method === "GET" ? undefined : req.body,
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* keep as text */
  }
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => (headers[k] = v));
  return {
    status: res.status,
    statusText: res.statusText,
    durationMs: Math.round(performance.now() - started),
    headers,
    body,
    ok: res.ok,
  };
}