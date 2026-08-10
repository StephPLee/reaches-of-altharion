INSERT INTO capstones (
  title,
  slug,
  content_markdown,
  sort_order,
  is_published
)
VALUES
  (
    'Artificer',
    'artificer',
    $$- You can maintain two additional Infusions.
- Any creature using one of your infused items gains a +1 bonus to all saving throws (this bonus does not stack with itself).
- Once per long rest, whenever a creature using one of your infused items makes a d20 test, you can add your Intelligence modifier to that roll (no action required).$$,
    10,
    true
  ),
  (
    'Barbarian',
    'barbarian',
    $$- Once on each of your turns while raging, when you hit a creature with a melee weapon attack using Strength, you can unleash a shockwave.
- Each creature of your choice within 10 feet of the target must succeed on a Strength saving throw (DC = 8 + your attack roll bonus).
- On a failure, the creature takes damage equal to your Strength score plus your Constitution score, and you can choose to knock it prone or push it up to 15 feet in a direction of your choice.
- On a success, the creature takes half as much damage instead.$$,
    20,
    true
  ),
  (
    'Bard',
    'bard',
    $$- At the start of your turn, you regain one use of your Bardic Inspiration.
- At the end of your turn, you can give a creature that can see or hear you within 60 feet Bardic Inspiration (no action required).$$,
    30,
    true
  ),
  (
    'Blood Hunter',
    'blood-hunter',
    $$- At the start of each of your turns, you regain hit points equal to your Hemocraft modifier.
- Once per turn, whenever you take damage from a Blood Hunter ability, you can choose to regain that much hit points instead.
- Additionally, choose one weapon type. You add your proficiency bonus to attack and damage rolls you make with that weapon type, even if your proficiency bonus already applies to those rolls.$$,
    40,
    true
  ),
  (
    'Cleric',
    'cleric',
    $$- You can add your Wisdom modifier to any Intelligence or Charisma check you make.$$,
    50,
    true
  ),
  (
    'Druid',
    'druid',
    $$- You gain one additional use of Wild Shape.
- You gain tremorsense out to 30 feet.
- Whenever you roll initiative, you regain all expended uses of Wild Shape.
- When you fail a saving throw made to maintain concentration on a druid spell, you can expend one use of Wild Shape to succeed instead. You can use this feature while transformed.$$,
    60,
    true
  ),
  (
    'Fighter',
    'fighter',
    $$- Once on each of your turns, when you make a weapon attack, you can apply one Weapon Mastery property you know to that attack, regardless of whether the weapon possesses that property.
- You can't choose the Vex or Nick property when using this feature.$$,
    70,
    true
  ),
  (
    'Gunslinger',
    'gunslinger',
    $$- Whenever you score a critical hit against a creature, you can deal an additional 20 damage to it.$$,
    80,
    true
  ),
  (
    'Illrigger',
    'illrigger',
    $$- Whenever you roll a d6 to deal damage to a creature, you can add your proficiency bonus to the total for each d6 rolled.$$,
    90,
    true
  ),
  (
    'Monk',
    'monk',
    $$- You can understand any spoken language you hear, and you can speak any language.
- You can choose to walk on water, walls, and ceilings.$$,
    100,
    true
  ),
  (
    'Monster Hunter',
    'monster-hunter',
    $$- Whenever you use Grave Strike, you can forgo forcing the target to make a Constitution saving throw and instead deal an extra 10d10 damage to it. This extra damage is not affected by a critical hit.$$,
    110,
    true
  ),
  (
    'Paladin',
    'paladin',
    $$- Spells you cast that contain the word "Smite" are cast as a free action.
- When you take damage from a creature, you can expend one spell slot as a free action to reduce the damage you take. The damage is reduced by 1d8, plus an additional 1d8 per level of the spell slot expended.
- If the creature that damaged you is an aberration, celestial, fey, fiend, or undead, the damage reduction increases by an additional 1d8.$$,
    120,
    true
  ),
  (
    'Ranger',
    'ranger',
    $$- While concentrating only on Hunter's Mark, you can still cast spells that require concentration. However, if you lose concentration on any other spell, Hunter's Mark ends as well.
- Once on your turn, as a free action, you can teleport to a space within 30 feet of your marked target, no matter the distance between you, and immediately make a weapon attack against it. This attack is made with advantage.$$,
    130,
    true
  ),
  (
    'Rogue',
    'rogue',
    $$- Whenever you deal Sneak Attack damage, that damage is doubled.$$,
    140,
    true
  ),
  (
    'Sorcerer',
    'sorcerer',
    $$- You can cast Sorcerer spells without an arcane focus, and you no longer require somatic components for your spells.$$,
    150,
    true
  ),
  (
    'Warlock',
    'warlock',
    $$- As a bonus action, you can assume a manifestation of your patron for 1 minute.
- While transformed, you gain temporary hit points equal to twice your Warlock level.
- While transformed, if you have no Pact Magic spell slots remaining, you regain one at the start of each of your turns.
- Once per turn while transformed, when you hit with a weapon attack or spell attack, you deal an extra 4d10 damage of a type dealt by the weapon or spell.
- Once you use this feature, you can't use it again until you finish a long rest.$$,
    160,
    true
  ),
  (
    'Wizard',
    'wizard',
    $$- You always have every Wizard spell prepared in your spellbook.$$,
    170,
    true
  )
ON CONFLICT (slug) DO UPDATE
SET
  title = EXCLUDED.title,
  content_markdown = EXCLUDED.content_markdown,
  sort_order = EXCLUDED.sort_order,
  is_published = EXCLUDED.is_published,
  updated_at = NOW();
