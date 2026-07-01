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
          <StatusPill status={response?.status} durationMs={response?.durationMs} />
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
          <div className="space-y-2">
            {response.ok ? null : (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                {typeof response.body === "object" && response.body !== null && "message" in (response.body as Record<string, unknown>)
                  ? String((response.body as Record<string, unknown>).message)
                  : "The request could not be completed."}
              </div>
            )}
            <pre className="overflow-auto rounded-md bg-muted/40 p-3 font-mono text-xs leading-relaxed text-foreground/90">
              {safeStringify(response.body)}
            </pre>
          </div>
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