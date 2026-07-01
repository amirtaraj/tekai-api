/**
 * Agent Engine (MOCK)
 * -------------------
 * Simulates an agentic loop: Thought -> Action -> Observation -> Assertion.
 *
 * The current implementation uses simple keyword matching against the user
 * prompt to choose which canned plan to run. This keeps the demo fully
 * interactive without an LLM key.
 *
 * To plug a real LLM:
 *   1. Replace `planFromPrompt` with a call to OpenAI / Anthropic / Lovable AI
 *      Gateway that returns a structured list of `AgentStep`s.
 *   2. Keep the `runAgent` streaming loop — it already streams steps via the
 *      `onStep` callback, which the UI uses for the timeline animation.
 */

import { executeRequest } from "./apiExecutor";
import type { AgentRun, AgentStep, ApiRequest, AssertionResult, HttpMethod } from "./types";

type StepDraft = Omit<AgentStep, "id" | "status">;

let counter = 0;
const uid = (p: string) => `${p}_${Date.now().toString(36)}_${(counter++).toString(36)}`;

export interface RunOptions {
  onStep: (run: AgentRun) => void;
  /** Snapshot of the request currently loaded in the manual workspace. */
  getCurrentRequest?: () => ApiRequest;
  /** Mutates the request in the manual workspace (used by `edit` steps). */
  setCurrentRequest?: (r: ApiRequest) => void;
  /** Called whenever an action step completes with a live response. */
  onActionComplete?: (step: AgentStep) => void;
}

export async function runAgent(prompt: string, opts: RunOptions): Promise<AgentRun> {
  const run: AgentRun = {
    id: uid("run"),
    prompt,
    createdAt: Date.now(),
    steps: [],
    status: "running",
  };

  const plan = planFromPrompt(prompt, opts.getCurrentRequest?.());

  // Context bag passed between steps (e.g. auth token).
  const ctx: Record<string, unknown> = {};

  for (const draft of plan) {
    const step: AgentStep = { ...draft, id: uid("step"), status: "pending" };
    run.steps.push(step);
    opts.onStep({ ...run });

    // small "thinking" pause for the UI
    await wait(280);

    step.status = "running";
    step.startedAt = Date.now();
    opts.onStep({ ...run });

    try {
      if (step.kind === "edit" && step.request && opts.setCurrentRequest) {
        // Apply visual edits to the manual workspace request.
        opts.setCurrentRequest(step.request);
        await wait(180);
        step.status = "success";
      } else if (step.kind === "action" && step.request) {
        const req = hydrateRequest(step.request, ctx);
        step.request = req;
        const res = await executeRequest(req);
        step.response = res;
        opts.onActionComplete?.(step);
        // capture token if present
        if (res.ok && isObj(res.body) && typeof res.body.token === "string") {
          ctx.token = res.body.token;
        }
        if (isObj(res.body) && Array.isArray(res.body)) {
          ctx.lastList = res.body;
        }
        step.status = res.ok ? "success" : "failed";
      } else if (step.kind === "assertion") {
        // Resolve every assertion in the list against the last response.
        const lastResponse = [...run.steps].reverse().find((s) => s.response)?.response;
        const list = step.assertions ?? [];
        for (const a of list) {
          const { pass, detail } = evalAssertion(a.label, lastResponse);
          a.status = pass ? "pass" : "fail";
          if (detail) a.detail = detail;
        }
        const allPass = list.length > 0 && list.every((a) => a.status === "pass");
        step.status = allPass ? "success" : list.length === 0 ? "success" : "failed";
      } else {
        // thought / observation — just a beat
        await wait(220);
        step.status = "success";
      }
    } catch (e) {
      step.status = "failed";
      step.detail = e instanceof Error ? e.message : String(e);
    }

    step.finishedAt = Date.now();
    opts.onStep({ ...run });

    if (step.status === "failed" && step.kind === "action") {
      run.status = "failed";
      opts.onStep({ ...run });
      return run;
    }
  }

  run.status = run.steps.every((s) => s.status === "success") ? "success" : "failed";
  opts.onStep({ ...run });
  return run;
}

/* ---------- planning ---------- */

function planFromPrompt(prompt: string, current?: ApiRequest): StepDraft[] {
  const p = prompt.toLowerCase();
  const steps: StepDraft[] = [];

  steps.push({
    kind: "thought",
    title: "Parse the user goal",
    detail: `Goal: "${prompt}"`,
  });

  // 1) Edit mode — if the user is refining the currently loaded request.
  const editDraft = tryPlanEdits(prompt, current);
  if (editDraft) {
    steps.push(...editDraft);
    return steps;
  }

  // 2) Detect CRUD intent.
  const intent = detectIntent(prompt);

  // 3) Auth bootstrapping when the resource needs it.
  if (intent.needsAuth) {
    steps.push({ kind: "thought", title: "Authenticate first to obtain a bearer token" });
    steps.push({
      kind: "action",
      title: "POST /auth/login",
      detail: "Authenticate with demo credentials",
      request: {
        method: "POST",
        url: "/auth/login",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "emilys", password: "emilyspass" }, null, 2),
      },
    });
    steps.push({
      kind: "observation",
      title: "Captured auth token from response",
      detail: "Token stored in agent context as {{token}}",
    });
  }

  // 4) Main action.
  steps.push({
    kind: "thought",
    title: `Plan: ${intent.method} ${intent.url}`,
    detail: intent.reason,
  });
  steps.push({
    kind: "action",
    title: `${intent.method} ${intent.url}`,
    detail: intent.actionDetail,
    request: {
      method: intent.method,
      url: intent.url,
      headers: intent.headers,
      body: intent.body,
    },
  });

  // 5) Assertions.
  if (intent.assertions.length > 0) {
    steps.push({
      kind: "assertion",
      title: "Validate response",
      detail: `${intent.assertions.length} criteria to check`,
      assertions: intent.assertions.map((label) => ({
        id: uid("a"),
        label,
        status: "pending" as const,
      })),
    });
  }

  steps.push({
    kind: "thought",
    title: "Summarize results for the user",
    detail: "All requested checks complete.",
  });

  return steps;
}

/* ---------- edit-mode planning ---------- */

function tryPlanEdits(prompt: string, current?: ApiRequest): StepDraft[] | null {
  if (!current) return null;
  const p = prompt;
  const edits: { field: string; before?: string; after?: string }[] = [];
  const next: ApiRequest = {
    ...current,
    headers: { ...(current.headers ?? {}) },
  };

  let touched = false;

  // Bearer token
  const bearer = p.match(/bearer\s+(?:token\s+)?["']?([A-Za-z0-9._\-]+)["']?/i);
  if (bearer) {
    const v = `Bearer ${bearer[1]}`;
    edits.push({ field: "header authorization", before: next.headers?.authorization, after: v });
    next.headers!["authorization"] = v;
    touched = true;
  }

  // API key
  const apiKey = p.match(/api[- ]?key[^a-z0-9]*["']?([A-Za-z0-9._\-]+)["']?/i);
  if (apiKey && !bearer) {
    edits.push({ field: "header x-api-key", before: next.headers?.["x-api-key"], after: apiKey[1] });
    next.headers!["x-api-key"] = apiKey[1];
    touched = true;
  }

  // Basic auth
  const basic = p.match(/basic auth\s+([^\s:]+):([^\s'"]+)/i);
  if (basic) {
    const enc = btoa(`${basic[1]}:${basic[2]}`);
    const v = `Basic ${enc}`;
    edits.push({ field: "header authorization", before: next.headers?.authorization, after: v });
    next.headers!["authorization"] = v;
    touched = true;
  }

  // Change method
  const methodMatch = p.match(/(?:change|set)\s+(?:the\s+)?method\s+to\s+(GET|POST|PUT|PATCH|DELETE)/i);
  if (methodMatch) {
    const m = methodMatch[1].toUpperCase() as HttpMethod;
    edits.push({ field: "method", before: next.method, after: m });
    next.method = m;
    touched = true;
  }

  // Add query param
  const qp = p.match(/query\s+param(?:eter)?\s+(?:named\s+)?["']?(\w+)["']?\s*(?:with\s+value|=|to|:)\s*["']?([\w\-.]+)["']?/i);
  if (qp) {
    const [u, q] = next.url.split("?");
    const sp = new URLSearchParams(q ?? "");
    sp.set(qp[1], qp[2]);
    const newUrl = `${u}?${sp.toString()}`;
    edits.push({ field: "url", before: next.url, after: newUrl });
    next.url = newUrl;
    touched = true;
  }

  // Path param substitution: "set id to 42" or "change :id to 42"
  const pp = p.match(/(?::id|path\s+param(?:eter)?)\s+(?:named\s+\w+\s+)?(?:to|=|:)\s*["']?([\w\-]+)["']?/i);
  if (pp && next.url.includes(":")) {
    const newUrl = next.url.replace(/:[a-zA-Z_]+/, pp[1]);
    edits.push({ field: "url", before: next.url, after: newUrl });
    next.url = newUrl;
    touched = true;
  }

  // Body field edit: "set email to test@example.com"
  const bodyField = p.match(/set\s+(\w+)\s+to\s+["']?([^"'\s]+)["']?/i);
  if (bodyField && !methodMatch && next.method !== "GET") {
    const obj = safeJsonParse(next.body) ?? {};
    obj[bodyField[1]] = coerce(bodyField[2]);
    const newBody = JSON.stringify(obj, null, 2);
    edits.push({ field: `body.${bodyField[1]}`, after: bodyField[2] });
    next.body = newBody;
    touched = true;
  }

  if (!touched) return null;

  return [
    {
      kind: "thought",
      title: "Refining the request currently loaded in the workspace",
      detail: edits.map((e) => `• ${e.field}: ${e.after}`).join("\n"),
    },
    {
      kind: "edit",
      title: "Apply changes to manual API runner",
      detail: `${edits.length} field${edits.length === 1 ? "" : "s"} updated`,
      request: next,
      edits,
    },
  ];
}

/* ---------- intent detection ---------- */

interface Intent {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  needsAuth: boolean;
  reason: string;
  actionDetail?: string;
  assertions: string[];
}

function detectIntent(prompt: string): Intent {
  const p = prompt.toLowerCase();
  const resource = /product/.test(p)
    ? "products"
    : /order/.test(p)
      ? "orders"
      : /post/.test(p)
        ? "posts"
        : /user/.test(p)
          ? "users"
          : "health";
  const needsAuth = resource === "orders" || /auth|login|token/.test(p);
  const idMatch = prompt.match(/id\s*[:#=]?\s*["']?([\w\-]+)["']?|\b(\d{2,})\b|\b(p_\d+|o_\d+)\b/i);
  const id = idMatch ? (idMatch[1] ?? idMatch[2] ?? idMatch[3]) : null;

  // CREATE
  if (/\b(create|add|new|post)\b/.test(p) && resource !== "health") {
    const body = extractBodyFields(prompt);
    return {
      method: "POST",
      url: `/${resource}`,
      headers: { "content-type": "application/json", ...(needsAuth ? { authorization: "Bearer {{token}}" } : {}) },
      body: JSON.stringify(body, null, 2),
      needsAuth,
      reason: `Create a new ${singular(resource)} with the extracted fields.`,
      actionDetail: `Body: ${JSON.stringify(body)}`,
      assertions: [
        "Status code is 201",
        "Response body contains an 'id'",
        "Response time < 500ms",
      ],
    };
  }

  // UPDATE
  if (/\b(update|patch|modify|change|edit)\b/.test(p) && resource !== "health") {
    const method: HttpMethod = /\bpatch\b/.test(p) ? "PATCH" : "PUT";
    const body = extractBodyFields(prompt);
    return {
      method,
      url: id ? `/${resource}/${id}` : `/${resource}/1`,
      headers: { "content-type": "application/json", ...(needsAuth ? { authorization: "Bearer {{token}}" } : {}) },
      body: JSON.stringify(body, null, 2),
      needsAuth,
      reason: `Update ${singular(resource)} ${id ?? "1"}.`,
      actionDetail: `Body: ${JSON.stringify(body)}`,
      assertions: [
        "Status code is 200",
        "Response body contains 'updated_at'",
        "Response time < 500ms",
      ],
    };
  }

  // DELETE
  if (/\b(delete|remove|destroy)\b/.test(p) && resource !== "health") {
    return {
      method: "DELETE",
      url: id ? `/${resource}/${id}` : `/${resource}/1`,
      headers: needsAuth ? { authorization: "Bearer {{token}}" } : {},
      needsAuth,
      reason: `Delete ${singular(resource)} ${id ?? "1"}.`,
      assertions: ["Status code is 204", "Response time < 500ms"],
    };
  }

  // GET single
  if (id && resource !== "health") {
    return {
      method: "GET",
      url: `/${resource}/${id}`,
      headers: needsAuth ? { authorization: "Bearer {{token}}" } : {},
      needsAuth,
      reason: `Fetch ${singular(resource)} ${id}.`,
      assertions: [
        "Status code is 200",
        "Response is a JSON object",
        "Response time < 500ms",
      ],
    };
  }

  // LIST
  if (resource !== "health") {
    return {
      method: "GET",
      url: `/${resource}`,
      headers: needsAuth ? { authorization: "Bearer {{token}}" } : {},
      needsAuth,
      reason: `List all ${resource}.`,
      assertions: [
        "Status code is 200",
        "Response is a non-empty list",
        ...(resource === "orders" ? ["Each order.total is a number"] : []),
        "Response time < 500ms",
      ],
    };
  }

  // Default: health
  return {
    method: "GET",
    url: "/health",
    needsAuth: false,
    reason: "Health check.",
    assertions: ["Status code is 200", "Response time < 200ms"],
  };
}

function extractBodyFields(prompt: string): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  // Quoted name: named 'Foo' / called "Bar"
  const named = prompt.match(/(?:named|called|name(?:d)?(?:\s+is)?)\s+["']([^"']+)["']/i);
  if (named) obj.name = named[1];
  // price 29.99 / price: 29.99 / price = 29.99
  const numbered = [...prompt.matchAll(/\b(price|total|quantity|qty|amount|stock)\s*[:=]?\s*(\d+(?:\.\d+)?)/gi)];
  for (const m of numbered) obj[m[1].toLowerCase()] = Number(m[2]);
  // email
  const email = prompt.match(/(?:email\s+(?:to\s+)?["']?)([^\s"']+@[^\s"']+)["']?/i);
  if (email) obj.email = email[1];
  // generic "field to value" pairs
  for (const m of prompt.matchAll(/\b(\w+)\s+(?:to|=|:)\s+["']?([^"',]+)["']?/gi)) {
    const k = m[1].toLowerCase();
    if (["id", "method", "param", "parameter", "token", "key", "header", "auth"].includes(k)) continue;
    if (obj[k] !== undefined) continue;
    obj[k] = coerce(m[2].trim());
  }
  if (Object.keys(obj).length === 0) obj.name = "Demo item";
  return obj;
}

function coerce(v: string): unknown {
  if (/^-?\d+(?:\.\d+)?$/.test(v)) return Number(v);
  if (v === "true") return true;
  if (v === "false") return false;
  return v;
}

function singular(r: string): string {
  return r.endsWith("s") ? r.slice(0, -1) : r;
}

function safeJsonParse(s?: string): any {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

function hydrateRequest(req: ApiRequest, ctx: Record<string, unknown>): ApiRequest {
  const token = typeof ctx.token === "string" ? ctx.token : "";
  const headers = { ...(req.headers ?? {}) };
  for (const k of Object.keys(headers)) {
    headers[k] = headers[k].replace("{{token}}", token);
  }
  return { ...req, headers };
}

function evalAssertion(label: string, res: AgentRun["steps"][0]["response"] | undefined): { pass: boolean; detail?: string } {
  if (!res) return { pass: false, detail: "no response" };
  const t = label.toLowerCase();
  const statusMatch = t.match(/status\s+code\s+(?:is|===|==|=)\s*(\d{3})/);
  if (statusMatch) {
    const want = Number(statusMatch[1]);
    return { pass: res.status === want, detail: `got ${res.status}` };
  }
  const timeMatch = t.match(/response\s+time\s*<\s*(\d+)/);
  if (timeMatch) {
    const want = Number(timeMatch[1]);
    return { pass: res.durationMs < want, detail: `${res.durationMs}ms` };
  }
  if (t.includes("non-empty list")) {
    return {
      pass: Array.isArray(res.body) && res.body.length > 0,
      detail: Array.isArray(res.body) ? `${res.body.length} items` : "not a list",
    };
  }
  if (t.includes("json object")) {
    return { pass: isObj(res.body) && !Array.isArray(res.body), detail: typeof res.body };
  }
  if (t.includes("contains an 'id'") || t.includes("contains 'id'")) {
    return { pass: isObj(res.body) && "id" in (res.body as object), detail: "id present" };
  }
  if (t.includes("contains 'updated_at'")) {
    const hasUpdatedField = isObj(res.body) && ("updated_at" in (res.body as object) || "updatedAt" in (res.body as object));
    return { pass: hasUpdatedField, detail: hasUpdatedField ? "updated timestamp present" : "missing updated timestamp" };
  }
  if (t.includes("order.total is a number")) {
    return {
      pass: Array.isArray(res.body) && res.body.every((o: any) => typeof o.total === "number"),
    };
  }
  return { pass: true };
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isObj(v: unknown): v is Record<string, any> {
  return typeof v === "object" && v !== null;
}