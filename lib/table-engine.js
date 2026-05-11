function newLogEntry({ speaker, speakerLabel, target, text }) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    speaker,
    speakerLabel,
    target,
    text,
    timestamp: new Date().toISOString()
  };
}

function humanSpeakerLabel({ isOoc, playerName = "", characterName = "" }) {
  const player = String(playerName).trim();
  const character = String(characterName).trim();
  if (isOoc) return player ? `${player} (OOC)` : "OOC";
  if (character && player) return `${character} (${player})`;
  if (character) return character;
  if (player) return player;
  return "You";
}

export async function applyTurn(state, { text, audience, targetAgentId, messageMode, playerName, characterName }, hooks = {}) {
  const cleanedText = text.trim();
  if (!cleanedText) {
    throw new Error("Message text is required.");
  }

  const isOoc = messageMode === "ooc";

  const humanEntry = newLogEntry({
    speaker: isOoc ? "human-ooc" : "human",
    speakerLabel: humanSpeakerLabel({ isOoc, playerName, characterName }),
    target: audience === "one" ? targetAgentId : "all",
    text: cleanedText
  });
  state.log.push(humanEntry);

  // Accessibility: persist the player's message immediately, before slower AI replies.
  // This lets refresh/polling clients show non-speaking players that their message landed.
  await hooks.onHumanEntry?.(state);

  // This is a player table log, not an auto-NPC simulator. Earlier prototypes had
  // active seeded characters reply automatically here; keep sends human-authored
  // unless/until a deliberate GM/AI-response control is added.
  state.campaign.sessionSummary = `${state.campaign.sessionSummary} ${cleanedText}`.slice(0, 800);
  return state;
}
