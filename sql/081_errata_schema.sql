CREATE TABLE IF NOT EXISTS errata (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  discord_message_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT errata_title_unique UNIQUE (title)
);

-- Seed the errata list that already exists on Discord. These rows have no
-- discord_message_ids, so they are not reposted; only errata added through
-- the site afterwards are mirrored to the Discord errata channel.
WITH errata_seed(title, content, seed_order) AS (
  VALUES
    (
      'Sangromancy Initiate (Feat)',
      'The feat "Sangromancy Initiate" can only grant a spell slot of lvl 1.',
      1
    ),
    (
      'Anti-Magic Field (Spell)',
      'Unless specifically stated otherwise by the DM, the Spell "Anti-Magic Field" only works on spells and magical creatures. Items and other magical effects are unaffected.',
      2
    ),
    (
      'Gunner (Feat)',
      'The feat "Gunner" allows the user to ignore the "Reload" property of firearms.',
      3
    ),
    (
      'Crossbow Expert (Feat)',
      'The feat "Crossbow Expert" allows the user to ignore the "Magazine" property of crossbows, if they want to.',
      4
    ),
    (
      'Monster Hunter: Trapper Guild Gadgets',
      'Monster Hunter Trapper Guild (Subclass) Trapper Gadgets that do not have a duration (Dread Venom, Runic Bomb, Scorpion Anchor and Weretrap) all fall apart if the character creating them finishes a Long Rest.',
      5
    ),
    (
      'Monster Hunter: Devourer Guild Preservation',
      'Monster Hunter Devourer Guild (Subclass) characters gain a new ability:' || E'\n\n' ||
      '> At the end of a quest, you can preserve two monster portions so that they last until the end of your next quest.',
      6
    ),
    (
      'Valda''s Guns: Firearm Property',
      'The following line from Valda''s guns does not exist:' || E'\n\n' ||
      '> Firearm: You don''t add your ability modifier to the weapon''s damage, unless otherwise stated. Firearm ammunition is destroyed upon use.',
      7
    ),
    (
      'Blood Hunter Multiclassing',
      'Blood Hunters may multiclass if their INT or WIS are 13.',
      8
    ),
    (
      'Stat Increasing Tomes and Manuals',
      'A PC can only ever benefit from one of the stat increasing tomes/manuals (e.g. Manual of Bodily Health). In addition, all of these items can only be used and PH targeted by characters that are lvl 17+ and are consumed in eldritch flames upon being used.',
      9
    ),
    (
      'Cavalier Fighter: Find Steed',
      'Cavalier Fighters gain the ability to cast a lvl 2 version of Find Steed once before the start of every quest.',
      10
    ),
    (
      'Racial Feat Prerequisites',
      'Racial feats do not require the racial prerequisite to take. This does not apply to racial feats that rely on a specific race trait (e.g. Bountiful Luck which relies on Halfling Luck).',
      11
    ),
    (
      'Permanent Spell Effects',
      'Any spell that would possibly have a permanent effect carry over from one quest to another, does not. These spells are limited to the quest in which they are cast in. This is spells like Wish, Steal Immortality, True Polymorph, and anything else like that.',
      12
    ),
    (
      'Daily Casting Spells',
      'Any spell that requires "daily" castings over x time period, only requires 30 days. These do not need to be consecutive to count, and you must still buy the materials per day- or all 30 at once if you prefer. It MUST be logged each day it''s cast in [misc-logs](https://discord.com/channels/1417076658460033077/1430481335557820538), with a link to the materials, and a count of how many days you''ve cast it already. This is spells like Teleportation Circle or Druid Grove, anything like them.',
      13
    ),
    (
      'Amulet of the Devout',
      'Amulet of Devout only applies to the save DC''s of Paladins and Clerics.',
      14
    ),
    (
      'Simulacrum (Spell)',
      'For mechanical purposes, Simulacrum is not treated as a summon. Simulacrums do not benefit from boons.',
      15
    ),
    (
      'Books of Exalted Deeds and Vile Darkness',
      'You have to remain attuned to the books of Exalted Deeds and Vile Darkness to retain the benefits, you do not unlock them permanently after a period of time.',
      16
    ),
    (
      'Summons and Attunement',
      'Summons cannot attune to any items. The only exception is with the Kindred Spirit starting grace.',
      17
    ),
    (
      'Illrigger and Blood Hunter Weapon Masteries',
      'Illriggers and Blood Hunters gain 2 weapon masteries at lvl one.',
      18
    ),
    (
      'Language Selection',
      'Any PC can now pick any language they want when selecting languages (including exotic ones).',
      19
    ),
    (
      'Weapon Charms',
      'Weapon Charms from require a separate attunement slot, even if attached to a weapon that already requires attunement, to gain their benefits.',
      20
    )
)
INSERT INTO errata (title, content, created_at)
SELECT title, content, NOW() + (seed_order * INTERVAL '1 millisecond')
FROM errata_seed
ON CONFLICT (title) DO NOTHING;
