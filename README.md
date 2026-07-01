# Agentic AI · API Testing Tool

A lightweight workspace for planning, executing, and validating API requests through a Python-backed agent.

## Overview

- The frontend stays in React and TypeScript.
- Planning and request execution are routed through a local Python service.
- Requests, responses, collections, and test cases are all managed in the workspace UI.

## Run locally

1. Start the Python service:
   - npm run python:agent
2. Start the frontend:
   - npm run dev

## Project structure

- src/components/workspace/ — UI panels and request runner
- src/lib/agent/ — workspace state, agent orchestration, and request forwarding
- python_backend/ — Python service for agent planning and request execution

## Next steps

- Extend the Python agent logic in python_backend/agent_service.py
- Adjust the frontend experience in src/lib/agent/agentEngine.ts
- Add new workspace panels in src/components/workspace/
