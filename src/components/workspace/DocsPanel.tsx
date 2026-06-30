const DOCS = `# Agentic AI · API Testing Tool

A scalable boilerplate for building an LLM-driven API testing experience.

## How the demo works

1. **Manual API Runner** — pick a method, type a path, and hit **Send**. The request is routed through \`apiExecutor.ts\` to a mock in-memory backend (no network required).
2. **Agent Assistant** — type natural language. The mock agent plans a sequence of \`Thought → Action → Observation → Assertion\` steps, streamed live into the timeline.
3. **History & Collections** — every send is logged. Save the current request into a collection with the disk icon.

## Available mock endpoints

- \`POST /auth/login\` — returns a fake JWT
- \`GET|POST|PUT|PATCH|DELETE /users[/:id]\` — full CRUD
- \`GET|POST|PUT|PATCH|DELETE /products[/:id]\` — full CRUD
- \`GET|POST|DELETE /orders[/:id]\` — requires \`Authorization: Bearer …\`
- \`GET|POST|PUT|PATCH|DELETE /posts[/:id]\` — full CRUD
- \`GET /admin/*\` — requires header \`x-api-key: demo-api-key\`
- \`GET /health\`

## What the agent can do

The mock agent understands four broad intents:

1. **CRUD prompts** — "Create a new product named 'Mouse' with price 29.99", "Update user 1's email to x@y.com", "Delete post 55", "Fetch user 2".
2. **Edit-the-loaded-request prompts** — if a request is loaded in the manual runner, the agent will *modify it in place*:
    - "Add a Bearer token 'abc123' to the auth header"
    - "Add a query parameter named version with value v2"
    - "Change the method to PUT" / "Set email to test@example.com"
3. **Auth bootstrapping** — anything touching \`/orders\` automatically gets a \`POST /auth/login\` step first; the bearer token flows into the next call via \`{{token}}\`.
4. **Assertions** — every action produces a checklist: status code, response time, body shape, JSON Schema-style field presence.

## Interactive timeline

- Click any agent step that has a request to **load that request and its response into the manual workspace**.
- Use the **Apply** button next to an action to copy its request into the runner for further editing.
- Edit steps show a diff of which fields were changed in the workspace request.

## Architecture

\`\`\`
src/
├─ lib/agent/
│   ├─ types.ts          # shared TS types
│   ├─ apiExecutor.ts    # single fetch entry  ← swap for real fetch
│   ├─ mockBackend.ts    # in-memory endpoints ← delete when going live
│   ├─ agentEngine.ts    # mock planner + loop ← swap for real LLM
│   └─ workspaceStore   # React context state
└─ components/workspace/ # UI only — no business logic
\`\`\`

UI and engine are fully decoupled — components only read/write through \`useWorkspace()\`.

## Wire in a real LLM

Open \`src/lib/agent/agentEngine.ts\` and replace \`planFromPrompt\` with a call to your provider (OpenAI, Anthropic, or the Lovable AI Gateway). Return a list of \`AgentStep\` drafts; the streaming loop and context propagation (auth tokens, etc.) keep working unchanged.

## Wire in a real backend

Open \`src/lib/agent/apiExecutor.ts\`. A reference \`realFetch\` implementation is already there — change \`executeRequest\` to call it instead of \`mockFetch\`.

## Add a new mock endpoint

Edit \`src/lib/agent/mockBackend.ts\`, add a branch in the \`mockFetch\` router, and (optionally) list it in \`MOCK_ENDPOINTS\`.

## Add a new UI panel

Drop a component into \`src/components/workspace/\` and slot it into \`src/routes/index.tsx\`. No global wiring required.
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