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
  if (ensureCharacterSheets(state)) {
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
