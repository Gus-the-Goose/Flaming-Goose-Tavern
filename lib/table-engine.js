import { createProvider } from "./llm-adapter.js";

const provider = createProvider();

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

function updateAgentMemory(agent, text) {
  const trimmed = text.trim();
  if (!trimmed) {
    return agent.memory;
  }

  const notes = agent.memory
    .split(". ")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(-2);
  notes.push(trimmed);
  return notes.join(". ").slice(0, 320);
}

export async function applyTurn(state, { text, audience, targetAgentId, messageMode }, hooks = {}) {
  const cleanedText = text.trim();
  if (!cleanedText) {
    throw new Error("Message text is required.");
  }

  const isOoc = messageMode === "ooc";

  const humanEntry = newLogEntry({
    speaker: isOoc ? "human-ooc" : "human",
    speakerLabel: isOoc ? "Jason (OOC)" : "You",
    target: audience === "one" ? targetAgentId : "all",
    text: cleanedText
  });
  state.log.push(humanEntry);

  // Accessibility: persist the player's message immediately, before slower AI replies.
  // This lets refresh/polling clients show non-speaking players that their message landed.
  await hooks.onHumanEntry?.(state);

  if (isOoc) {
    return state;
  }

  const activeAgents = state.agents.filter((agent) => agent.active);
  const agentsToReply =
    audience === "one"
      ? activeAgents.filter((agent) => agent.id === targetAgentId)
      : activeAgents;

  const recentLog = state.log.slice(-8);
  for (const agent of agentsToReply) {
    const reply = await provider.generateReply({
      agent,
      campaign: state.campaign,
      userMessage: cleanedText,
      recentLog,
      targetMode: audience === "one" ? "direct" : "group"
    });

    agent.memory = updateAgentMemory(agent, `Latest table turn: ${cleanedText}`);
    state.log.push(
      newLogEntry({
        speaker: agent.id,
        speakerLabel: agent.name,
        target: audience === "one" ? targetAgentId : "all",
        text: reply
      })
    );
  }

  state.campaign.sessionSummary = `${state.campaign.sessionSummary} ${cleanedText}`.slice(0, 800);
  return state;
}
