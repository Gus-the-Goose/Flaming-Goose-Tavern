function blankCharacterSheet({ name = "", classRole = "" } = {}) {
  return {
    characterName: name,
    classLevel: classRole,
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

function characterSeed(character) {
  return {
    ...character,
    characterSheet: blankCharacterSheet({ name: character.name, classRole: character.classRole })
  };
}

export function buildSeedState() {
  const agents = [
    characterSeed({
      id: "bethali",
      name: "Bethali",
      classRole: "Halfling Wizard (Level 1)",
      active: true,
      personality: "Earnest, bright, bookish. Trying very hard to be a serious scholar.",
      goals: "Succeed at wizardry and not embarrass her village.",
      bondsQuirks: "Overprepares academically. First from her halfling community to make it to wizard university.",
      memory: "Terrified of proving everyone right about her not belonging there.",
      voiceStyle: "Warm, clever, slightly flustered."
    }),
    characterSeed({
      id: "rue",
      name: "Rue",
      classRole: "Changeling Bard (Level 1)",
      active: true,
      personality: "Fluid, perceptive, and theatrically charming. A changeling who wears faces like costumes.",
      goals: "Collect stories, find their own voice underneath all the masks.",
      bondsQuirks: "Cannot resist a good audience. Deeply curious about what makes people tick.",
      memory: "New to this party. Still deciding who to be here.",
      voiceStyle: "Mercurial, lyrical, shifts tone like water."
    }),
    characterSeed({
      id: "warforged-paladin",
      name: "Unnamed Paladin",
      classRole: "Warforged Paladin of Ilmater (Level 1)",
      active: true,
      personality: "Sincere, dutiful, and quietly carrying the weight of devotion to the god of suffering and endurance.",
      goals: "Be worthy. Endure. Protect those who cannot protect themselves.",
      bondsQuirks: "Does not yet have a name. Seeks one as keenly as others seek purpose.",
      memory: "Built for something. Devoted to Ilmater. The name will come when it's earned.",
      voiceStyle: "Measured, formal, with iron underneath."
    }),
    characterSeed({
      id: "jassy",
      name: "Jassy",
      classRole: "Tiefling Warlock (Level 1)",
      active: true,
      personality: "Sharp-edged, distrustful of authority, and carrying a pact they didn't fully read the fine print on.",
      goals: "Figure out what their patron actually wants. Survive the terms.",
      bondsQuirks: "Horns and a sharp tongue. Surprisingly loyal once trust is earned.",
      memory: "The pact happened. No taking it back now.",
      voiceStyle: "Wry, defensive, with flashes of genuine warmth."
    }),
    characterSeed({
      id: "locke",
      name: "Locke",
      classRole: "Tiefling Rogue (Level 1)",
      active: true,
      personality: "Quick fingers, quicker exits. Charm as a first resort, vanishing as a second.",
      goals: "Acquire things. Don't get caught. Maybe find something worth sticking around for.",
      bondsQuirks: "Tiefling with a talent for trouble. Has probably already noticed where the valuables are.",
      memory: "New to this group. Assessing exits and opportunities.",
      voiceStyle: "Casual, teasing, with an edge of calculation."
    }),
    characterSeed({
      id: "darius",
      name: "Darius Noble Heart",
      classRole: "Half-Orc Paladin (Level 1)",
      active: true,
      personality: "Big heart in a big body. Gentle until something needs protecting, then terrifying.",
      goals: "Live up to the name. Protect the innocent. Smash what deserves smashing.",
      bondsQuirks: "The name 'Noble Heart' is self-chosen and he means every syllable.",
      memory: "Left his old life behind. This party is his new purpose.",
      voiceStyle: "Warm, steady, surprisingly soft-spoken for someone that large."
    })
  ];

  return {
    meta: {
      title: "The Flaming Goose Tavern",
      subtitle: "A D&D companion for the party — accessible, phone-friendly, and full of dice."
    },
    campaign: {
      gmMode: true,
      setting: "The Flaming Goose Tavern",
      currentScene: "The party gathers. Rain on the shutters, blue lamplight, and the sense that the table has been waiting.",
      sessionSummary: "",
      notableNPCs: "",
      openQuests: "",
      partyInventory: "",
      facts: "",
      gmNotes: ""
    },
    log: [
      {
        id: "seed-1",
        speaker: "gm",
        speakerLabel: "Table Keeper",
        target: "all",
        text: "Welcome to the Flaming Goose Tavern. 🦢🔥 Tap ⚙️ for accessibility settings — font size, high contrast, colours. Tap 📖 for rules reference. Roll dice at the top. This is yours.",
        timestamp: new Date().toISOString()
      }
    ],
    agents
  };
}
