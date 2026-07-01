/**
 * Workspace state container.
 * Decoupled from UI so business logic can be tested / replaced without
 * touching components.
 */

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { executeRequest } from "./apiExecutor";
import { runAgent } from "./agentEngine";
import type {
  AgentRun,
  AgentStep,
  ApiRequest,
  ApiResponse,
  CollectionEntry,
  HistoryEntry,
  SavedCollection,
  TestCase,
} from "./types";

interface WorkspaceState {
  request: ApiRequest;
  setRequest: (r: ApiRequest) => void;
  response: ApiResponse | null;
  sending: boolean;
  send: () => Promise<void>;

  history: HistoryEntry[];
  collections: SavedCollection[];
  testCases: TestCase[];
  loadHistoryEntry: (id: string) => void;
  saveCurrent: (name: string) => void;
  createTestCaseFromResponse: (name?: string) => void;

  agentRuns: AgentRun[];
  currentRun: AgentRun | null;
  runningAgent: boolean;
  runPrompt: (prompt: string) => Promise<void>;
  selectRun: (id: string) => void;
  /** Push an agent step's request (and response if present) into the manual workspace. */
  applyStepToWorkspace: (step: AgentStep) => void;
  /** Which agent step is currently "focused" in the workspace, for highlighting. */
  focusedStepId: string | null;
}

const Ctx = createContext<WorkspaceState | null>(null);

const DEFAULT_REQ: ApiRequest = {
  method: "GET",
  url: "/users",
  headers: { "content-type": "application/json" },
  body: "",
};

const SEED_COLLECTIONS: SavedCollection[] = [
  {
    id: "col_demo",
    name: "Demo Suite",
    requests: [
      {
        id: "seed_health",
        createdAt: Date.now(),
        source: "manual",
        request: { method: "GET", url: "/health" },
      },
      {
        id: "seed_login",
        createdAt: Date.now(),
        source: "manual",
        request: {
          method: "POST",
          url: "/auth/login",
          headers: { "content-type": "application/json" },
          body: '{"email":"ada@example.com","password":"demo"}',
        },
      },
      {
        id: "seed_users",
        createdAt: Date.now(),
        source: "manual",
        request: { method: "GET", url: "/users" },
      },
      {
        id: "seed_orders",
        createdAt: Date.now(),
        source: "manual",
        request: { method: "GET", url: "/orders" },
      },
    ],
  },
];

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ApiRequest>(DEFAULT_REQ);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [collections, setCollections] = useState<SavedCollection[]>(SEED_COLLECTIONS);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [currentRun, setCurrentRun] = useState<AgentRun | null>(null);
  const [runningAgent, setRunningAgent] = useState(false);
  const [focusedStepId, setFocusedStepId] = useState<string | null>(null);

  // Keep a ref so the agent always reads the latest workspace request without
  // re-creating runPrompt and breaking the streaming closure.
  const requestRef = useRef(request);
  requestRef.current = request;

  const saveToCollection = useCallback((req: ApiRequest, res?: ApiResponse, source: CollectionEntry["source"] = "manual") => {
    const entry: CollectionEntry = {
      id: `entry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      request: req,
      response: res,
      createdAt: Date.now(),
      source,
    };

    setCollections((cols) => {
      const existing = cols.find((c) => c.name === "Recent Requests");
      if (existing) {
        return cols.map((c) =>
          c.id === existing.id
            ? { ...c, requests: [entry, ...c.requests].slice(0, 25) }
            : c,
        );
      }
      return [{ id: `col_${Date.now()}`, name: "Recent Requests", requests: [entry] }, ...cols];
    });
  }, []);

  const send = useCallback(async () => {
    setSending(true);
    try {
      const res = await executeRequest(request);
      setResponse(res);
      saveToCollection(request, res, "manual");
      const entry: HistoryEntry = {
        id: `h_${Date.now()}`,
        createdAt: Date.now(),
        request,
        response: res,
      };
      setHistory((h) => [entry, ...h].slice(0, 50));
    } finally {
      setSending(false);
    }
  }, [request, saveToCollection]);

  const loadHistoryEntry = useCallback(
    (id: string) => {
      const e = history.find((x) => x.id === id);
      if (e) {
        setRequest(e.request);
        setResponse(e.response ?? null);
        return;
      }

      const testCase = testCases.find((x) => x.id === id);
      if (testCase) {
        setRequest(testCase.request);
        setResponse(testCase.response ?? null);
        return;
      }

      for (const c of collections) {
        const idx = Number(id.split(":")[1]);
        const entry = c.requests[idx];
        if (id.startsWith(c.id) && entry) {
          setRequest({ headers: {}, body: "", ...entry.request });
          setResponse(entry.response ?? null);
          return;
        }
      }
    },
    [history, collections, testCases],
  );

  const saveCurrent = useCallback(
    (name: string) => {
      setCollections((cols) => {
        const entry: CollectionEntry = {
          id: `entry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          request,
          response,
          createdAt: Date.now(),
          source: "manual",
        };
        const existing = cols.find((c) => c.name === name);
        if (existing) {
          return cols.map((c) =>
            c.id === existing.id ? { ...c, requests: [entry, ...c.requests].slice(0, 25) } : c,
          );
        }
        return [...cols, { id: `col_${Date.now()}`, name, requests: [entry] }];
      });
    },
    [request, response],
  );

  const createTestCaseFromResponse = useCallback(
    (name?: string) => {
      if (!response) return;

      const derivedName = (name ?? "").trim() || `${request.method} ${request.url}`.trim();
      const assertions = buildAssertionsFromResponse(response);
      const testCase: TestCase = {
        id: `tc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: derivedName,
        request,
        response,
        expectedStatus: response.status,
        assertions,
        createdAt: Date.now(),
      };

      setTestCases((cases) => [testCase, ...cases].slice(0, 20));
      setCollections((cols) => {
        const existing = cols.find((c) => c.name === "Test Cases");
        const entry: CollectionEntry = {
          id: testCase.id,
          request: testCase.request,
          response: testCase.response,
          createdAt: testCase.createdAt,
          source: "test",
          expectedStatus: testCase.expectedStatus,
          assertions: testCase.assertions,
          testCaseName: testCase.name,
        };
        if (existing) {
          return cols.map((c) =>
            c.id === existing.id ? { ...c, requests: [entry, ...c.requests].slice(0, 25) } : c,
          );
        }
        return [{ id: `col_${Date.now()}`, name: "Test Cases", requests: [entry] }, ...cols];
      });
    },
    [request, response],
  );

  const runPrompt = useCallback(async (prompt: string) => {
    setRunningAgent(true);
    try {
      let liveRun: AgentRun | null = null;
      await runAgent(prompt, {
        onStep: (run) => {
          liveRun = run;
          setCurrentRun({ ...run });
        },
        getCurrentRequest: () => requestRef.current,
        setCurrentRequest: (r) => {
          requestRef.current = r;
          setRequest(r);
        },
        onActionComplete: (step) => {
          if (step.request && step.response) {
            saveToCollection(step.request, step.response, "agent");
          }
        },
      });
      if (liveRun) {
        const finalRun: AgentRun = liveRun;
        setAgentRuns((rs) => [finalRun, ...rs].slice(0, 20));
      }
    } finally {
      setRunningAgent(false);
    }
  }, [saveToCollection]);

  const selectRun = useCallback(
    (id: string) => {
      const r = agentRuns.find((x) => x.id === id);
      if (r) setCurrentRun(r);
    },
    [agentRuns],
  );

  const applyStepToWorkspace = useCallback((step: AgentStep) => {
    if (!step.request) return;
    setRequest({ headers: {}, body: "", ...step.request });
    if (step.response) setResponse(step.response);
    setFocusedStepId(step.id);
  }, []);

  const value = useMemo<WorkspaceState>(
    () => ({
      request,
      setRequest,
      response,
      sending,
      send,
      history,
      collections,
      testCases,
      loadHistoryEntry,
      saveCurrent,
      createTestCaseFromResponse,
      agentRuns,
      currentRun,
      runningAgent,
      runPrompt,
      selectRun,
      applyStepToWorkspace,
      focusedStepId,
    }),
    [
      request,
      response,
      sending,
      send,
      history,
      collections,
      testCases,
      loadHistoryEntry,
      saveCurrent,
      createTestCaseFromResponse,
      agentRuns,
      currentRun,
      runningAgent,
      runPrompt,
      selectRun,
      applyStepToWorkspace,
      focusedStepId,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function buildAssertionsFromResponse(response: ApiResponse): string[] {
  const assertions = [`Status code is ${response.status}`];
  if (response.ok) assertions.push("Request succeeded");
  if (Array.isArray(response.body)) {
    assertions.push("Response is a non-empty list");
  } else if (response.body && typeof response.body === "object") {
    const body = response.body as Record<string, unknown>;
    const keys = Object.keys(body);
    const candidate = keys.find((k) => k.toLowerCase() !== "meta");
    if (candidate) assertions.push(`Response contains field '${candidate}'`);
    if ("id" in body) assertions.push("Response contains an id");
  }
  return assertions;
}

export function useWorkspace() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return v;
}