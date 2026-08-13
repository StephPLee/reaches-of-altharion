export type GuildLoreImage = {
  src: string;
  alt: string;
  caption?: string;
};

export type GuildLoreEntry = {
  name: string;
  slug: string;
  summary: string;
  emblem?: GuildLoreImage;
  lore: string[];
  headquarters: {
    name: string;
    description: string[];
    image?: GuildLoreImage;
  };
  leader: {
    name: string;
    title?: string;
    description: string[];
    image?: GuildLoreImage;
  };
};

export const GUILD_LORE: GuildLoreEntry[] = [
  {
    name: "Golden Quill",
    slug: "golden-quill",
    summary:
      "A guild centered on arcane mastery, magical infrastructure, and ancient knowledge.",
    emblem: {
      src: "/img/Golden%20Quill.webp",
      alt: "Golden Quill emblem",
    },
    lore: [
      "The Golden Quill gathers mages, scribes, researchers, and lorekeepers who believe knowledge is a force that can shape the future of Altharion.",
    ],
    headquarters: {
      name: "Headquarters to be named",
      description: ["Headquarters lore and visual description to be added."],
    },
    leader: {
      name: "Leader to be named",
      description: ["Leader lore, appearance, and role to be added."],
      image: {
        src: "/img/guild%20leaders/Golden%20Quill%20-%20AethelddxD.png",
        alt: "Golden Quill guild leader artwork",
        caption: "Art by AethelddxD.",
      },
    },
  },
  {
    name: "Iron Vanguard",
    slug: "iron-vanguard",
    summary:
      "A martial guild built around fortification, discipline, and battlefield cohesion.",
    emblem: {
      src: "/img/Iron%20Vanguard.webp",
      alt: "Iron Vanguard emblem",
    },
    lore: [
      "The Iron Vanguard is an order of disciplined defenders, tacticians, and frontline combatants who turn preparation and formation into survival.",
    ],
    headquarters: {
      name: "Headquarters to be named",
      description: ["Headquarters lore and visual description to be added."],
    },
    leader: {
      name: "Leader to be named",
      description: ["Leader lore, appearance, and role to be added."],
      image: {
        src: "/img/guild%20leaders/Iron%20Vanguard%20-%20BELONG.png",
        alt: "Iron Vanguard guild leader artwork",
        caption: "Art by BELONG.",
      },
    },
  },
  {
    name: "Black Hand",
    slug: "black-hand",
    summary: "An underdark guild of poison, shadows, and lethal mobility.",
    emblem: {
      src: "/img/Black%20Hand.webp",
      alt: "Black Hand emblem",
    },
    lore: [
      "The Black Hand operates where light and law both fail, drawing on poisoncraft, stealth, and underdark traditions to solve problems cleanly or permanently.",
    ],
    headquarters: {
      name: "Headquarters to be named",
      description: ["Headquarters lore and visual description to be added."],
    },
    leader: {
      name: "Leader to be named",
      description: ["Leader lore, appearance, and role to be added."],
      image: {
        src: "/img/guild%20leaders/Black%20Hand%20-%20Heroes%20of%20Might%20and%20Magic.png",
        alt: "Black Hand guild leader artwork",
        caption: "Art by Heroes of Might and Magic.",
      },
    },
  },
  {
    name: "Dread Legion",
    slug: "dread-legion",
    summary:
      "A necromantic guild focused on undead command and battlefield attrition.",
    emblem: {
      src: "/img/Dread%20Legion.webp",
      alt: "Dread Legion emblem",
    },
    lore: [
      "The Dread Legion treats death as a resource, a warning, and a weapon, binding necromantic practice to military endurance.",
    ],
    headquarters: {
      name: "Headquarters to be named",
      description: ["Headquarters lore and visual description to be added."],
    },
    leader: {
      name: "Leader to be named",
      description: ["Leader lore, appearance, and role to be added."],
      image: {
        src: "/img/guild%20leaders/Dread%20Legion.jpeg",
        alt: "Dread Legion guild leader artwork",
      },
    },
  },
  {
    name: "Dawnwardens",
    slug: "dawnwardens",
    summary:
      "A radiant guild of consecration, restoration, and celestial conviction.",
    emblem: {
      src: "/img/Dawnwardens.webp",
      alt: "Dawnwardens emblem",
    },
    lore: [
      "The Dawnwardens carry a reputation for mercy backed by conviction, standing where corruption, despair, and darkness threaten to take root.",
    ],
    headquarters: {
      name: "Headquarters to be named",
      description: ["Headquarters lore and visual description to be added."],
    },
    leader: {
      name: "Leader to be named",
      description: ["Leader lore, appearance, and role to be added."],
    },
  },
  {
    name: "Verdant Accord",
    slug: "verdant-accord",
    summary: "A living guild of forests, summoning, growth, and renewal.",
    emblem: {
      src: "/img/Verdant%20Accord.webp",
      alt: "Verdant Accord emblem",
    },
    lore: [
      "The Verdant Accord speaks for living systems: forest, beast, spirit, and wild magic joined in cycles of protection and renewal.",
    ],
    headquarters: {
      name: "Headquarters to be named",
      description: ["Headquarters lore and visual description to be added."],
    },
    leader: {
      name: "Leader to be named",
      description: ["Leader lore, appearance, and role to be added."],
      image: {
        src: "/img/guild%20leaders/Verdant%20Accord%20-%20Lichelet.png",
        alt: "Verdant Accord guild leader artwork",
        caption: "Art by Lichelet.",
      },
    },
  },
  {
    name: "Dragon's Den of Drama",
    slug: "dragons-den-of-drama",
    summary:
      "A performance-driven guild built around attention, spectacle, and inspiration.",
    emblem: {
      src: "/img/Dragon's%20Den.webp",
      alt: "Dragon's Den of Drama emblem",
    },
    lore: [
      "The Dragon's Den of Drama understands that stories move people before armies do, turning performance, presence, and spectacle into power.",
    ],
    headquarters: {
      name: "Headquarters to be named",
      description: ["Headquarters lore and visual description to be added."],
    },
    leader: {
      name: "Leader to be named",
      description: ["Leader lore, appearance, and role to be added."],
      image: {
        src: "/img/guild%20leaders/Dragon's%20Den%20of%20Drama%20-%20SnowmanAndOctopus.png",
        alt: "Dragon's Den of Drama guild leader artwork",
        caption: "Art by SnowmanAndOctopus.",
      },
    },
  },
  {
    name: "Crucible of Creation",
    slug: "crucible-of-creation",
    summary:
      "A crafting guild dedicated to invention, forging, and magical workmanship.",
    emblem: {
      src: "/img/Crucible%20of%20Creation.webp",
      alt: "Crucible of Creation emblem",
    },
    lore: [
      "The Crucible of Creation is where raw material becomes legacy, joining craft, experimentation, and enchantment under one banner.",
    ],
    headquarters: {
      name: "Headquarters to be named",
      description: ["Headquarters lore and visual description to be added."],
    },
    leader: {
      name: "Leader to be named",
      description: ["Leader lore, appearance, and role to be added."],
    },
  },
  {
    name: "The Argent Mark",
    slug: "the-argent-mark",
    summary:
      "A ranged guild of contracts, bounties, and precise judgement.",
    emblem: {
      src: "/img/Argent%20Mark.webp",
      alt: "The Argent Mark emblem",
    },
    lore: [
      "The Argent Mark is built on contracts, distance, and consequence, bringing order to dangerous work through bounties and exacting judgement.",
    ],
    headquarters: {
      name: "Headquarters to be named",
      description: ["Headquarters lore and visual description to be added."],
    },
    leader: {
      name: "Leader to be named",
      description: ["Leader lore, appearance, and role to be added."],
    },
  },
  {
    name: "The Ashen Veil",
    slug: "the-ashen-veil",
    summary:
      "A solitary hunter guild focused on initiative, survival, and predatory resilience.",
    emblem: {
      src: "/img/Ashen%20Veil.png",
      alt: "The Ashen Veil emblem",
    },
    lore: [
      "The Ashen Veil attracts lone hunters, scouts, and survivors who understand that isolation can be a discipline as much as a danger.",
    ],
    headquarters: {
      name: "Headquarters to be named",
      description: ["Headquarters lore and visual description to be added."],
    },
    leader: {
      name: "Leader to be named",
      description: ["Leader lore, appearance, and role to be added."],
    },
  },
  {
    name: "Wayfarer's Respite",
    slug: "wayfarers-respite",
    summary:
      "A wandering guild built around Old Potto, shared drink magic, and roadside refuge.",
    emblem: {
      src: "/img/wayfinders.png",
      alt: "Wayfarer's Respite emblem",
    },
    lore: [
      "Wayfarer's Respite follows the road, offering shelter, strange comfort, and shared drink magic to those who live between destinations.",
    ],
    headquarters: {
      name: "Headquarters to be named",
      description: ["Headquarters lore and visual description to be added."],
    },
    leader: {
      name: "Leader to be named",
      description: ["Leader lore, appearance, and role to be added."],
      image: {
        src: "/img/guild%20leaders/Wayfarer's%20Respite.jpg",
        alt: "Wayfarer's Respite guild leader artwork",
      },
    },
  },
  {
    name: "Eclipsed Choir",
    slug: "eclipsed-choir",
    summary: "A place for those who hear the hum of the void.",
    emblem: {
      src: "/img/eclipsed%20choir.png",
      alt: "Eclipsed Choir emblem",
    },
    lore: [
      "The Eclipsed Choir is newly opened, with its deeper identity, traditions, and public reputation still taking shape.",
    ],
    headquarters: {
      name: "Headquarters to be named",
      description: ["Headquarters lore and visual description to be added."],
    },
    leader: {
      name: "Leader to be named",
      description: ["Leader lore, appearance, and role to be added."],
    },
  },
];

export function getGuildLoreBySlug(slug: string) {
  return GUILD_LORE.find((guild) => guild.slug === slug);
}
