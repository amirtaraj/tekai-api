import { Sparkles, ArrowUp } from "lucide-react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/agent/workspaceStore";
import { AgentTimeline } from "./AgentTimeline";

export function AgentPanel() {
  const { runPrompt, runningAgent, currentRun } = useWorkspace();
  const [prompt, setPrompt] = useState("");

  const submit = () => {
    const p = prompt.trim();
    if (!p || runningAgent) return;
    setPrompt("");
    runPrompt(p);
  };

  return (
    <div className="flex h-full flex-1 flex-col border-b border-border bg-card/40">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-primary/15 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">Python Agent Service</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Plan, execute, and assert API calls from one place
            </span>
          </div>
        </div>
        {currentRun && (
          <div className="rounded-full border border-border bg-background/70 px-2.5 py-1 text-[10px] text-muted-foreground">
            {currentRun.steps.length} steps
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!currentRun && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Describe the service you want to test. The agent will plan the request, execute it, and add assertions from the response.
            </p>
          </div>
        )}

        {currentRun && <AgentTimeline run={currentRun} />}
      </div>

      <div className="border-t border-border p-3">
        <div className="relative">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Create a product, update a user, or test a custom endpoint..."
            className="min-h-[72px] resize-none pr-12 text-sm"
            disabled={runningAgent}
          />
          <Button
            size="icon"
            onClick={submit}
            disabled={runningAgent || !prompt.trim()}
            className="absolute bottom-2 right-2 h-7 w-7"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Powered by python_backend/agent_service.py
        </p>
      </div>
    </div>
  );
}