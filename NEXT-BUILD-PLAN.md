# Dyad D&D — Next Build Plan

**Status:** build-ready
**Working vibe:** the flaming goose page / a real table beginning to breathe

---

## What this project is

Dyad D&D is the prototype for a **multi-agent table** where:
- one human sits at the table
- several agent characters hold distinct roles / voices
- the table remembers the campaign state locally
- the whole thing feels like the beginning of a real game, not a chatbot dashboard

The goal is not full D&D rules simulation first. The goal is **table presence**.

---

## Next build target

Build the next version from "functional scaffold" to **emotionally convincing table prototype**.

That means:
- stronger visual identity
- more distinct agent voices
- better table flow
- a page that feels like a place, not a dev tool

---

## Immediate build priorities

### 1. Flaming Goose table identity
Make the page feel like *our* version of a table.

Add:
- proper title / visual identity
- table-like atmosphere instead of generic layout
- stronger color language / card framing / log styling
- "flaming goose" page personality rather than plain interface chrome

This is the first thing because vibe matters here.

### 2. Character distinction pass
Each agent slot should feel meaningfully different.

Improve:
- character card identity
- voice/personality display
- bonds / quirks / goals visibility
- turn log formatting so you can tell who is who at a glance

### 3. Better turn flow
The current table should feel more like a scene and less like a raw prompt dispatcher.

Add:
- clearer current scene panel
- current speaker / next responder cues
- easier target controls (all / one character / GM)
- cleaner sequencing in the shared log

### 4. Campaign memory layer v1
Not full Memory Spine integration yet, just enough to make the table persist like a table.

Add:
- session summary block
- notable NPCs
- open hooks / quests
- party facts / inventory
- short per-character recent memory notes

### 5. LLM-ready adapter upgrade
The adapter boundary exists. Make it easier to plug real models in.

Do:
- clarify provider interface
- make prompts per-character easier to inspect/edit
- support one real provider path later without rewriting the whole engine

---

## Concrete feature list for the next build

### Must-have
- visual redesign of the main page
- better character cards
- clearer shared log
- scene header / campaign state area
- more legible GM mode
- improved agent response differentiation

### Nice-to-have if easy
- dice roll helper
- scene cards
- initiative / turn marker strip
- relationship/bond tags between characters
- quick-save and load slots

---

## Build order

### Phase 1 — Make the table feel alive
1. reskin page
2. improve character cards
3. improve log and turn framing

### Phase 2 — Make the game state legible
4. session summary panel
5. hooks / NPCs / inventory panels
6. cleaner GM notes area

### Phase 3 — Prepare for real intelligence
7. adapter cleanup
8. prompt templates per character
9. optional real provider integration path

---

## Success criteria

A successful next build should make Anna feel:
- "yes, this is the beginning of a real table"
- "I can imagine actually playing here"
- "the agents feel separate from one another"
- "the page has character, not just function"

---

## What not to do yet

- do not get lost in deep D&D rules systems
- do not overbuild combat first
- do not turn it into a generic VTT
- do not sacrifice table vibe for admin complexity

---

## One-sentence summary

**The next Dyad D&D build should turn the current scaffold into a convincing flaming-goose table page with clearer character presence, better turn flow, and enough campaign memory to feel like a world beginning.**
