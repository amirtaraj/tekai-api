Agentic AI · API Testing Tool
A scalable boilerplate for building an LLM-driven API testing experience.

How the demo works
Manual API Runner — pick a method, type a path, and hit Send. The request is routed through apiExecutor.ts to a mock in-memory backend (no network required).
Agent Assistant — type natural language. The mock agent plans a sequence of Thought → Action → Observation → Assertion steps, streamed live into the timeline.
History & Collections — every send is logged. Save the current request into a collection with the disk icon.
Available mock endpoints
POST /auth/login — returns a fake JWT
GET|POST|PUT|PATCH|DELETE /users[/:id] — full CRUD
GET|POST|PUT|PATCH|DELETE /products[/:id] — full CRUD
GET|POST|DELETE /orders[/:id] — requires Authorization: Bearer …
GET|POST|PUT|PATCH|DELETE /posts[/:id] — full CRUD
GET /admin/* — requires header x-api-key: demo-api-key
GET /health
What the agent can do
The mock agent understands four broad intents:

CRUD prompts — "Create a new product named 'Mouse' with price 29.99", "Update user 1's email to x@y.com", "Delete post 55", "Fetch user 2".
Edit-the-loaded-request prompts — if a request is loaded in the manual runner, the agent will *modify it in place*:
- "Add a Bearer token 'abc123' to the auth header"
- "Add a query parameter named version with value v2"
- "Change the method to PUT" / "Set email to test@example.com"
Auth bootstrapping — anything touching /orders automatically gets a POST /auth/login step first; the bearer token flows into the next call via {{token}}.
Assertions — every action produces a checklist: status code, response time, body shape, JSON Schema-style field presence.
Interactive timeline
Click any agent step that has a request to load that request and its response into the manual workspace.
Use the Apply button next to an action to copy its request into the runner for further editing.
Edit steps show a diff of which fields were changed in the workspace request.
Architecture
src/
├─ lib/agent/
│   ├─ types.ts          # shared TS types
│   ├─ apiExecutor.ts    # single fetch entry  ← swap for real fetch
│   ├─ mockBackend.ts    # in-memory endpoints ← delete when going live
│   ├─ agentEngine.ts    # mock planner + loop ← swap for real LLM
│   └─ workspaceStore   # React context state
└─ components/workspace/ # UI only — no business logic
UI and engine are fully decoupled — components only read/write through useWorkspace().

Wire in a real LLM
Open src/lib/agent/agentEngine.ts and replace planFromPrompt with a call to your provider (OpenAI, Anthropic, or the Lovable AI Gateway). Return a list of AgentStep drafts; the streaming loop and context propagation (auth tokens, etc.) keep working unchanged.

Wire in a real backend
Open src/lib/agent/apiExecutor.ts. A reference realFetch implementation is already there — change executeRequest to call it instead of mockFetch.

Add a new mock endpoint
Edit src/lib/agent/mockBackend.ts, add a branch in the mockFetch router, and (optionally) list it in MOCK_ENDPOINTS.

Add a new UI panel
Drop a component into src/components/workspace/ and slot it into src/routes/index.tsx. No global wiring required.
