// ============================================
// THE FLAMING GOOSE TAVERN — Main App
// ============================================

const state = { data: null };

const REFRESH_INTERVAL_MS = 4000;
const MESSAGE_ARCHIVE_KEY = "flaming-goose-message-archive";
const SPOKEN_ARCHIVE_KEY = "flaming-goose-spoken-archive";
const VOICE_NOTES_KEY = "flaming-goose-voice-notes";
let lastLogSignature = "";
let refreshTimer = null;
let recognition = null;
let dictationActive = false;

const ABILITY_LABELS = {
  strength: ["Strength", ["athletics"]],
  dexterity: ["Dexterity", ["acrobatics", "sleightOfHand", "stealth"]],
  constitution: ["Constitution", []],
  intelligence: ["Intelligence", ["arcana", "history", "investigation", "nature", "religion"]],
  wisdom: ["Wisdom", ["animalHandling", "insight", "medicine", "perception", "survival"]],
  charisma: ["Charisma", ["deception", "intimidation", "performance", "persuasion"]],
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getPath(obj, path, fallback = "") {
  return path.split(".").reduce((acc, key) => acc?.[key], obj) ?? fallback;
}

function setPath(obj, path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  let target = obj;
  for (const key of keys) {
    target[key] = target[key] || {};
    target = target[key];
  }
  target[last] = value;
}

function logSignature(log = []) {
  return log.map((entry) => entry.id || `${entry.timestamp}-${entry.speakerLabel}-${entry.text}`).join("|");
}

function readArchive(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeArchive(key, entries) {
  localStorage.setItem(key, JSON.stringify(entries.slice(-500)));
}

function archiveLogEntries(entries = []) {
  const archive = readArchive(MESSAGE_ARCHIVE_KEY);
  const seen = new Set(archive.map((entry) => entry.id).filter(Boolean));
  for (const entry of entries) {
    if (!entry?.text || (entry.id && seen.has(entry.id))) continue;
    archive.push({
      id: entry.id,
      speakerLabel: entry.speakerLabel,
      target: entry.target,
      text: entry.text,
      timestamp: entry.timestamp || new Date().toISOString()
    });
    if (entry.id) seen.add(entry.id);
  }
  writeArchive(MESSAGE_ARCHIVE_KEY, archive);
}

function archiveSpokenText(text) {
  if (!text?.trim()) return;
  const archive = readArchive(SPOKEN_ARCHIVE_KEY);
  archive.push({ text: text.trim(), timestamp: new Date().toISOString() });
  writeArchive(SPOKEN_ARCHIVE_KEY, archive);
}

function transcriptText() {
  return readArchive(MESSAGE_ARCHIVE_KEY)
    .map((entry) => {
      const time = entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "";
      return `[${time}] ${entry.speakerLabel || "Unknown"}: ${entry.text}`;
    })
    .join("\n\n");
}

async function copyTranscript() {
  const text = transcriptText() || "No archived messages yet.";
  await navigator.clipboard.writeText(text);
  alert("Message transcript copied to clipboard. The floppy button copies; it does not save to the server.");
}

// --- Speaker colour assignment ---
const speakerColourMap = new Map();
let speakerIndex = 0;
function getSpeakerClass(name) {
  if (name === "System" || name === "Narrator") return "speaker-system";
  if (!speakerColourMap.has(name)) {
    speakerColourMap.set(name, speakerIndex % 6);
    speakerIndex++;
  }
  return `speaker-${speakerColourMap.get(name)}`;
}

// --- DOM Refs ---
const $ = (sel) => document.querySelector(sel);
const refs = {
  title: $("#campaign-title"),
  setting: $("#campaign-setting"),
  sceneLine: $("#scene-line"),
  logList: $("#log-list"),
  logTemplate: $("#log-entry-template"),
  messageForm: $("#message-form"),
  audienceSelect: $("#audience-select"),
  oocToggle: $("#ooc-toggle"),
  targetWrap: $("#target-wrap"),
  targetSelect: $("#target-select"),
  messageInput: $("#message-input"),
  campaignForm: $("#campaign-form"),
  agentsList: $("#agents-list"),
  // Settings
  settingsBtn: $("#settings-btn"),
  settingsBackdrop: $("#settings-backdrop"),
  settingsClose: $("#settings-close"),
  settingsReset: $("#settings-reset"),
  setFontSize: $("#set-font-size"),
  fontSizeVal: $("#font-size-val"),
  setFontWeight: $("#set-font-weight"),
  setFontFamily: $("#set-font-family"),
  setHighContrast: $("#set-high-contrast"),
  setReduceMotion: $("#set-reduce-motion"),
  setAccentColor: $("#set-accent-color"),
  setBgColor: $("#set-bg-color"),
  setTextColor: $("#set-text-color"),
  setPlayerName: $("#set-player-name"),
  setCharacterName: $("#set-character-name"),
  setTtsVoice: $("#set-tts-voice"),
  setDiceD4: $("#set-dice-d4"),
  setDiceD6: $("#set-dice-d6"),
  setDiceD8: $("#set-dice-d8"),
  setDiceD10: $("#set-dice-d10"),
  setDiceD12: $("#set-dice-d12"),
  setDiceD20: $("#set-dice-d20"),
  setBtnSettings: $("#set-btn-settings"),
  setBtnDrawer: $("#set-btn-drawer"),
  setBtnRules: $("#set-btn-rules"),
  setBtnNotes: $("#set-btn-notes"),
  setBtnCopy: $("#set-btn-copy"),
  setBtnSend: $("#set-btn-send"),
  // Rules
  rulesBtn: $("#rules-btn"),
  rulesBackdrop: $("#rules-backdrop"),
  rulesClose: $("#rules-close"),
  rulesSearch: $("#rules-search"),
  rulesContent: $("#rules-content"),
  // Notes
  notesBtn: $("#notes-btn"),
  notesBackdrop: $("#notes-backdrop"),
  notesClose: $("#notes-close"),
  notesStatus: $("#notes-status"),
  notesStart: $("#notes-start"),
  notesStop: $("#notes-stop"),
  notesCopy: $("#notes-copy"),
  notesDownload: $("#notes-download"),
  notesClear: $("#notes-clear"),
  notesText: $("#notes-text"),
  copyBtn: $("#copy-btn"),
  // Drawer
  drawerBtn: $("#drawer-btn"),
  drawerBackdrop: $("#drawer-backdrop"),
  drawer: $("#drawer"),
  drawerClose: $("#drawer-close"),
  // Dice
  diceMod: $("#dice-mod"),
  diceResult: $("#dice-result"),
};

// --- API ---
async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }
  return response.json();
}

// --- Render: Log ---
function renderLog(log) {
  const wasNearBottom = refs.logList.scrollHeight - refs.logList.scrollTop - refs.logList.clientHeight < 80;
  refs.logList.innerHTML = "";
  for (const entry of log) {
    const node = refs.logTemplate.content.cloneNode(true);
    const speakerEl = node.querySelector(".log-speaker");
    speakerEl.textContent = entry.speakerLabel;
    speakerEl.classList.add(getSpeakerClass(entry.speakerLabel));
    const entryEl = node.querySelector(".log-entry");
    entryEl.classList.toggle("ooc-entry", entry.speaker === "human-ooc");
    node.querySelector(".log-target").textContent =
      entry.target === "all" ? "" : `→ ${lookupAgentName(entry.target)}`;
    node.querySelector(".log-text").textContent = entry.text;
    const timeEl = node.querySelector(".log-time");
    if (entry.timestamp) {
      const d = new Date(entry.timestamp);
      timeEl.textContent = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    // TTS button
    const ttsBtn = node.querySelector(".tts-btn");
    ttsBtn.addEventListener("click", () => speakLogEntry(entry));

    refs.logList.appendChild(node);
  }
  lastLogSignature = logSignature(log);
  if (wasNearBottom) {
    refs.logList.scrollTop = refs.logList.scrollHeight;
  }
}

function lookupAgentName(agentId) {
  return state.data?.agents?.find((a) => a.id === agentId)?.name || "unknown";
}

// --- Render: Campaign ---
function renderCampaign(campaign) {
  refs.title.textContent = state.data.meta?.title || "The Flaming Goose Tavern";
  refs.setting.textContent = "Table Keeper";
  refs.sceneLine.textContent = campaign.currentScene || "No scene set";

  const fields = [
    ["currentScene", "Current scene"],
    ["sessionSummary", "Session summary"],
    ["notableNPCs", "Notable NPCs"],
    ["openQuests", "Open quests / hooks"],
    ["partyInventory", "Party inventory / facts"],
    ["facts", "Table facts"],
    ["gmNotes", "GM notes"],
  ];

  refs.campaignForm.innerHTML = `
    <label class="toggle-label">
      <input type="checkbox" name="gmMode" ${campaign.gmMode ? "checked" : ""} />
      <span>GM mode enabled</span>
    </label>
  `;

  for (const [key, label] of fields) {
    const field = document.createElement("label");
    field.innerHTML = `
      <span>${label}</span>
      <textarea name="${key}" rows="${key === "currentScene" ? 2 : 3}">${campaign[key] || ""}</textarea>
    `;
    refs.campaignForm.appendChild(field);
  }

  const saveBtn = document.createElement("button");
  saveBtn.type = "submit";
  saveBtn.textContent = "Save Campaign State";
  saveBtn.className = "secondary";
  refs.campaignForm.appendChild(saveBtn);
}

// --- Render: Agents ---
function renderAgents(agents) {
  refs.agentsList.innerHTML = "";
  for (const agent of agents) {
    const card = document.createElement("article");
    card.className = "agent-card";
    card.innerHTML = `
      <header>
        <div>
          <h3>${escapeHtml(agent.name)}</h3>
          <p class="agent-meta">${escapeHtml(agent.classRole)}</p>
        </div>
        <label class="toggle-label">
          <input type="checkbox" name="active" ${agent.active ? "checked" : ""} />
          <span>Active</span>
        </label>
      </header>
      <form class="agent-form" data-agent-id="${agent.id}">
        <details open>
          <summary>Role notes</summary>
          <label>Name<input name="name" value="${escapeHtml(agent.name)}" /></label>
          <label>Class / role<input name="classRole" value="${escapeHtml(agent.classRole)}" /></label>
          <label>Personality<textarea name="personality" rows="2">${escapeHtml(agent.personality)}</textarea></label>
          <label>Goals<textarea name="goals" rows="2">${escapeHtml(agent.goals)}</textarea></label>
          <label>Bonds / quirks<textarea name="bondsQuirks" rows="2">${escapeHtml(agent.bondsQuirks)}</textarea></label>
          <label>Notes<textarea name="memory" rows="2">${escapeHtml(agent.memory)}</textarea></label>
          <label>Voice style<input name="voiceStyle" value="${escapeHtml(agent.voiceStyle)}" /></label>
        </details>
        ${renderCharacterSheet(agent.characterSheet || {})}
        <button type="submit">Save</button>
      </form>
    `;
    refs.agentsList.appendChild(card);
  }
}

function sheetInput(sheet, path, label, className = "") {
  return `<label class="${className}"><span>${label}</span><input data-sheet-field="${path}" value="${escapeHtml(getPath(sheet, path))}" /></label>`;
}

function sheetTextarea(sheet, path, label) {
  return `<label><span>${label}</span><textarea data-sheet-field="${path}" rows="5">${escapeHtml(getPath(sheet, path))}</textarea></label>`;
}

function skillLabel(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}

function renderCharacterSheet(sheet) {
  const abilities = Object.entries(ABILITY_LABELS).map(([key, [label, skills]]) => `
    <fieldset class="ability-card">
      <legend>${label}</legend>
      <div class="ability-row">
        ${sheetInput(sheet, `abilities.${key}.score`, "Score")}
        ${sheetInput(sheet, `abilities.${key}.modifier`, "Mod")}
        ${sheetInput(sheet, `abilities.${key}.save`, "Save")}
      </div>
      ${skills.map((skill) => sheetInput(sheet, `abilities.${key}.skills.${skill}`, skillLabel(skill), "skill-field")).join("")}
    </fieldset>
  `).join("");

  return `
    <details class="character-sheet-block">
      <summary>Fillable D&D 5e character sheet</summary>
      <p class="sheet-help">Structured, screen-reader-friendly version of the blank sheet. Empty fields are fine — fill as the character develops.</p>
      <section class="sheet-grid sheet-grid-top">
        ${sheetInput(sheet, "characterName", "Character name")}
        ${sheetInput(sheet, "classLevel", "Class & level")}
        ${sheetInput(sheet, "background", "Background")}
        ${sheetInput(sheet, "playerName", "Player name")}
        ${sheetInput(sheet, "race", "Race")}
        ${sheetInput(sheet, "alignment", "Alignment")}
        ${sheetInput(sheet, "experiencePoints", "Experience points")}
      </section>
      <section class="sheet-grid sheet-grid-stats">
        ${sheetInput(sheet, "proficiencyBonus", "Proficiency bonus")}
        ${sheetInput(sheet, "inspiration", "Inspiration")}
        ${sheetInput(sheet, "armorClass", "Armor class")}
        ${sheetInput(sheet, "initiative", "Initiative")}
        ${sheetInput(sheet, "speed", "Speed")}
        ${sheetInput(sheet, "hitPointMaximum", "HP max")}
        ${sheetInput(sheet, "currentHitPoints", "Current HP")}
        ${sheetInput(sheet, "temporaryHitPoints", "Temp HP")}
        ${sheetInput(sheet, "hitDice", "Hit dice")}
        ${sheetInput(sheet, "deathSaveSuccesses", "Death save successes")}
        ${sheetInput(sheet, "deathSaveFailures", "Death save failures")}
        ${sheetInput(sheet, "passivePerception", "Passive perception")}
      </section>
      <section class="abilities-grid">${abilities}</section>
      <section class="sheet-grid sheet-grid-notes">
        ${sheetTextarea(sheet, "attacksSpellcasting", "Attacks & spellcasting")}
        ${sheetTextarea(sheet, "featuresTraits", "Features & traits")}
        ${sheetTextarea(sheet, "otherProficienciesLanguages", "Other proficiencies & languages")}
        ${sheetTextarea(sheet, "equipmentNotes", "Equipment & character notes")}
      </section>
    </details>
  `;
}

function renderTargetOptions(agents) {
  refs.targetSelect.innerHTML = "";
  for (const agent of agents.filter((a) => a.active)) {
    const opt = document.createElement("option");
    opt.value = agent.id;
    opt.textContent = `${agent.name} (${agent.classRole})`;
    refs.targetSelect.appendChild(opt);
  }
}

function renderAll() {
  if (!state.data) return;
  renderCampaign(state.data.campaign);
  renderLog(state.data.log);
  renderAgents(state.data.agents);
  renderTargetOptions(state.data.agents);
}

async function loadState() {
  state.data = await api("/api/state");
  archiveLogEntries(state.data.log);
  renderAll();
  startAutoRefresh();
}

async function refreshState() {
  if (!state.data) return;
  const previousIds = new Set((state.data.log || []).map((entry) => entry.id).filter(Boolean));
  const nextData = await api("/api/state");
  const newEntries = (nextData.log || []).filter((entry) => entry.id && !previousIds.has(entry.id));
  archiveLogEntries(newEntries);
  state.data = nextData;
  const nextSignature = logSignature(nextData.log);
  if (nextSignature !== lastLogSignature) {
    renderLog(nextData.log);
  }
}

function startAutoRefresh() {
  if (refreshTimer) return;
  refreshTimer = window.setInterval(() => {
    refreshState().catch((error) => console.warn("Auto-refresh failed", error));
  }, REFRESH_INTERVAL_MS);
}

// --- Dice Roller ---
function rollDie(sides) {
  const mod = parseInt(refs.diceMod.value) || 0;
  const result = Math.floor(Math.random() * sides) + 1;
  const total = result + mod;
  const modStr = mod !== 0 ? ` (${mod >= 0 ? "+" : ""}${mod})` : "";
  const display = `d${sides}: ${result}${modStr} = ${total}`;

  refs.diceResult.textContent = display;
  refs.diceResult.classList.remove("hidden");

  // Also speak it
  speak(`Rolled ${total} on a d ${sides}`);

  return total;
}

document.querySelectorAll(".dice-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    rollDie(parseInt(btn.dataset.die));
  });
});

// --- TTS (Web Speech API) ---
let ttsActive = false;

function preferredVoice() {
  if (!("speechSynthesis" in window)) return null;
  const pref = loadSettings().ttsVoice;
  if (!pref || pref === "default") return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const femaleHints = ["female", "samantha", "victoria", "karen", "moira", "tessa", "susan", "zira", "serena", "shelley"];
  const maleHints = ["male", "daniel", "alex", "oliver", "arthur", "fred", "george", "gordon", "ryan", "tom"];
  const hints = pref === "male" ? maleHints : femaleHints;
  const english = voices.filter((voice) => voice.lang?.toLowerCase().startsWith("en"));
  return english.find((voice) => hints.some((hint) => voice.name.toLowerCase().includes(hint)))
    || english[0]
    || voices[0]
    || null;
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  archiveSpokenText(text);
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = preferredVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = 0.95;
  utterance.onstart = () => { ttsActive = true; updateTtsControl(); };
  utterance.onend = () => { ttsActive = false; updateTtsControl(); };
  utterance.onerror = () => { ttsActive = false; updateTtsControl(); };
  window.speechSynthesis.speak(utterance);
}

function speakLogEntry(entry) {
  const speaker = entry?.speakerLabel ? `${entry.speakerLabel}. ` : "";
  speak(`${speaker}${entry?.text || ""}`);
}

function toggleTts() {
  if (!("speechSynthesis" in window)) return;
  if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
    window.speechSynthesis.pause();
    ttsActive = false;
  } else if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    ttsActive = true;
  } else {
    window.speechSynthesis.cancel();
    ttsActive = false;
  }
  updateTtsControl();
}

function updateTtsControl() {
  const btn = document.getElementById("tts-control");
  if (!btn) return;
  const paused = window.speechSynthesis.paused;
  const speaking = window.speechSynthesis.speaking;
  btn.textContent = speaking && !paused ? "Stop" : (paused ? "Resume" : "Read aloud");
  btn.classList.toggle("hidden", !speaking && !paused);
}

function initTtsControl() {
  const btn = document.createElement("button");
  btn.id = "tts-control";
  btn.className = "icon-btn small hidden";
  btn.style.cssText = "position:fixed;bottom:12px;right:12px;z-index:800;background:var(--accent);color:var(--bg);font-size:0.8em;font-weight:700;";
  btn.textContent = "📢";
  btn.addEventListener("click", toggleTts);
  document.body.appendChild(btn);
}

function initTranscriptButton() {
  const btn = refs.copyBtn || document.querySelector("#copy-btn");
  if (!btn) return;
  btn.addEventListener("click", () => copyTranscript().catch(() => alert("Could not copy transcript.")));
}

function appendNote(text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const prefix = refs.notesText.value.trim() ? "\n" : "";
  refs.notesText.value += `${prefix}[${stamp}] ${trimmed}`;
  saveVoiceNotes();
}

function saveVoiceNotes() {
  localStorage.setItem(VOICE_NOTES_KEY, refs.notesText.value);
}

function loadVoiceNotes() {
  refs.notesText.value = localStorage.getItem(VOICE_NOTES_KEY) || "";
}

function setNotesStatus(message) {
  refs.notesStatus.textContent = message;
}

function setDictationActive(active) {
  dictationActive = active;
  refs.notesStart.disabled = active;
  refs.notesStop.disabled = !active;
}

function createSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  const instance = new SpeechRecognition();
  instance.continuous = true;
  instance.interimResults = false;
  instance.lang = navigator.language || "en-GB";
  instance.onstart = () => {
    setDictationActive(true);
    setNotesStatus("Listening. Speak your session notes; press Stop when done.");
  };
  instance.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        appendNote(event.results[i][0].transcript);
      }
    }
  };
  instance.onerror = (event) => {
    setNotesStatus(`Dictation error: ${event.error}. If this is iPhone/Safari, try Chrome or use system dictation into the notes box.`);
    setDictationActive(false);
  };
  instance.onend = () => {
    if (dictationActive) {
      setDictationActive(false);
      setNotesStatus("Dictation stopped.");
    }
  };
  return instance;
}

function startDictation() {
  recognition = recognition || createSpeechRecognition();
  if (!recognition) {
    setNotesStatus("This browser does not support built-in dictation here. Try Chrome/Android, or use your keyboard microphone/system dictation in the notes box.");
    refs.notesText.focus();
    return;
  }
  try {
    recognition.start();
  } catch {
    setNotesStatus("Dictation is already starting. If it gets stuck, close and reopen Voice Notes.");
  }
}

function stopDictation() {
  if (recognition) recognition.stop();
  setDictationActive(false);
  setNotesStatus("Dictation stopped.");
}

async function copyVoiceNotes() {
  await navigator.clipboard.writeText(refs.notesText.value || "");
  setNotesStatus("Notes copied to clipboard. They are also saved on this device/browser.");
}

function downloadVoiceNotes() {
  const blob = new Blob([refs.notesText.value || ""], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `flaming-goose-notes-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setNotesStatus("Notes downloaded.");
}

function initVoiceNotes() {
  loadVoiceNotes();
  refs.notesText.addEventListener("input", saveVoiceNotes);
  refs.notesStart.addEventListener("click", startDictation);
  refs.notesStop.addEventListener("click", stopDictation);
  refs.notesCopy.addEventListener("click", () => copyVoiceNotes().catch(() => setNotesStatus("Could not copy notes.")));
  refs.notesDownload.addEventListener("click", downloadVoiceNotes);
  refs.notesClear.addEventListener("click", () => {
    if (!confirm("Clear the saved notes on this device?")) return;
    refs.notesText.value = "";
    saveVoiceNotes();
    setNotesStatus("Notes cleared.");
  });
}

// --- Settings ---
const SETTINGS_KEY = "flaming-goose-settings";
const defaultSettings = {
  fontSize: 18,
  fontWeight: "400",
  fontFamily: "'Merriweather', Georgia, serif",
  highContrast: false,
  reduceMotion: false,
  accentColor: "#d89a4a",
  bgColor: "#15110f",
  textColor: "#f5ead8",
  playerName: "",
  characterName: "",
  ttsVoice: "default",
  diceD4: "#b86452",
  diceD6: "#7ec7c4",
  diceD8: "#8bc34a",
  diceD10: "#ce93d8",
  diceD12: "#4fc3f7",
  diceD20: "#d89a4a",
  btnSettings: "#2a1e18",
  btnDrawer: "#2a1e18",
  btnRules: "#2a1e18",
  btnNotes: "#2a1e18",
  btnCopy: "#2a1e18",
  btnSend: "#d89a4a",
};

function hexToRgb(hex) {
  const normal = String(hex || "").trim().replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normal)) return { r: 21, g: 17, b: 15 };
  return {
    r: parseInt(normal.slice(0, 2), 16),
    g: parseInt(normal.slice(2, 4), 16),
    b: parseInt(normal.slice(4, 6), 16),
  };
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function loadSettings() {
  try {
    return { ...defaultSettings, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}) };
  } catch {
    return { ...defaultSettings };
  }
}

function applySettings(rawSettings) {
  const s = { ...defaultSettings, ...rawSettings };
  document.documentElement.style.setProperty("--font-size", s.fontSize + "px");
  document.documentElement.style.setProperty("--font-weight", s.fontWeight);
  document.documentElement.style.setProperty("--font-family", s.fontFamily);
  document.documentElement.style.setProperty("--accent", s.accentColor);
  document.documentElement.style.setProperty("--bg", s.bgColor);
  document.documentElement.style.setProperty("--text", s.textColor);
  document.documentElement.style.setProperty("--muted", rgba(s.textColor, 0.72));
  document.documentElement.style.setProperty("--panel", rgba(s.bgColor, 0.9));
  document.documentElement.style.setProperty("--panel-strong", rgba(s.bgColor, 0.98));
  document.documentElement.style.setProperty("--input-bg", rgba(s.bgColor, 0.55));
  document.documentElement.style.setProperty("--border", rgba(s.accentColor, 0.35));
  document.documentElement.style.setProperty("--accent-glow", rgba(s.accentColor, 0.28));
  document.documentElement.style.setProperty("--hero-bg", `linear-gradient(135deg, ${rgba(s.bgColor, 0.98)}, ${rgba(s.bgColor, 0.92)})`);
  document.documentElement.style.setProperty("--dice-d4", s.diceD4);
  document.documentElement.style.setProperty("--dice-d6", s.diceD6);
  document.documentElement.style.setProperty("--dice-d8", s.diceD8);
  document.documentElement.style.setProperty("--dice-d10", s.diceD10);
  document.documentElement.style.setProperty("--dice-d12", s.diceD12);
  document.documentElement.style.setProperty("--dice-d20", s.diceD20);
  document.documentElement.style.setProperty("--btn-settings", s.btnSettings);
  document.documentElement.style.setProperty("--btn-drawer", s.btnDrawer);
  document.documentElement.style.setProperty("--btn-rules", s.btnRules);
  document.documentElement.style.setProperty("--btn-notes", s.btnNotes);
  document.documentElement.style.setProperty("--btn-copy", s.btnCopy);
  document.documentElement.style.setProperty("--btn-send", s.btnSend);

  document.body.classList.toggle("high-contrast", s.highContrast);
  document.body.classList.toggle("reduce-motion", s.reduceMotion);

  // Update form controls
  refs.setFontSize.value = s.fontSize;
  refs.fontSizeVal.textContent = s.fontSize;
  refs.setFontWeight.value = s.fontWeight;
  refs.setFontFamily.value = s.fontFamily;
  refs.setHighContrast.checked = s.highContrast;
  refs.setReduceMotion.checked = s.reduceMotion;
  refs.setAccentColor.value = s.accentColor;
  refs.setBgColor.value = s.bgColor;
  refs.setTextColor.value = s.textColor;
  refs.setPlayerName.value = s.playerName;
  refs.setCharacterName.value = s.characterName;
  refs.setTtsVoice.value = s.ttsVoice;
  refs.setDiceD4.value = s.diceD4;
  refs.setDiceD6.value = s.diceD6;
  refs.setDiceD8.value = s.diceD8;
  refs.setDiceD10.value = s.diceD10;
  refs.setDiceD12.value = s.diceD12;
  refs.setDiceD20.value = s.diceD20;
  refs.setBtnSettings.value = s.btnSettings;
  refs.setBtnDrawer.value = s.btnDrawer;
  refs.setBtnRules.value = s.btnRules;
  refs.setBtnNotes.value = s.btnNotes;
  refs.setBtnCopy.value = s.btnCopy;
  refs.setBtnSend.value = s.btnSend;
}

function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  applySettings(s);
}

function initSettings() {
  const s = loadSettings();
  applySettings(s);

  const update = () => {
    const s = {
      fontSize: parseInt(refs.setFontSize.value),
      fontWeight: refs.setFontWeight.value,
      fontFamily: refs.setFontFamily.value,
      highContrast: refs.setHighContrast.checked,
      reduceMotion: refs.setReduceMotion.checked,
      accentColor: refs.setAccentColor.value,
      bgColor: refs.setBgColor.value,
      textColor: refs.setTextColor.value,
      playerName: refs.setPlayerName.value.trim(),
      characterName: refs.setCharacterName.value.trim(),
      ttsVoice: refs.setTtsVoice.value,
      diceD4: refs.setDiceD4.value,
      diceD6: refs.setDiceD6.value,
      diceD8: refs.setDiceD8.value,
      diceD10: refs.setDiceD10.value,
      diceD12: refs.setDiceD12.value,
      diceD20: refs.setDiceD20.value,
      btnSettings: refs.setBtnSettings.value,
      btnDrawer: refs.setBtnDrawer.value,
      btnRules: refs.setBtnRules.value,
      btnNotes: refs.setBtnNotes.value,
      btnCopy: refs.setBtnCopy.value,
      btnSend: refs.setBtnSend.value,
    };
    saveSettings(s);
  };

  refs.setFontSize.addEventListener("input", () => {
    refs.fontSizeVal.textContent = refs.setFontSize.value;
    update();
  });
  refs.setFontWeight.addEventListener("change", update);
  refs.setFontFamily.addEventListener("change", update);
  refs.setHighContrast.addEventListener("change", update);
  refs.setReduceMotion.addEventListener("change", update);
  refs.setAccentColor.addEventListener("input", update);
  refs.setBgColor.addEventListener("input", update);
  refs.setTextColor.addEventListener("input", update);
  refs.setPlayerName.addEventListener("input", update);
  refs.setCharacterName.addEventListener("input", update);
  refs.setTtsVoice.addEventListener("change", update);
  [
    refs.setDiceD4, refs.setDiceD6, refs.setDiceD8, refs.setDiceD10, refs.setDiceD12, refs.setDiceD20,
    refs.setBtnSettings, refs.setBtnDrawer, refs.setBtnRules, refs.setBtnNotes, refs.setBtnCopy, refs.setBtnSend
  ].forEach((input) => input.addEventListener("input", update));
  refs.settingsReset.addEventListener("click", () => saveSettings({ ...defaultSettings }));
}

// --- Modal toggles ---
function openModal(backdrop) { backdrop.classList.remove("hidden"); }
function closeModal(backdrop) { backdrop.classList.add("hidden"); }

refs.settingsBtn.addEventListener("click", () => openModal(refs.settingsBackdrop));
refs.settingsClose.addEventListener("click", () => closeModal(refs.settingsBackdrop));
refs.settingsBackdrop.addEventListener("click", (e) => {
  if (e.target === refs.settingsBackdrop) closeModal(refs.settingsBackdrop);
});

refs.rulesBtn.addEventListener("click", () => { buildRules(); openModal(refs.rulesBackdrop); });
refs.rulesClose.addEventListener("click", () => closeModal(refs.rulesBackdrop));
refs.rulesBackdrop.addEventListener("click", (e) => {
  if (e.target === refs.rulesBackdrop) closeModal(refs.rulesBackdrop);
});

refs.notesBtn.addEventListener("click", () => openModal(refs.notesBackdrop));
refs.notesClose.addEventListener("click", () => closeModal(refs.notesBackdrop));
refs.notesBackdrop.addEventListener("click", (e) => {
  if (e.target === refs.notesBackdrop) closeModal(refs.notesBackdrop);
});

// --- Drawer ---
function openDrawer() {
  refs.drawerBackdrop.classList.remove("hidden");
  refs.drawer.classList.remove("hidden");
}
function closeDrawer() {
  refs.drawerBackdrop.classList.add("hidden");
  refs.drawer.classList.add("hidden");
}

refs.drawerBtn.addEventListener("click", openDrawer);
refs.drawerClose.addEventListener("click", closeDrawer);
refs.drawerBackdrop.addEventListener("click", closeDrawer);

// Drawer tabs
document.querySelectorAll(".drawer-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".drawer-tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add("active");
  });
});

// --- Rules Reference ---
const RULES = [
  {
    title: "Combat Flow",
    body: `<ul>
      <li><strong>Surprise:</strong> DM determines if anyone is surprised</li>
      <li><strong>Initiative:</strong> Everyone rolls d20 + DEX. Highest goes first.</li>
      <li><strong>Your turn:</strong> Move + Action + Bonus Action + Reaction (if available)</li>
      <li><strong>Attack roll:</strong> d20 + proficiency + ability mod vs target AC</li>
      <li><strong>Damage:</strong> Weapon dice + ability mod</li>
    </ul>`
  },
  {
    title: "Advantage & Disadvantage",
    body: `<ul>
      <li><strong>Advantage:</strong> Roll 2d20, take the higher</li>
      <li><strong>Disadvantage:</strong> Roll 2d20, take the lower</li>
      <li>They cancel each other out if you have both</li>
      <li>Multiple sources of advantage don't stack</li>
    </ul>`
  },
  {
    title: "Skill Checks",
    body: `<ul>
      <li>Roll d20 + ability modifier + proficiency (if proficient)</li>
      <li>Meet or beat the DC (Difficulty Class) set by DM</li>
      <li>Common DCs: Easy 10, Medium 15, Hard 20, Very Hard 25</li>
    </ul>`
  },
  {
    title: "Saving Throws",
    body: `<ul>
      <li>Roll d20 + ability modifier + proficiency (if proficient in that save)</li>
      <li>Meet or beat the DC to resist or halve the effect</li>
    </ul>`
  },
  {
    title: "Death Saves",
    body: `<ul>
      <li>At 0 HP, you're unconscious and make death saves each turn</li>
      <li>Roll d20: 10+ = success, 9- = failure</li>
      <li>3 successes = stabilise. 3 failures = dead.</li>
      <li>Nat 20 = regain 1 HP. Nat 1 = 2 failures.</li>
      <li>Any healing resets successes and failures</li>
    </ul>`
  },
  {
    title: "Spellcasting Basics",
    body: `<ul>
      <li><strong>Cantrips:</strong> Cast anytime, no slots needed</li>
      <li><strong>Spell slots:</strong> Consumed on cast, regained on rest</li>
      <li><strong>Concentration:</strong> Only one spell at a time. Damage = CON save (DC 10 or half damage)</li>
      <li><strong>Rituals:</strong> Cast without a slot if you have 10 extra minutes</li>
      <li><strong>Components:</strong> V (verbal), S (somatic), M (material)</li>
    </ul>`
  },
  {
    title: "Conditions",
    body: `<ul>
      <li><strong>Blinded:</strong> Auto-fail sight checks. Attacks have disadvantage. Attacks against you have advantage.</li>
      <li><strong>Charmed:</strong> Can't attack the charmer. Social checks against you have advantage.</li>
      <li><strong>Deafened:</strong> Can't hear. Auto-fail hearing checks.</li>
      <li><strong>Frightened:</strong> Disadvantage on checks/attacks while you can see the source. Can't move toward it.</li>
      <li><strong>Grappled:</strong> Speed becomes 0. Ends if grappler is incapacitated or you're moved away.</li>
      <li><strong>Incapacitated:</strong> No actions or reactions.</li>
      <li><strong>Invisible:</strong> Impossible to see without special sense. Attacks against you have disadvantage. Your attacks have advantage.</li>
      <li><strong>Paralyzed:</strong> Incapacitated, can't move or speak. Auto-fail STR/DEX saves. Attacks against you have advantage. Melee hits are crits.</li>
      <li><strong>Poisoned:</strong> Disadvantage on attack rolls and ability checks.</li>
      <li><strong>Prone:</strong> Disadvantage on attacks. Melee attacks against you have advantage, ranged have disadvantage. Costs half movement to stand.</li>
      <li><strong>Restrained:</strong> Speed 0. Attacks have disadvantage. Attacks against you have advantage. DEX saves have disadvantage.</li>
      <li><strong>Stunned:</strong> Incapacitated, can't move, speak falteringly. Auto-fail STR/DEX saves. Attacks against you have advantage.</li>
      <li><strong>Unconscious:</strong> Incapacitated, can't move or speak. Drops held items, falls prone. Auto-fail STR/DEX saves. Attacks within 5ft have advantage. Melee hits are crits.</li>
    </ul>`
  },
  {
    title: "Resting",
    body: `<ul>
      <li><strong>Short Rest (1 hour):</strong> Spend Hit Dice to heal. Some abilities recharge.</li>
      <li><strong>Long Rest (8 hours):</strong> Regain all HP, half Hit Dice, all spell slots and class abilities.</li>
    </ul>`
  },
];

function buildRules() {
  refs.rulesContent.innerHTML = "";
  for (const rule of RULES) {
    const section = document.createElement("details");
    section.className = "rule-section";
    section.innerHTML = `<summary>${rule.title}</summary><div class="rule-body">${rule.body}</div>`;
    refs.rulesContent.appendChild(section);
  }
}

refs.rulesSearch.addEventListener("input", () => {
  const query = refs.rulesSearch.value.toLowerCase();
  document.querySelectorAll(".rule-section").forEach((section) => {
    const text = section.textContent.toLowerCase();
    section.style.display = text.includes(query) ? "" : "none";
  });
});

// --- Audience toggle ---
refs.audienceSelect.addEventListener("change", () => {
  refs.targetWrap.classList.toggle("hidden", refs.audienceSelect.value !== "one");
});

function localSpeakerLabel(isOoc, settings = loadSettings()) {
  const playerName = settings.playerName?.trim();
  const characterName = settings.characterName?.trim();
  if (isOoc) return playerName ? `${playerName} (OOC)` : "OOC";
  if (characterName && playerName) return `${characterName} (${playerName})`;
  if (characterName) return characterName;
  if (playerName) return playerName;
  return "You";
}

function promptForPlayerIdentityIfNeeded() {
  const settings = loadSettings();
  if (settings.playerName && settings.characterName) return;
  window.setTimeout(() => {
    if (loadSettings().playerName && loadSettings().characterName) return;
    openModal(refs.settingsBackdrop);
    refs.setPlayerName.focus();
  }, 600);
}

// --- Message form ---
refs.messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = refs.messageInput.value;
  const isOoc = refs.oocToggle.checked;
  const settings = loadSettings();
  const speakerLabel = localSpeakerLabel(isOoc, settings);
  const payload = {
    audience: refs.audienceSelect.value,
    targetAgentId: refs.targetSelect.value,
    messageMode: isOoc ? "ooc" : "ic",
    playerName: settings.playerName,
    characterName: settings.characterName,
    text,
  };
  if (!payload.text.trim()) return;

  const previousData = state.data ? structuredClone(state.data) : null;
  const optimisticEntry = {
    id: `pending-${Date.now()}`,
    speaker: isOoc ? "human-ooc" : "human",
    speakerLabel,
    target: payload.audience === "one" ? payload.targetAgentId : "all",
    text: payload.text.trim(),
    timestamp: new Date().toISOString()
  };
  refs.messageInput.value = "";
  if (state.data) {
    state.data.log = [...state.data.log, optimisticEntry];
    renderLog(state.data.log);
  }

  try {
    state.data = await api("/api/message", { method: "POST", body: JSON.stringify(payload) });
    archiveLogEntries(state.data.log);
    renderAll();
  } catch (error) {
    if (previousData) state.data = previousData;
    refs.messageInput.value = text;
    renderAll();
    alert(`Message was not sent: ${error.message}`);
  }
});

// --- Campaign form ---
refs.campaignForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(refs.campaignForm);
  const payload = Object.fromEntries(form.entries());
  payload.gmMode = form.get("gmMode") === "on";
  state.data = await api("/api/campaign", { method: "POST", body: JSON.stringify(payload) });
  renderAll();
});

// --- Agent forms ---
refs.agentsList.addEventListener("submit", async (e) => {
  const form = e.target.closest(".agent-form");
  if (!form) return;
  e.preventDefault();
  const formData = new FormData(form);
  const card = form.closest(".agent-card");
  const active = card.querySelector('input[name="active"]').checked;
  const payload = Object.fromEntries(formData.entries());
  payload.active = active;
  payload.characterSheet = {};
  form.querySelectorAll("[data-sheet-field]").forEach((field) => {
    setPath(payload.characterSheet, field.dataset.sheetField, field.value);
  });
  state.data = await api(`/api/agents/${form.dataset.agentId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  renderAll();
});

// --- Init ---
initSettings();
promptForPlayerIdentityIfNeeded();
if ("speechSynthesis" in window) window.speechSynthesis.onvoiceschanged = () => preferredVoice();
initTtsControl();
initTranscriptButton();
initVoiceNotes();
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => console.warn("Service worker registration failed", error));
  });
}
loadState().catch((error) => {
  refs.logList.innerHTML = `<article class="log-entry"><p class="log-text">Error loading table: ${error.message}</p></article>`;
});
