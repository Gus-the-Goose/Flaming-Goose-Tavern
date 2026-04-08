import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildSeedState as createSeedState } from "./seed.js";

const dataDir = path.join(process.cwd(), "data");
const stateFile = path.join(dataDir, "runtime-state.json");

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
  return JSON.parse(raw);
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
