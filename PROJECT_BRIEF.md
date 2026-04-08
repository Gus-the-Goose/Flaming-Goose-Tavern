# Dyad D&D / Multi-Agent Table MVP

Build a small prototype for a multi-agent D&D play space.

## Core fantasy
A human can host or join a D&D-style session where multiple AI agents each occupy a distinct role (player characters and optionally GM/NPCs), maintain separate character sheets / memory, and converse in a shared table interface.

## MVP goals
- Web-based local prototype
- One campaign / table view
- 1 human user
- 2-4 agent players
- Optional GM agent mode (or human GM placeholder)
- Persistent campaign state saved locally
- Character profiles with:
  - name
  - class / role
  - personality / voice
  - goals / bonds / quirks
  - short memory / session notes
- Turn-based interaction log
- Human can prompt the table, address one character, or address all
- Agents should respond in distinct voices and remain roughly in character
- Simple campaign memory:
  - session summary
  - notable NPCs
  - open quests / hooks
  - party inventory / facts

## Nice-to-have if easy
- Dice roll helper
- Scene cards / location cards
- GM notes panel
- Ability to save/load campaigns
- Prompt templates for keeping agent roles distinct

## Constraints
- Keep it simple and vibecodable
- No complex auth
- Local-first
- Use a stack Codex can scaffold quickly
- Favor clarity over polish

## Suggested stack
- Next.js or Vite + React frontend
- Simple Node/TS backend or API routes
- SQLite / JSON file persistence
- LLM adapter abstraction so agent/player slots can later be wired to different providers/models

## Deliverable
A runnable local prototype with:
- setup instructions
- basic UI
- local persistence
- example character seeds
- clear extension points for better memory, GM logic, and multi-agent orchestration later

## Tone
This should feel like the beginnings of a real table, not a generic chatbot dashboard.
