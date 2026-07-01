/**
 * API Executor
 * ------------
 * Sends every request to the Python-backed agent service while keeping the
 * React frontend unchanged.
 */

import type { ApiRequest, ApiResponse } from "./types";

const DEFAULT_PYTHON_AGENT_URL = "http://127.0.0.1:8765";
const PYTHON_AGENT_URL = import.meta.env?.VITE_PYTHON_AGENT_URL ?? DEFAULT_PYTHON_AGENT_URL;

export async function executeRequest(req: ApiRequest): Promise<ApiResponse> {
  return pythonFetch(req);
}

async function pythonFetch(req: ApiRequest): Promise<ApiResponse> {
  const started = performance.now();
  const res = await fetch(`${PYTHON_AGENT_URL}/agent/execute`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ request: req }),
  });

  if (!res.ok) {
    throw new Error(`Python agent backend returned ${res.status}`);
  }

  const body = await res.json();
  return {
    ...body,
    durationMs: Math.round(performance.now() - started),
  } as ApiResponse;
}