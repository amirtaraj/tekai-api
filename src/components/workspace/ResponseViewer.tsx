import { StatusPill } from "./StatusPill";
import type { ApiResponse } from "@/lib/agent/types";

export function ResponseViewer({
  response,
  loading,
}: {
  response: ApiResponse | null;
  loading: boolean;
}) {
  return (
    <div className="flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Response</span>
          <StatusPill status={response?.status} />
          {response && (
            <span className="text-muted-foreground">
              {response.statusText} · {response.durationMs}ms
            </span>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3">
        {loading && (
          <div className="text-xs text-muted-foreground animate-pulse">Awaiting response…</div>
        )}
        {!loading && !response && (
          <div className="text-xs text-muted-foreground">Send a request to see the response.</div>
        )}
        {response && (
          <pre className="overflow-auto rounded-md bg-muted/40 p-3 font-mono text-xs leading-relaxed text-foreground/90">
            {safeStringify(response.body)}
          </pre>
        )}
      </div>
    </div>
  );
}

function safeStringify(v: unknown) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}