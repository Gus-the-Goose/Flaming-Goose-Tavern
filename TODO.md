# Flaming Goose Tavern — To Do

## Before next session (~2 weeks)

### 1. Persistence (critical)
Railway spins down the server after inactivity → game state resets.
Status: app now supports optional **Turso/libSQL** durable persistence via `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`, with local JSON fallback for development.
- Schema: single JSON state document in `flaming_goose_state`, covering campaign state, log entries, character data, and notes fields
- Remaining deploy step: provision/link a Turso database in Railway and set env vars
- Railway docs: https://docs.railway.app/databases/turso

### 2. TTS voice options
- Add a voice selector in the settings panel
- A couple of options per gender minimum (Web Speech API has ~5-8 voices)
- Store preference in localStorage per user

### 3. Note-taking / session notes integration
Start simple before external-app auth:
- Add a Notes panel in-app for Anna/GM notes during play
- Add buttons to copy/download: full transcript, OOC-only notes, IC-only log, and session summary
- Later optional integration targets: Google Docs, Apple Notes, Obsidian/Markdown, Notion

### 4. Character sheets for visually impaired players
- Basic accessible form-based character sheets are now started
- Next: test with Shaun/Jason and refine field order, labels, and mobile layout
- No PDF parsing needed initially — keep it structured and screen-reader-friendly

## Nice to have (later)
- Character sheet upload (PDF → structured data)
- Better voice options via ElevenLabs/Voxtral API
- Initiative tracker
- Dice roll history
- Per-player names/login-lite so messages can show Jason/Anna/etc automatically

## Session info
- App: https://flaming-goose-tavern-dnd.up.railway.app/
- Repo: https://github.com/Gus-the-Goose/Flaming-Goose-Tavern
- Railway project: Flaming-Goose-Tavern
