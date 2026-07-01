import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { WorkspaceProvider } from "@/lib/agent/workspaceStore";
import { Sidebar } from "@/components/workspace/Sidebar";
import { ApiRunner } from "@/components/workspace/ApiRunner";
import { AgentPanel } from "@/components/workspace/AgentPanel";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

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
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("tekai-theme") as "light" | "dark" | null;
    const nextTheme = savedTheme ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(nextTheme);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("tekai-theme", theme);
  }, [theme]);

  return (
    <WorkspaceProvider>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
        <header className="flex items-center justify-between border-b border-border px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-success" />
            <span className="text-sm font-semibold tracking-tight">Python API Service Studio</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark") }>
              {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              {theme === "dark" ? "Light" : "Dark"}
            </Button>
          </div>
        </header>
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
      </div>
    </WorkspaceProvider>
  );
}
