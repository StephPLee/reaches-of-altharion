INSERT INTO guilds (
  name,
  slug,
  emblem_src,
  emblem_alt,
  summary,
  sort_order,
  is_published
)
VALUES
  ('Golden Quill','golden-quill','/img/Golden%20Quill.webp','Golden Quill emblem','A guild centered on arcane mastery, magical infrastructure, and ancient knowledge.',10,true),
  ('Iron Vanguard','iron-vanguard','/img/Iron%20Vanguard.webp','Iron Vanguard emblem','A martial guild built around fortification, discipline, and battlefield cohesion.',20,true),
  ('Black Hand','black-hand','/img/Black%20Hand.webp','Black Hand emblem','An underdark guild of poison, shadows, and lethal mobility.',30,true),
  ('Dread Legion','dread-legion','/img/Dread%20Legion.webp','Dread Legion emblem','A necromantic guild focused on undead command and battlefield attrition.',40,true),
  ('Dawnwardens','dawnwardens','/img/Dawnwardens.webp','Dawnwardens emblem','A radiant guild of consecration, restoration, and celestial conviction.',50,true),
  ('Verdant Accord','verdant-accord','/img/Verdant%20Accord.webp','Verdant Accord emblem','A living guild of forests, summoning, growth, and renewal.',60,true),
  ('Dragon''s Den of Drama','dragons-den-of-drama','/img/Dragon''s%20Den.webp','Dragon''s Den of Drama emblem','A performance-driven guild built around attention, spectacle, and inspiration.',70,true),
  ('Crucible of Creation','crucible-of-creation','/img/Crucible%20of%20Creation.webp','Crucible of Creation emblem','A crafting guild dedicated to invention, forging, and magical workmanship.',80,true),
  ('The Argent Mark','the-argent-mark','/img/Argent%20Mark.webp','The Argent Mark emblem','A ranged guild of contracts, bounties, and precise judgement.',90,true),
  ('The Ashen Veil','the-ashen-veil','/img/Ashen%20Veil.png','The Ashen Veil emblem','A solitary hunter guild focused on initiative, survival, and predatory resilience.',100,true),
  ('Wayfarer''s Respite','wayfarers-respite','/img/wayfinders.png','Wayfarer''s Respite emblem','A wandering guild built around Old Potto, shared drink magic, and roadside refuge.',110,true),
  ('Eclipsed Choir','eclipsed-choir','/img/eclipsed%20choir.png','Eclipsed Choir emblem','A guild newly opened for membership and roster tracking.',120,true)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  emblem_src = EXCLUDED.emblem_src,
  emblem_alt = EXCLUDED.emblem_alt,
  summary = EXCLUDED.summary,
  sort_order = EXCLUDED.sort_order,
  is_published = EXCLUDED.is_published,
  updated_at = NOW();

DELETE FROM guild_upgrades
WHERE guild_id IN (
  SELECT id
  FROM guilds
  WHERE slug IN (
    'golden-quill',
    'iron-vanguard',
    'black-hand',
    'dread-legion',
    'dawnwardens',
    'verdant-accord',
    'dragons-den-of-drama',
    'crucible-of-creation',
    'the-argent-mark',
    'the-ashen-veil',
    'wayfarers-respite'
  )
);

INSERT INTO guild_upgrades (
  guild_id,
  title,
  requirement,
  reward,
  details,
  sort_order,
  is_published
)
SELECT
  g.id,
  u.title,
  u.requirement,
  u.reward,
  u.details,
  u.sort_order,
  true
FROM guilds g
JOIN (
  VALUES
    ('golden-quill','Guild Headquarters','A place that has experienced massive magical energies in the past or present.','All guild members are granted one use of Arcane Supremacy per day.','Arcane Supremacy: Whenever you cast a spell, you can choose one target of the spell. That target has disadvantage on saving throws against spells, and you gain advantage on spell attack rolls against that target until the end of the current turn.',10),
    ('golden-quill','Arcane Workshops','A location with easy and plentiful access to magical components and reagents, plus a 10,000 gold cost.','All guild members are granted an additional use of their Golden Quill abilities per day.','',20),
    ('golden-quill','Depository of Knowledge','At least 5 different items containing ancient lore are brought back to the guild HQ.','All guild members are granted one use of Channeling Power per day.','Channeling Power: Revealed when unlocked.',30),
    ('iron-vanguard','Guild Headquarters','A place that is easily defendable and fortified.','All guild members are granted the Vanguard of Iron passive.','Vanguard of Iron: Revealed when unlocked.',10),
    ('iron-vanguard','Sparring Grounds','A steady supply of wood, iron, and steel raw resources to the HQ, plus a 10,000 gold cost.','All guild members gain the Coordinated Strike passive.','Coordinated Strike: Revealed when unlocked.',20),
    ('iron-vanguard','Colosseum','At least 5 different ancient weapons are brought back to the guild HQ.','All guild members are granted one use of Iron Formation per day.','Iron Formation: Revealed when unlocked.',30),
    ('black-hand','Guild Headquarters','A place in the Underdark that is especially hidden.','All guild members are granted the Obscured by Shadow passive. Guild members may apply a poison on their person to a weapon they are wielding as a free action once per turn.','Obscured by Shadow: When in dim light or darkness, you may use a bonus action to gain the Invisible condition. This condition lasts until you enter bright light, or until you affect another creature with any effect.',10),
    ('black-hand','Underdark Poison Labs','A steady supply of alchemical equipment and different herbs to the HQ, plus a 10,000 gold cost.','Guild members gain access to the special poisons offered on the market with the Black Hand tag. Any time a guild member deals poison damage, they may change the poison damage type to one of the following: acid, fire, cold, lightning, thunder, necrotic, or radiant.','',20),
    ('black-hand','Shrine of Darkness','At least 5 different artifacts resonating with darkness must be returned to the guild HQ.','All guild members are granted one use of Escape in Darkness per day.','Escape in Darkness: As a reaction to being hit with an attack roll, you immediately teleport to a location in total darkness that you can see within 60 feet of you. This avoids all damage dealt by the triggering attack.',30),
    ('dread-legion','Guild Headquarters','A great cemetery, a site of a massive battle, or an ancient tomb.','All guild members always have access to the guild''s supply of regular, unanimated skeletons, and gain the Legion''s Might passive.','Legion''s Might: You and any undead under your command deal additional damage with weapon attacks. This damage is necrotic and equals half your proficiency bonus, rounded down.',10),
    ('dread-legion','Sanctum of the Legion','A steady supply of weapons and armor to the HQ, plus a 10,000 gold cost.','Whenever a guild member uses a spell or effect that summons, animates, or reasserts control over undead, they may summon, animate, or reassert control over 1 additional undead.','',20),
    ('dread-legion','Eternal War Room','The intact skulls of at least 5 different great tacticians and warlords must be returned to the guild HQ.','All guild members gain the Grave Command passive.','Grave Command: Whenever you cast a leveled spell, you can mentally command a number of undead under your control up to your proficiency bonus. Those undead can use their reactions to make a single attack against a target within the range of one of their weapons.',30),
    ('dawnwardens','Guild Headquarters','A site consecrated by a good deity.','All guild members gain the Blessed Touch passive.','Blessed Touch: Whenever you roll dice to deal radiant damage or restore hit points to a creature, you add your proficiency bonus to the total.',10),
    ('dawnwardens','Consecrated Armory','A steady supply of weapons and armor to the HQ, plus a 10,000 gold cost.','All guild members gain the Sanctified Arms passive.','Sanctified Arms: Whenever you make a weapon attack or cast a spell that deals damage, you can change the damage type to radiant. When you do so, you can channel a burst of celestial power, dealing extra radiant damage to the target equal to a number of d8s equal to your proficiency bonus. You can deal this extra damage once per day.',20),
    ('dawnwardens','The Hall of Conviction','At least 5 different religious artifacts must be returned to the guild HQ.','All guild members gain the Virtue of the Lightbringer passive.','Virtue of the Lightbringer: Once per day, as a free action, you can regain one expended spell slot of any level up to level 5. Alternatively, you can use this effect to cast revivify or find steed as an action, without any costs.',30),
    ('verdant-accord','Guild Headquarters','A safe place in the depths of an ancient forest.','All guild members gain the Force of the Land passive.','Force of the Land: Whenever you or a creature under your control hits a target with an attack, you can have the attack deal an extra 1d4 damage as magical vines sprout from your weapon. This damage can be either the weapon''s damage type or poison.',10),
    ('verdant-accord','The Heartwood Sanctum','A handful of magic seeds used to plant incredibly large trees must be brought back to the HQ, plus a 10,000 gold cost.','All guild members gain the Strength of the Forest passive.','Strength of the Forest: Whenever you summon a creature, you can choose to double that creature''s maximum hit points. Once on each of your turns, as a free action, you may expend any level spell slot to restore hit points to a creature under your control equal to 6 times the level of the spell slot. That creature can then use its reaction to make one attack against a target within its range.',20),
    ('verdant-accord','The Ever-Spring Grove','At least 5 different artifacts able to purify and empower must be returned to the guild HQ.','Once per quest, every guild member can pick one Fruit of the Ever-Spring.','Fruit of the Ever-Spring: Revealed when unlocked.',30),
    ('dragons-den-of-drama','Guild Headquarters','A dedicated place where many people can gather in the middle of a large city.','All guild members can use But That''s Not All! once per day.','But That''s Not All!: Whenever another creature fails an attack roll or saving throw, you can grant them a bonus equal to your proficiency bonus to the total. If that causes the attack or save to succeed, both you and the target gain advantage on the next attack roll or saving throw they make before the end of your next turn.',10),
    ('dragons-den-of-drama','Grand Stage','Sufficient supplies to build and maintain a truly massive stage, plus a 10,000 gold cost.','All guild members can use Captive Audience once per day.','Captive Audience: Choose yourself or a willing allied creature within 60 feet of you. As an action, you begin a performance that puts the targeted creature at the center of attention. All creatures of your choice within 60 feet of you must succeed on a Charisma saving throw, DC 15 or your spell save DC, whichever is higher, or be affected. An affected creature suffers disadvantage on all attack rolls against anyone other than the center of attention, and it cannot willingly move farther away from the center of attention. This effect lasts for 1 turn.',20),
    ('dragons-den-of-drama','The Trophy Room','At least 5 different artifacts that inspire and instill awe must be returned to the guild HQ.','Every guild member gains another daily use of But That''s Not All!.','',30),
    ('crucible-of-creation','Guild Headquarters','An arcane workshop, made in a place where magic naturally gathers.','Once per week, every guild member can attempt an additional crafting check.','',10),
    ('crucible-of-creation','The Crucible Forge','A steady supply of raw clay and magical supplies to the HQ, plus a 10,000 gold cost.','Once per day, a guild member can enter the forge and engrave a personal mark onto one of their items. The appearance and location of the mark are up to its creator. If an item with a mark is more than 5 feet away from the mark''s creator for more than 1 minute, the mark fades away.','While an item has a mark, the creator of the mark gains: a +2 bonus to attack and damage rolls with the item; a +1 bonus to their spell save DCs; once per day, as a free action, the ability to channel the power of the mark into the item, allowing it to regain all its charges and all uses of all its abilities. A creator can only have 1 mark at any given time.',20),
    ('crucible-of-creation','Mechanical Study','At least 5 different complex mechanical artifacts must be returned to the guild HQ.','Every guild member has their proficiency bonus increased by 1.','',30),
    ('the-argent-mark','Guild Headquarters','Establish a headquarters overseeing a crossroads, port, or major trade route.','All guild members are granted the Eyes of the Watcher passive.','Eyes of the Watcher: You gain a +1 bonus to attack and damage rolls with ranged weapons for every 30 feet of distance between you and your target, maximum +3. You also gain advantage on Perception checks made to spot hidden or distant creatures.',10),
    ('the-argent-mark','The Ledger Hall','Establish a system of contracts and bounties tied to regional authorities and noble houses at the HQ, plus a 10,000 gold cost.','All guild members gain the Dead or Alive passive.','Dead or Alive: You can make nonlethal attacks with ranged weapons. Additionally, when you hit a creature with a ranged attack, you can choose to mark the creature for death. Creatures other than you that hit that creature before the start of your next turn deal additional damage equal to their proficiency bonus. You can use this feature a number of times equal to your proficiency bonus, and you regain all uses on a long rest.',20),
    ('the-argent-mark','Hall of Legends','Return 5 confirmed trophies or insignias from legendary contracts back to the guild HQ.','All guild members are granted one use of Scales of Judgement per day.','Scales of Judgement: As a bonus action, you issue a silent decree of judgement upon a creature you can see within 1,000 feet. For 1 minute: the targeted creature cannot benefit from the Invisible condition or being hidden from you; your ranged attacks against that creature ignore half and three-quarters cover; your ranged attacks against that creature deal an additional 2d6 necrotic damage.',30),
    ('the-ashen-veil','Guild Headquarters','A secluded fortress, hidden in wilderness or ruin, built for meditation and training rather than war.','All guild members are granted the Veil of Solitude passive.','Veil of Solitude: You can add your proficiency bonus to your initiative rolls unless you already do so. Additionally, if no allies are within 30 feet of you when you start your turn, your attacks deal additional damage equal to your proficiency bonus until the start of your next turn. Mounts you are riding, or creatures serving as your mounts, are not considered allied creatures for this feature.',10),
    ('the-ashen-veil','The Trial Grounds','Establish the region around the HQ for trials, filled with beasts, monsters, and creatures, plus a 10,000 gold cost.','All guild members gain the Mental Instinct passive.','Mental Instinct: A number of times per long rest equal to your proficiency bonus, you may choose to reroll a mental saving throw, meaning Intelligence, Wisdom, or Charisma. When you do so, you can choose another mental stat to use instead of the original one.',20),
    ('the-ashen-veil','Hall of Scars','Return 5 relics of ancient orders of monster hunters or lone warriors to the guild HQ.','All guild members are granted one use of Predator''s Resurgence per day.','Predator''s Resurgence: When reduced to 0 hit points, you can drop to 1 hit point instead. You gain temporary hit points equal to your level plus your proficiency bonus. For 1 minute after this, your attacks deal an additional 1d10 damage. This extra damage ends early if you die or become incapacitated.',30),
    ('wayfarers-respite','Guild Headquarters','Make friends with Old Potto and convince him to let you into the back.','All members of the guild gain an Old Flask.','Old Flask: The Old Flask is a matte black steel flask that seems to have a multitude of symbols etched on it, then crossed out as if the allegiance of its previous owner changed many times. At the start of every quest, a guild member can fill the flask with one drink of their choice for free. Whiskey: as a bonus action, you can drink from the flask, gaining the Fiery Whiskey effect for 1 minute. Wine: as a bonus action, you can drink from the flask, gaining the Mind Your Wine effect for 1 minute. Vodka: as a bonus action, you can drink from the flask, gaining the Ice Vodka effect for 1 minute.',10),
    ('wayfarers-respite','A New Location','Build a new bar under the Potto name, which requires a 10,000 gold investment and a fief of land.','The Old Flask can now hold up to 2 drinks at the start of a quest. They can be the same drink or 2 different drinks.','',20),
    ('wayfarers-respite','Potto''s Signature Drinks','Help Old Potto gather 5 unique drinking ingredients.','Revealed when unlocked.','',30)
) AS u(guild_slug, title, requirement, reward, details, sort_order)
  ON u.guild_slug = g.slug;
