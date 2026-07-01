/**
 * API Executor
 * ------------
 * Central place where any HTTP request goes out. By default it uses a public
 * hosted API so the demo exercises a live backend instead of the in-memory
 * mock implementation.
 */

import type { ApiRequest, ApiResponse } from "./types";

const DEFAULT_API_BASE_URL = "https://dummyjson.com";
const API_BASE_URL = import.meta.env?.VITE_AGENT_API_BASE_URL ?? DEFAULT_API_BASE_URL;

export async function executeRequest(req: ApiRequest): Promise<ApiResponse> {
  return realFetch(req);
}

async function realFetch(req: ApiRequest): Promise<ApiResponse> {
  const started = performance.now();
  const resolvedUrl = resolveRequestUrl(req.url);
  const headers = { ...(req.headers ?? {}) };

  if (req.method !== "GET" && req.method !== "DELETE" && !headers["content-type"] && !headers["Content-Type"]) {
    headers["content-type"] = "application/json";
  }

  const res = await fetch(resolvedUrl, {
    method: req.method,
    headers,
    body: req.method === "GET" || req.method === "DELETE" ? undefined : req.body,
  });

  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* keep as text */
  }

  const responseHeaders: Record<string, string> = {};
  res.headers.forEach((v, k) => (responseHeaders[k] = v));

  return {
    status: res.status,
    statusText: res.statusText,
    durationMs: Math.round(performance.now() - started),
    headers: responseHeaders,
    body,
    ok: res.ok,
  };
}

function resolveRequestUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;

  const normalizedPath = url.startsWith("/") ? url : `/${url}`;
  const mappedPath = mapPath(normalizedPath);
  return new URL(mappedPath, API_BASE_URL).toString();
}

function mapPath(path: string): string {
  const normalized = path.replace(/\/+$/, "") || "/";
  if (normalized === "/health") return "/health";
  if (normalized === "/auth/login") return "/auth/login";
  if (normalized === "/orders" || normalized.startsWith("/orders/")) {
    return normalized.replace(/^\/orders/, "/carts");
  }
  return normalized;
}