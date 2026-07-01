import { Clock, FolderOpen, Plus, Sparkles } from "lucide-react";
import { useWorkspace } from "@/lib/agent/workspaceStore";
import { StatusPill } from "./StatusPill";

export function Sidebar() {
  const { history, collections, testCases, loadHistoryEntry, saveCurrent } = useWorkspace();

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-border bg-card/40">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-primary/15 text-primary">
          <FolderOpen className="h-4 w-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">Collections</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Save and reuse services
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-3">
        <Section icon={<FolderOpen className="h-3.5 w-3.5" />} label="Collections">
          <button
            onClick={() => {
              const name = window.prompt("Collection name", "My Services");
              if (name?.trim()) saveCurrent(name.trim());
            }}
            className="mb-2 flex w-full items-center gap-2 rounded-md border border-dashed border-border px-2 py-1.5 text-left text-[11px] text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Add new collection
          </button>
          {collections.map((c) => (
            <div key={c.id} className="space-y-0.5">
              <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground">
                {c.name}
              </div>
              {c.requests.map((entry, i) => (
                <button
                  key={entry.id}
                  onClick={() => loadHistoryEntry(`${c.id}:${i}`)}
                  className="group flex w-full flex-col items-start gap-1 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent"
                >
                  <div className="flex w-full items-center gap-2">
                    <span className="font-mono text-[10px] font-semibold text-primary">
                      {entry.request.method}
                    </span>
                    <span className="flex-1 truncate text-foreground/80 group-hover:text-foreground">
                      {entry.request.url}
                    </span>
                  </div>
                  {entry.response ? (
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="font-medium text-foreground/80">{entry.response.status}</span>
                      <span>{entry.response.durationMs}ms</span>
                      {entry.response.ok ? <span className="text-success">ok</span> : null}
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">saved request</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </Section>

        <Section icon={<Sparkles className="h-3.5 w-3.5" />} label="Test Cases">
          {testCases.length === 0 && (
            <p className="px-2 text-xs text-muted-foreground">Create a case from a response to reuse it.</p>
          )}
          {testCases.map((testCase) => (
            <button
              key={testCase.id}
              onClick={() => loadHistoryEntry(testCase.id)}
              className="flex w-full flex-col items-start gap-1 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent"
            >
              <span className="font-medium text-foreground/90">{testCase.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {testCase.request.method} {testCase.request.url} · {testCase.assertions.length} checks
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
              <StatusPill status={h.response?.status} durationMs={h.response?.durationMs} />
            </button>
          ))}
        </Section>
      </div>

      <div className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
        React UI · Python backend · Test assertions
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