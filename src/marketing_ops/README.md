# Marketing Ops Agents

This directory contains the LangGraph implementation of the Black Cat Tarot Marketing Ops agents.

## Setup

1. Copy `.env.example` to `.env` and set your `OPENAI_API_KEY`.
   ```bash
   cp .env.example .env
   ```

2. Install dependencies (if you haven't already):
   ```bash
   npm install
   ```

## Running the Agents

To run a test simulation of the agent graph:

```bash
npx ts-node src/test_graph.ts
```

## Structure

- `prompts/`: System prompts for each agent (Markdown).
- `nodes/`: TypeScript implementation of each agent's logic.
- `state.ts`: Shared state definition.
- `graph.ts`: The main LangGraph definition wiring the nodes.
