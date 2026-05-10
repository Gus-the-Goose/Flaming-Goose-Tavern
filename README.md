# Dyad D&D MVP

Local-first prototype for a multi-agent D&D table with a simple browser UI, persistent campaign state, agent character slots, and a mock orchestration layer that can later be replaced with real LLM providers.

## Stack

- Node.js built-in HTTP server
- Static HTML/CSS/JS frontend
- Local JSON file persistence for development
- Optional Turso/libSQL persistence for Railway/cloud deploys

This keeps local setup simple while giving the live app real durable storage when database environment variables are set.

## Run

1. Ensure Node.js 20+ is installed.
2. Start the app:

```bash
npm start
```

3. Open `http://localhost:3000`.

For auto-reload while iterating:

```bash
npm run dev
```

## What is included

- One local campaign/table view
- One human participant plus 4 agent slots
- Optional GM mode toggle and GM notes
- Persistent campaign state stored in `data/runtime-state.json` locally, or in Turso/libSQL when configured
- Example seeded characters and campaign memory
- Turn-based shared log
- Human prompts can target the full table or a single character
- Mock agent reply generator with distinct role/voice prompts
- Clear adapter boundary for future real LLM integration in `lib/llm-adapter.js`

## Persistence

By default, state is saved to `data/runtime-state.json` for local development.

For Railway/cloud persistence, add these environment variables:

```bash
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-token
```

Optional:

```bash
FLAMING_GOOSE_STATE_KEY=default
```

The app stores the whole campaign/table state as one JSON document in a `flaming_goose_state` table. This preserves campaign notes, logs, character sheets, and GM state across Railway restarts.

Health check:

```bash
curl /api/health
```

## Files

- `server.js`: HTTP server and API routes
- `lib/storage.js`: persistent local state
- `lib/seed.js`: initial campaign/character data
- `lib/table-engine.js`: turn handling and mock multi-agent responses
- `lib/llm-adapter.js`: provider abstraction and local mock provider
- `public/`: browser UI

## Extension points

- Replace the mock provider in `lib/llm-adapter.js` with OpenAI or another model provider
- Add richer memory summarization and per-agent context windows in `lib/table-engine.js`
- Split campaign saves into multiple files or slots in `lib/storage.js`
- Add dice rules, initiative, and scene management in the UI and engine
