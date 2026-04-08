function pickVariant(items, seedValue) {
  return items[seedValue % items.length];
}

export class MockTableProvider {
  async generateReply({ agent, campaign, userMessage, recentLog, targetMode }) {
    const turnSeed = recentLog.length + agent.name.length + userMessage.length;
    const openers = [
      "I study the room for a beat.",
      "I answer without looking away from the scene.",
      "I take a slow breath before speaking.",
      "I glance at the others, then weigh in."
    ];
    const tacticalNotes = [
      `What matters here is ${campaign.openQuests.split(";")[0] || "not losing momentum"}.`,
      `The current pressure point is ${campaign.currentScene.toLowerCase()}.`,
      `We should keep in mind that ${campaign.facts.toLowerCase()}.`,
      `The party inventory gives us an angle: ${campaign.partyInventory.split(",")[0].trim()}.`
    ];
    const roleMove = {
      Rogue: "I want the shadows, the side passages, and the person most likely to lie.",
      Fighter: "I want a defensible position before this turns ugly.",
      Cleric: "I want to test whether the lantern glow reacts to intent or relics.",
      Wizard: "I want to inspect the structure before we blunder into old machinery."
    };

    const roleKey = Object.keys(roleMove).find((key) => agent.classRole.includes(key)) || "Rogue";
    const targetLine =
      targetMode === "direct"
        ? `Since you asked me directly, I will keep this focused.`
        : `Since this is for the whole table, I'll keep it brief and actionable.`;

    return [
      pickVariant(openers, turnSeed),
      targetLine,
      `${pickVariant(tacticalNotes, turnSeed + 1)} ${roleMove[roleKey]}`,
      `My read: ${agent.memory}`
    ].join(" ");
  }
}

export function createProvider() {
  return new MockTableProvider();
}
