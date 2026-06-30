import { Clock, FolderOpen, Sparkles, Zap } from "lucide-react";
import { useWorkspace } from "@/lib/agent/workspaceStore";
import { StatusPill } from "./StatusPill";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { history, collections, loadHistoryEntry, agentRuns, selectRun, currentRun } =
    useWorkspace();

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-border bg-card/40">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-primary/15 text-primary">
          <Zap className="h-4 w-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">Agentic API</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Testing Tool
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-3">
        <Section icon={<FolderOpen className="h-3.5 w-3.5" />} label="Collections">
          {collections.map((c) => (
            <div key={c.id} className="space-y-0.5">
              <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground">
                {c.name}
              </div>
              {c.requests.map((r, i) => (
                <button
                  key={i}
                  onClick={() => loadHistoryEntry(`${c.id}:${i}`)}
                  className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent"
                >
                  <span className="font-mono text-[10px] font-semibold text-primary">
                    {r.method}
                  </span>
                  <span className="truncate text-foreground/80 group-hover:text-foreground">
                    {r.url}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </Section>

        <Section icon={<Sparkles className="h-3.5 w-3.5" />} label="Agent Runs">
          {agentRuns.length === 0 && (
            <p className="px-2 text-xs text-muted-foreground">No runs yet. Try the assistant.</p>
          )}
          {agentRuns.map((r) => (
            <button
              key={r.id}
              onClick={() => selectRun(r.id)}
              className={cn(
                "flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent",
                currentRun?.id === r.id && "bg-accent",
              )}
            >
              <span className="truncate text-foreground/90">{r.prompt}</span>
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    r.status === "success" && "bg-success",
                    r.status === "failed" && "bg-destructive",
                  )}
                />
                {r.steps.length} steps · {new Date(r.createdAt).toLocaleTimeString()}
              </span>
            </button>
          ))}
        </Section>

        <Section icon={<Clock className="h-3.5 w-3.5" />} label="History">
          {history.length === 0 && (
            <p className="px-2 text-xs text-muted-foreground">Requests will appear here.</p>
          )}
          {history.map((h) => (
            <button
              key={h.id}
              onClick={() => loadHistoryEntry(h.id)}
              className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent"
            >
              <span className="font-mono text-[10px] font-semibold text-primary w-10">
                {h.request.method}
              </span>
              <span className="flex-1 truncate text-foreground/80 group-hover:text-foreground">
                {h.request.url}
              </span>
              <StatusPill status={h.response?.status} />
            </button>
          ))}
        </Section>
      </div>

      <div className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
        Mock backend · /lib/agent
      </div>
    </aside>
  );
}

function Section({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}