import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildSeedState as createSeedState } from "./seed.js";

const dataDir = path.join(process.cwd(), "data");
const stateFile = path.join(dataDir, "runtime-state.json");

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

async function ensureStateFile() {
  await mkdir(dataDir, { recursive: true });
  try {
    await readFile(stateFile, "utf8");
  } catch {
    const seed = createSeedState();
    await writeFile(stateFile, JSON.stringify(seed, null, 2));
  }
}

export async function readState() {
  await ensureStateFile();
  const raw = await readFile(stateFile, "utf8");
  const state = JSON.parse(raw);
  const characterSheetsChanged = ensureCharacterSheets(state);
  const emojiTextChanged = removeDecorativeEmojiFromState(state);
  if (characterSheetsChanged || emojiTextChanged) {
    await writeState(state);
  }
  return state;
}

export async function writeState(state) {
  state.meta.updatedAt = new Date().toISOString();
  await mkdir(dataDir, { recursive: true });
  await writeFile(stateFile, JSON.stringify(state, null, 2));
  return state;
}

export async function resetState() {
  const seed = createSeedState();
  await writeState(seed);
  return seed;
}
