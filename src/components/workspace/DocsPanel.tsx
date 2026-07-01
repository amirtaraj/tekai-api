const DOCS = `# Agentic AI · API Testing Tool

A lightweight workspace for planning, executing, and validating API requests through a Python-backed agent.

## How the app works

1. **Manual API Runner** — choose a method, enter a path, and send the request from the main workspace.
2. **Agent Assistant** — describe the task in natural language and the agent will plan the steps, run them, and surface the results in the timeline.
3. **Collections and Tests** — every request and response can be saved, and successful responses can be turned into reusable test cases.

## Architecture

\`\`\`
src/
├─ components/workspace/   # UI panels and request runner
├─ lib/agent/
│   ├─ agentEngine.ts      # frontend orchestration for the agent loop
│   ├─ apiExecutor.ts      # forwards requests to the Python backend
│   └─ workspaceStore.tsx  # shared state for requests, history, collections, and tests
└─ python_backend/         # Python service for planning and request execution
\`\`\`

The React frontend stays in TypeScript/JavaScript, while the planning and execution runtime lives in Python.

## Running locally

- Start the Python service: \`npm run python:agent\`
- Start the frontend: \`npm run dev\`

## Extending the experience

- Add more agent behavior in \`python_backend/agent_service.py\`
- Adjust the frontend flow in \`src/lib/agent/agentEngine.ts\`
- Create new workspace panels inside \`src/components/workspace/\`
`;

export function DocsPanel() {
  return (
    <div className="mx-auto max-w-3xl p-8">
      <article>{renderMarkdown(DOCS)}</article>
    </div>
  );
}

function renderMarkdown(src: string) {
  const blocks = src.split(/\n{2,}/);
  return blocks.map((block, i) => {
    if (block.startsWith("```")) {
      const code = block.replace(/^```\w*\n?/, "").replace(/```$/, "");
      return (
        <pre
          key={i}
          className="my-4 overflow-auto rounded-md border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed text-foreground/90"
        >
          {code}
        </pre>
      );
    }
    if (block.startsWith("# ")) {
      return (
        <h1 key={i} className="mb-2 mt-6 text-2xl font-semibold tracking-tight">
          {block.slice(2)}
        </h1>
      );
    }
    if (block.startsWith("## ")) {
      return (
        <h2 key={i} className="mb-2 mt-6 text-lg font-semibold tracking-tight">
          {block.slice(3)}
        </h2>
      );
    }
    if (block.startsWith("- ")) {
      const items = block.split("\n").map((l) => l.replace(/^- /, ""));
      return (
        <ul key={i} className="my-3 list-disc space-y-1 pl-5 text-sm text-foreground/85">
          {items.map((it, j) => (
            <li key={j}>{inline(it)}</li>
          ))}
        </ul>
      );
    }
    if (/^\d+\.\s/.test(block)) {
      const items = block.split("\n").map((l) => l.replace(/^\d+\.\s/, ""));
      return (
        <ol key={i} className="my-3 list-decimal space-y-1 pl-5 text-sm text-foreground/85">
          {items.map((it, j) => (
            <li key={j}>{inline(it)}</li>
          ))}
        </ol>
      );
    }
    return (
      <p key={i} className="my-3 text-sm leading-relaxed text-foreground/85">
        {inline(block)}
      </p>
    );
  });
}

function inline(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("`") && p.endsWith("`")) {
      return (
        <code
          key={i}
          className="rounded bg-muted/60 px-1 py-0.5 font-mono text-[12px] text-primary"
        >
          {p.slice(1, -1)}
        </code>
      );
    }
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {p.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{p}</span>;
  });
}