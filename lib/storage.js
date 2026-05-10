import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@libsql/client";
import { buildSeedState as createSeedState } from "./seed.js";

const dataDir = path.join(process.cwd(), "data");
const stateFile = path.join(dataDir, "runtime-state.json");
const stateKey = process.env.FLAMING_GOOSE_STATE_KEY || "default";

const databaseUrl = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL || "";
const databaseAuthToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN || "";
const storageMode = databaseUrl ? "libsql" : "file";

let clientPromise;

function blankCharacterSheet(agent = {}) {
  return {
    characterName: agent.name || "",
    classLevel: agent.classRole || "",
    background: "",
    playerName: "",
    race: "",
    alignment: "",
    experiencePoints: "",
    proficiencyBonus: "",
    inspiration: "",
    armorClass: "",
    initiative: "",
    speed: "",
    hitPointMaximum: "",
    currentHitPoints: "",
    temporaryHitPoints: "",
    hitDice: "",
    deathSaveSuccesses: "",
    deathSaveFailures: "",
    passivePerception: "",
    abilities: {
      strength: { score: "", modifier: "", save: "", skills: { athletics: "" } },
      dexterity: { score: "", modifier: "", save: "", skills: { acrobatics: "", sleightOfHand: "", stealth: "" } },
      constitution: { score: "", modifier: "", save: "", skills: {} },
      intelligence: { score: "", modifier: "", save: "", skills: { arcana: "", history: "", investigation: "", nature: "", religion: "" } },
      wisdom: { score: "", modifier: "", save: "", skills: { animalHandling: "", insight: "", medicine: "", perception: "", survival: "" } },
      charisma: { score: "", modifier: "", save: "", skills: { deception: "", intimidation: "", performance: "", persuasion: "" } }
    },
    attacksSpellcasting: "",
    featuresTraits: "",
    otherProficienciesLanguages: "",
    equipmentNotes: ""
  };
}

function ensureCharacterSheets(state) {
  if (!Array.isArray(state.agents)) return false;
  let changed = false;
  for (const agent of state.agents) {
    if (!agent.characterSheet) {
      agent.characterSheet = blankCharacterSheet(agent);
      changed = true;
    }
  }
  return changed;
}

function isDefaultWelcomeEntry(entry = {}) {
  const text = String(entry.text || "").toLowerCase();
  return entry.id === "seed-1"
    || (entry.speakerLabel === "Table Keeper"
      && text.includes("welcome to the flaming goose tavern")
      && text.includes("accessibility"));
}

function removeDefaultWelcomeEntries(state) {
  if (!Array.isArray(state.log)) return false;
  const nextLog = state.log.filter((entry) => !isDefaultWelcomeEntry(entry));
  if (nextLog.length === state.log.length) return false;
  state.log = nextLog;
  return true;
}

function removeDecorativeEmojiFromState(state) {
  let changed = false;
  const replacements = [
    ["Welcome to the Flaming Goose Tavern. 🦢🔥 Tap ⚙️ for accessibility settings — font size, high contrast, colours. Tap 📖 for rules reference. Roll dice at the top. This is yours.", "Welcome to the Flaming Goose Tavern. Use Accessibility Settings for font size, high contrast, and colours. Use Rules Reference for rules help. Roll dice at the top. This is yours."],
    ["🦢🔥", ""],
    ["⚙️", "Accessibility Settings"],
    ["📖", "Rules Reference"],
    ["🎲", ""],
    ["🔊", "Read aloud"],
    ["📝", "Copy notes"],
    ["♿", "Accessibility"],
  ];

  for (const entry of state.log || []) {
    if (typeof entry.text !== "string") continue;
    let text = entry.text;
    for (const [oldText, newText] of replacements) {
      text = text.replaceAll(oldText, newText);
    }
    text = text.replace(/\s{2,}/g, " ").trim();
    if (text !== entry.text) {
      entry.text = text;
      changed = true;
    }
  }
  return changed;
}

function ensureStateShape(state) {
  let changed = false;
  if (!state || typeof state !== "object") {
    return { state: createSeedState(), changed: true };
  }

  if (!state.meta || typeof state.meta !== "object") {
    state.meta = {};
    changed = true;
  }
  if (!state.campaign || typeof state.campaign !== "object") {
    state.campaign = createSeedState().campaign;
    changed = true;
  }
  if (!Array.isArray(state.log)) {
    state.log = [];
    changed = true;
  }
  if (!Array.isArray(state.agents)) {
    state.agents = createSeedState().agents;
    changed = true;
  }

  changed = ensureCharacterSheets(state) || changed;
  changed = removeDecorativeEmojiFromState(state) || changed;
  changed = removeDefaultWelcomeEntries(state) || changed;
  return { state, changed };
}

async function ensureFileState() {
  await mkdir(dataDir, { recursive: true });
  try {
    await readFile(stateFile, "utf8");
  } catch {
    const seed = createSeedState();
    seed.meta.storage = "file";
    await writeFile(stateFile, JSON.stringify(seed, null, 2));
  }
}

async function readFileState() {
  await ensureFileState();
  const raw = await readFile(stateFile, "utf8");
  const { state, changed } = ensureStateShape(JSON.parse(raw));
  if (changed) {
    await writeFileState(state);
  }
  return state;
}

async function writeFileState(state) {
  state.meta = state.meta || {};
  state.meta.updatedAt = new Date().toISOString();
  state.meta.storage = "file";
  await mkdir(dataDir, { recursive: true });
  await writeFile(stateFile, JSON.stringify(state, null, 2));
  return state;
}

async function getClient() {
  if (!clientPromise) {
    clientPromise = Promise.resolve().then(async () => {
      const client = createClient({
        url: databaseUrl,
        authToken: databaseAuthToken || undefined,
      });
      await client.execute(`
        CREATE TABLE IF NOT EXISTS flaming_goose_state (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
      return client;
    });
  }
  return clientPromise;
}

async function readDatabaseState() {
  const client = await getClient();
  const result = await client.execute({
    sql: "SELECT value FROM flaming_goose_state WHERE key = ? LIMIT 1",
    args: [stateKey],
  });

  if (!result.rows.length) {
    const seed = createSeedState();
    await writeDatabaseState(seed);
    return seed;
  }

  const { state, changed } = ensureStateShape(JSON.parse(String(result.rows[0].value)));
  if (changed) {
    await writeDatabaseState(state);
  }
  return state;
}

async function writeDatabaseState(state) {
  const client = await getClient();
  state.meta = state.meta || {};
  state.meta.updatedAt = new Date().toISOString();
  state.meta.storage = "libsql";
  state.meta.storageKey = stateKey;

  await client.execute({
    sql: `
      INSERT INTO flaming_goose_state (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `,
    args: [stateKey, JSON.stringify(state), state.meta.updatedAt],
  });
  return state;
}

export function getStorageMode() {
  return storageMode;
}

export async function readState() {
  return storageMode === "libsql" ? readDatabaseState() : readFileState();
}

export async function writeState(state) {
  return storageMode === "libsql" ? writeDatabaseState(state) : writeFileState(state);
}

export async function resetState() {
  const seed = createSeedState();
  await writeState(seed);
  return seed;
}
