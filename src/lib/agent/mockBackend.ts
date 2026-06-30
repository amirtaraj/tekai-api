/**
 * Mock Agentic Backend
 * ---------------------
 * In-memory implementation of a few dummy REST endpoints so the demo is
 * fully interactive without any network access.
 *
 * To connect a real backend later:
 *   1. Replace `mockFetch` in `apiExecutor.ts` with a real `fetch()` call.
 *   2. Delete or extend this file as needed.
 */

import type { ApiRequest, ApiResponse } from "./types";

// In-memory stores — mutated by CRUD handlers below.
const USERS: any[] = [
  { id: 1, name: "Ada Lovelace", email: "ada@example.com", updated_at: "2025-06-20T10:00:00Z" },
  { id: 2, name: "Alan Turing", email: "alan@example.com", updated_at: "2025-06-20T10:00:00Z" },
  { id: 3, name: "Grace Hopper", email: "grace@example.com", updated_at: "2025-06-20T10:00:00Z" },
];

const PRODUCTS: any[] = [
  { id: "p_1", name: "Widget", price: 19.99 },
  { id: "p_2", name: "Gadget", price: 49.0 },
  { id: "p_3", name: "Sprocket", price: 7.5 },
];

const ORDERS: any[] = [
  { id: "o_101", userId: 1, total: 129.99, items: 3, createdAt: "2025-06-21" },
  { id: "o_102", userId: 2, total: 49.0, items: 1, createdAt: "2025-06-23" },
  { id: "o_103", userId: 1, total: 7.5, items: 1, createdAt: "2025-06-27" },
];

const POSTS: any[] = [
  { id: 55, title: "Hello world", body: "First post", authorId: 1 },
  { id: 56, title: "Second post", body: "Another one", authorId: 2 },
];

const MOCK_TOKEN = "mock_jwt_abc123.def456.ghi789";
let nextUserId = 4;
let nextProductId = 4;
let nextOrderId = 200;
let nextPostId = 100;

function ok(body: unknown, status = 200): { status: number; body: unknown } {
  return { status, body };
}

function err(status: number, message: string) {
  return { status, body: { error: message } };
}

/**
 * Simulate a network round-trip + handler. Supports query strings, path params,
 * basic auth checking (for /orders/* and /admin/*), and full CRUD across
 * users / products / orders / posts.
 */
export async function mockFetch(req: ApiRequest): Promise<ApiResponse> {
  const started = performance.now();
  await new Promise((r) => setTimeout(r, 120 + Math.random() * 260));

  const { path, query } = parseUrl(req.url);
  const m = req.method;
  const body = safeJson(req.body);
  const auth = pickHeader(req.headers, "authorization");
  const apiKey = pickHeader(req.headers, "x-api-key");

  let result: { status: number; body: unknown };

  try {
    // --- auth ---
    if (path === "/auth/login" && m === "POST") {
      if (!body?.email) result = err(400, "email required");
      else result = ok({ token: MOCK_TOKEN, user: USERS[0] });
    }
    // --- users CRUD ---
    else if (path === "/users" && m === "GET") {
      let list = USERS;
      if (query.active) list = list.slice(0, 2); // demo filter
      result = ok(list);
    } else if (path === "/users" && m === "POST") {
      const u = { id: nextUserId++, ...body, updated_at: new Date().toISOString() };
      USERS.push(u);
      result = ok(u, 201);
    } else if (path.startsWith("/users/")) {
      const id = Number(path.split("/")[2]);
      const idx = USERS.findIndex((x) => x.id === id);
      if (idx < 0) result = err(404, "user not found");
      else if (m === "GET") result = ok(USERS[idx]);
      else if (m === "PUT" || m === "PATCH") {
        USERS[idx] = { ...USERS[idx], ...body, updated_at: new Date().toISOString() };
        result = ok(USERS[idx]);
      } else if (m === "DELETE") {
        USERS.splice(idx, 1);
        result = { status: 204, body: null };
      } else result = err(405, "method not allowed");
    }
    // --- products CRUD ---
    else if (path === "/products" && m === "GET") result = ok(PRODUCTS);
    else if (path === "/products" && m === "POST") {
      const p = { id: `p_${nextProductId++}`, ...body };
      PRODUCTS.push(p);
      result = ok(p, 201);
    } else if (path.startsWith("/products/")) {
      const id = path.split("/")[2];
      const idx = PRODUCTS.findIndex((x) => x.id === id);
      if (idx < 0) result = err(404, "product not found");
      else if (m === "GET") result = ok(PRODUCTS[idx]);
      else if (m === "PUT" || m === "PATCH") {
        PRODUCTS[idx] = { ...PRODUCTS[idx], ...body };
        result = ok(PRODUCTS[idx]);
      } else if (m === "DELETE") {
        PRODUCTS.splice(idx, 1);
        result = { status: 204, body: null };
      } else result = err(405, "method not allowed");
    }
    // --- orders (require bearer) ---
    else if (path === "/orders" || path.startsWith("/orders/")) {
      if (!auth?.toLowerCase().startsWith("bearer ")) {
        result = err(401, "missing bearer token");
      } else if (path === "/orders" && m === "GET") result = ok(ORDERS);
      else if (path === "/orders" && m === "POST") {
        const o = { id: `o_${nextOrderId++}`, createdAt: new Date().toISOString(), ...body };
        ORDERS.push(o);
        result = ok(o, 201);
      } else if (path.startsWith("/orders/")) {
        const id = path.split("/")[2];
        const idx = ORDERS.findIndex((x) => x.id === id);
        if (idx < 0) result = err(404, "order not found");
        else if (m === "GET") result = ok(ORDERS[idx]);
        else if (m === "DELETE") {
          ORDERS.splice(idx, 1);
          result = { status: 204, body: null };
        } else result = err(405, "method not allowed");
      } else result = err(404, "not found");
    }
    // --- posts CRUD ---
    else if (path === "/posts" && m === "GET") result = ok(POSTS);
    else if (path === "/posts" && m === "POST") {
      const p = { id: nextPostId++, ...body };
      POSTS.push(p);
      result = ok(p, 201);
    } else if (path.startsWith("/posts/")) {
      const id = Number(path.split("/")[2]);
      const idx = POSTS.findIndex((x) => x.id === id);
      if (idx < 0) result = err(404, "post not found");
      else if (m === "GET") result = ok(POSTS[idx]);
      else if (m === "PUT" || m === "PATCH") {
        POSTS[idx] = { ...POSTS[idx], ...body };
        result = ok(POSTS[idx]);
      } else if (m === "DELETE") {
        POSTS.splice(idx, 1);
        result = { status: 204, body: null };
      } else result = err(405, "method not allowed");
    }
    // --- admin (requires api key) ---
    else if (path.startsWith("/admin")) {
      if (apiKey !== "demo-api-key") result = err(401, "invalid api key");
      else result = ok({ admin: true, path });
    }
    // --- health ---
    else if (path === "/health" && m === "GET") {
      result = ok({ status: "healthy", time: new Date().toISOString() });
    } else {
      result = err(404, `No mock handler for ${m} ${path}`);
    }
  } catch (e) {
    result = err(500, e instanceof Error ? e.message : "internal error");
  }

  const duration = Math.round(performance.now() - started);
  return {
    status: result.status,
    statusText: statusText(result.status),
    durationMs: duration,
    headers: { "content-type": "application/json" },
    body: result.body,
    ok: result.status >= 200 && result.status < 300,
  };
}

function parseUrl(url: string): { path: string; query: Record<string, string> } {
  try {
    const u = new URL(url, "https://mock.local");
    const query: Record<string, string> = {};
    u.searchParams.forEach((v, k) => (query[k] = v));
    return { path: u.pathname, query };
  } catch {
    return { path: url.startsWith("/") ? url : `/${url}`, query: {} };
  }
}

function pickHeader(headers: Record<string, string> | undefined, key: string): string | undefined {
  if (!headers) return undefined;
  const k = Object.keys(headers).find((h) => h.toLowerCase() === key.toLowerCase());
  return k ? headers[k] : undefined;
}

function safeJson(s?: string): any {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function statusText(s: number): string {
  const map: Record<number, string> = {
    200: "OK",
    201: "Created",
    204: "No Content",
    400: "Bad Request",
    401: "Unauthorized",
    404: "Not Found",
    405: "Method Not Allowed",
    500: "Internal Server Error",
  };
  return map[s] ?? "";
}

export const MOCK_ENDPOINTS = [
  { method: "POST", path: "/auth/login", desc: "Authenticate, returns token" },
  { method: "ANY", path: "/users[/:id]", desc: "Full CRUD for users" },
  { method: "ANY", path: "/products[/:id]", desc: "Full CRUD for products" },
  { method: "ANY", path: "/orders[/:id]", desc: "CRUD for orders (requires Bearer)" },
  { method: "ANY", path: "/posts[/:id]", desc: "Full CRUD for posts" },
  { method: "GET", path: "/admin/*", desc: "Requires x-api-key: demo-api-key" },
  { method: "GET", path: "/health", desc: "Health check" },
] as const;