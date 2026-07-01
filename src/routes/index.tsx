import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { WorkspaceProvider } from "@/lib/agent/workspaceStore";
import { Sidebar } from "@/components/workspace/Sidebar";
import { ApiRunner } from "@/components/workspace/ApiRunner";
import { AgentPanel } from "@/components/workspace/AgentPanel";
import { DocsPanel } from "@/components/workspace/DocsPanel";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Agentic API · Testing Tool" },
      {
        name: "description",
        content:
          "Agentic AI workspace for API testing — plan, execute, and assert REST calls with natural language.",
      },
      { property: "og:title", content: "Agentic API · Testing Tool" },
      {
        property: "og:description",
        content:
          "Agentic AI workspace for API testing — plan, execute, and assert REST calls with natural language.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [tab, setTab] = useState<"workspace" | "docs">("workspace");
  return (
    <WorkspaceProvider>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
        <header className="flex items-center justify-between border-b border-border px-4 py-2">
          <div className="flex items-center gap-1">
            {(["workspace", "docs"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
                  tab === t
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
            mock backend online
          </div>
        </header>
        {tab === "workspace" ? (
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex flex-1 overflow-hidden">
              <div className="flex flex-1 flex-col overflow-hidden">
                <AgentPanel />
                <div className="h-[34%] min-h-[280px] border-t border-border bg-card/20">
                  <ApiRunner />
                </div>
              </div>
            </main>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <DocsPanel />
          </div>
        )}
      </div>
    </WorkspaceProvider>
  );
}
