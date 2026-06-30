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
  HistoryEntry,
  SavedCollection,
} from "./types";

interface WorkspaceState {
  request: ApiRequest;
  setRequest: (r: ApiRequest) => void;
  response: ApiResponse | null;
  sending: boolean;
  send: () => Promise<void>;

  history: HistoryEntry[];
  collections: SavedCollection[];
  loadHistoryEntry: (id: string) => void;
  saveCurrent: (name: string) => void;

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
      { method: "GET", url: "/health" },
      { method: "POST", url: "/auth/login", headers: { "content-type": "application/json" }, body: '{"email":"ada@example.com","password":"demo"}' },
      { method: "GET", url: "/users" },
      { method: "GET", url: "/orders" },
    ],
  },
];

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ApiRequest>(DEFAULT_REQ);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [collections, setCollections] = useState<SavedCollection[]>(SEED_COLLECTIONS);
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [currentRun, setCurrentRun] = useState<AgentRun | null>(null);
  const [runningAgent, setRunningAgent] = useState(false);
  const [focusedStepId, setFocusedStepId] = useState<string | null>(null);

  // Keep a ref so the agent always reads the latest workspace request without
  // re-creating runPrompt and breaking the streaming closure.
  const requestRef = useRef(request);
  requestRef.current = request;

  const send = useCallback(async () => {
    setSending(true);
    try {
      const res = await executeRequest(request);
      setResponse(res);
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
  }, [request]);

  const loadHistoryEntry = useCallback(
    (id: string) => {
      const e = history.find((x) => x.id === id);
      if (e) {
        setRequest(e.request);
        setResponse(e.response ?? null);
      } else {
        for (const c of collections) {
          const r = c.requests[Number(id.split(":")[1])];
          if (id.startsWith(c.id) && r) {
            setRequest({ headers: {}, body: "", ...r });
            return;
          }
        }
      }
    },
    [history, collections],
  );

  const saveCurrent = useCallback(
    (name: string) => {
      setCollections((cols) => {
        const existing = cols.find((c) => c.name === name);
        if (existing) {
          return cols.map((c) =>
            c.id === existing.id ? { ...c, requests: [...c.requests, request] } : c,
          );
        }
        return [...cols, { id: `col_${Date.now()}`, name, requests: [request] }];
      });
    },
    [request],
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
      });
      if (liveRun) {
        const finalRun: AgentRun = liveRun;
        setAgentRuns((rs) => [finalRun, ...rs].slice(0, 20));
      }
    } finally {
      setRunningAgent(false);
    }
  }, []);

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
      loadHistoryEntry,
      saveCurrent,
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
      loadHistoryEntry,
      saveCurrent,
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

export function useWorkspace() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return v;
}