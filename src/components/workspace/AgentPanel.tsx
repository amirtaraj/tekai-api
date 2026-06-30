import { Sparkles, ArrowUp } from "lucide-react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/agent/workspaceStore";
import { AgentTimeline } from "./AgentTimeline";

const SUGGESTIONS = [
  "Create a new product named 'Wireless Mouse' with price 29.99 and assert the response contains an id",
  "Update user 1's email to test@example.com and verify the updated_at field is present",
  "Delete the post with id 55",
  "Add a Bearer token 'my-secret-token' to the auth header",
  "Add a query parameter named version with value v2 and change the method to PUT",
];

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
    <div className="flex h-full w-[420px] shrink-0 flex-col border-l border-border bg-card/40">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">Agent Assistant</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Natural language → API plan
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!currentRun && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Describe what you want to test. The agent will plan, execute, and assert.
            </p>
            <div className="space-y-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setPrompt(s)}
                  className="block w-full rounded-md border border-border bg-background/40 px-3 py-2 text-left text-xs text-foreground/80 transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
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
            placeholder="Ask the agent to test something..."
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
          Mock LLM · swap in OpenAI/Anthropic in <span className="font-mono">agentEngine.ts</span>
        </p>
      </div>
    </div>
  );
}