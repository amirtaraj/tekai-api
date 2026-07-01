/**
 * Shared types for the API Testing Tool.
 * Keep this file dependency-free so it can be imported anywhere.
 */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequest {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  durationMs: number;
  headers: Record<string, string>;
  body: unknown;
  ok: boolean;
}

export type AgentStepKind = "thought" | "action" | "observation" | "assertion" | "edit";
export type AgentStepStatus = "pending" | "running" | "success" | "failed";

export interface AssertionResult {
  id: string;
  label: string;
  status: "pending" | "pass" | "fail";
  detail?: string;
}

export interface AgentStep {
  id: string;
  kind: AgentStepKind;
  title: string;
  detail?: string;
  status: AgentStepStatus;
  request?: ApiRequest;
  response?: ApiResponse;
  assertions?: AssertionResult[];
  /** For `edit` steps: a human-readable diff of what changed in the workspace request. */
  edits?: { field: string; before?: string; after?: string }[];
  startedAt?: number;
  finishedAt?: number;
}

export interface AgentRun {
  id: string;
  prompt: string;
  createdAt: number;
  steps: AgentStep[];
  status: AgentStepStatus;
}

export interface HistoryEntry {
  id: string;
  createdAt: number;
  request: ApiRequest;
  response?: ApiResponse;
}

export interface CollectionEntry {
  id: string;
  request: ApiRequest;
  response?: ApiResponse;
  createdAt: number;
  source: "manual" | "agent" | "test";
  expectedStatus?: number;
  assertions?: string[];
  testCaseName?: string;
}

export interface TestCase {
  id: string;
  name: string;
  request: ApiRequest;
  response?: ApiResponse;
  expectedStatus?: number;
  assertions: string[];
  createdAt: number;
}

export interface SavedCollection {
  id: string;
  name: string;
  requests: CollectionEntry[];
}