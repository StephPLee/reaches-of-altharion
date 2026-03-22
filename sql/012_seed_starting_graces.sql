INSERT INTO starting_graces (
  title,
  slug,
  content_markdown,
  sort_order,
  is_published
)
VALUES
  (
    'Heart of Stone',
    'heart-of-stone',
    $$- You are the guardian totem; Though still as you are, you are not to be ignored.
- When a creature within your reach misses you with a melee attack, you can make an opportunity attack against that creature.
- At Level 5: You can use your action to enter a defensive stance that lasts until the start of your next turn. While in this stance, you can make opportunity attacks without using your reaction.
- At Level 13: You can enter your defensive stance as a bonus action instead of an action.
- At Level 17: While in your defensive stance, your AC becomes 25, unless it is already higher. Your AC can't be reduced below 25 while in the stance.$$,
    10,
    true
  ),
  (
    'Edge of Conquest',
    'edge-of-conquest',
    $$- When you make an attack roll, you can choose to gain a bonus to the attack roll and the damage roll equal to half your Proficiency Bonus, rounded down.
- At Level 17: Whenever you take the Attack action, you can make one additional attack as part of that action.$$,
    20,
    true
  ),
  (
    'Elemental Apotheosis',
    'elemental-apotheosis',
    $$- At character creation, choose one damage type: acid, cold, fire, force, lightning, necrotic, poison, psychic, radiant, or thunder. You gain resistance to that damage type.
- At Level 5: Damage you deal of the chosen type ignores resistance.
- At Level 9: You gain immunity to the chosen damage type instead of resistance.
- At Level 13: Damage you deal of the chosen type ignores both resistance and immunity.
- At Level 17: You lose your immunity to the chosen damage type. However, whenever you would take damage of that type, you instead regain hit points equal to the damage you would have taken.$$,
    30,
    true
  ),
  (
    'Arcane Ascendancy',
    'arcane-ascendancy',
    $$- If you have the Spellcasting or Pact Magic feature, your spell save DC increases by half your Proficiency Bonus, rounded down.
- When you cast a spell from a magic item, you can use your own spell save DC instead of the DC listed for the item.
- You count as a cleric, bard, druid, sorcerer, warlock, and wizard for the purpose of attuning to magic items.$$,
    40,
    true
  ),
  (
    'Chain of Dominion',
    'chain-of-dominion',
    $$- You gain the benefits of the Pact of the Chain feature, as if granted by the Eldritch Invocation of the same name.
- You can mentally communicate with any creature you have summoned or created, and you can issue commands to it for its next turn without using an action. If such a creature has a different initiative count than your own, you can have it instead act on your turn.
- At Level 9: Once per day, when you cast a spell that summons or creates a creature, you can regain the spell slot expended to cast that spell.
- At Level 17: When a creature you summoned or created makes an attack roll, it can add your proficiency bonus to its attack roll.$$,
    50,
    true
  ),
  (
    'Guardian''s Benediction',
    'guardians-benediction',
    $$Whenever you affect an allied creature with a spell or ability, you can imbue it with one of the following benefits:

- **Reaction option:** The target can use its reaction to make a single weapon attack or cast a cantrip.
  At Level 9: The target can instead cast a spell of 3rd level or lower.
  At Level 17: The target can make two attacks, or cast a spell of 7th level or lower.
- **Temporary vitality:** The target gains temporary hit points equal to three times your proficiency bonus.
- **Condition removal:** The target can have one condition removed. The conditions you can choose from depend on your character level.
  Level 1: Grappled, prone, blinded, deafened, or poisoned.
  Level 9: You can also choose restrained, charmed, or frightened.
  Level 17: You can also choose paralyzed, petrified, or stunned.

After removing a condition in this way, roll one of your Hit Dice, add your Constitution modifier, and lose that much HP. This damage does not trigger concentration checks.$$,
    60,
    true
  ),
  (
    'Warlord''s Banner',
    'warlords-banner',
    $$- Every time you use an effect that refers to "you" as the caster of the effect, you may extend that effect so that it also applies to an ally within 60 feet of you, as if the effect instead said "you and your chosen ally".
- This ability only works on effects that target only you.
- An ally can choose not to receive this effect.
- The ability always works for spells that target only you, regardless of their wording.$$,
    70,
    true
  ),
  (
    'Martyr''s Vow',
    'martyrs-vow',
    $$- You absorb the punishment done to your allies.
- When you roll initiative, you can choose a number of creatures equal to your proficiency bonus.
- Whenever one of the chosen creatures takes damage, that damage is reduced by an amount equal to your Constitution modifier, and you take the same amount instead.
- At Level 5: Your hit point maximum increases by an amount equal to `10 x your Proficiency Bonus`.
- At Level 11: The reduction equals half your Constitution score, and you take that amount of damage.
- At Level 17: The reduction equals your full Constitution score, but you take half of the reduced damage instead.$$,
    80,
    true
  ),
  (
    'Living Arsenal',
    'living-arsenal',
    $$- When you make an attack roll with a weapon, you can choose to become proficient with that weapon for the duration of the attack, and you may use any ability score of your choice for the attack and damage rolls.
- When you make an attack with a thrown weapon, it returns to your hand immediately after the attack, whether it hits or misses.
- Your weapon''s reach increases by 5 feet if it is a melee weapon.
- If the weapon does not already have the thrown property, it gains thrown `(10/30)`.
- The weapon''s normal, long, and thrown ranges are doubled.
- You ignore the 13 Strength requirement of heavy weapons.$$,
    90,
    true
  ),
  (
    'Titan''s Shackles',
    'titans-shackles',
    $$- When you hit a creature with an unarmed strike, you can choose to grapple the target. No separate check is required.
- A grappled creature can only escape by succeeding on a contested Athletics or Acrobatics check against your Athletics check at the end of its turn. It can also use its action to attempt the check.
- At Level 9: You can use your bonus action to impose the Restrained condition on a creature you are grappling, provided it is no more than one size larger than you. Doing so grants advantage on all attacks against you. Both effects end at the start of your next turn or when the grapple ends.
- At Level 17: Whenever you would try to impose the Restrained condition on a target, you can choose to instead reveal weak points in the enemy. If you do so, the target is not restrained. Instead, until the start of your next turn, any creature that hits it with an attack deals extra damage to it equal to your Constitution score. This extra damage is of the same type as the attack''s damage. A target can only take this extra damage ten times per use of this feature.$$,
    100,
    true
  ),
  (
    'Grace of Steel',
    'grace-of-steel',
    $$- Your walking speed increases by 10 feet.
- At Level 5: When you are hit by an attack, you can use your reaction to move up to half your speed.
- At Level 13: Your movement does not provoke opportunity attacks.
- At Level 17: You gain one additional reaction each round.$$,
    110,
    true
  ),
  (
    'Artisan''s Soul',
    'artisans-soul',
    $$- When you use a magic item and choose to use the item''s save DC, you can increase that DC by a number equal to your proficiency bonus for checks with the tool used in the item''s creation.
- Once per day as a bonus action, you can restore `1d4 + 1` charges to a magic item you are attuned to.
- Once per week, you can make a special crafting check in addition to your normal daily crafting checks. For this purpose, a week is counted from Monday to Sunday.$$,
    120,
    true
  ),
  (
    'Kindred Spirit',
    'kindred-spirit',
    $$- Once per day, whenever you summon, create, or call upon a creature, you may designate it as your companion. If you do, you cannot summon, create, call upon, or reassert control over other creatures, other than your companion.
- You may only have one companion at any given point.
- You can remove your companion as a free action, which kills the creature and severs your connection to it.
- Your companion''s maximum HP increases by 20.
- Once per day, if your companion has been reduced to 0 HP within the last combat round, you may use an action to revive it with full hit points in an unoccupied space closest to you.
- At Level 5: Once per turn, whenever you take the Attack action or cast a spell, your companion may move up to its speed without provoking opportunity attacks.
- At Level 13: Whenever your companion takes the Attack action, it may make another attack as part of the same action.
- At Level 17: While you are attuned to a magical item, your companion also gains its benefits. Your companion can use its action to activate the properties of magic items you are wielding, as if it were wielding them.$$,
    130,
    true
  ),
  (
    'Sanguine Regeneration',
    'sanguine-regeneration',
    $$- You are the epitome of healing yourself and others.
- At the start of your turn in combat, you regain hit points equal to your proficiency bonus, if you have at least 1 hit point. This effect increases to twice your proficiency bonus at Level 17.
- At Level 5: As an action you can touch a willing creature. That creature regains hit points equal to half your hit point maximum. You lose hit points equal to half your hit point maximum, and this damage cannot be reduced in any way. You can use this feature half your proficiency bonus, rounded down, times per day.
- At Level 9: Whenever you regain hit points from an innate effect, meaning an effect not derived from a spell, magic item, or external magical effect, you regain twice as much.
- At Level 17: For the purposes of spells and effects, you can choose to be at any amount of hit points. In addition, whenever you restore hit points to another creature, you can increase the amount restored by twice your proficiency bonus.$$,
    140,
    true
  )
ON CONFLICT (slug) DO UPDATE
SET
  title = EXCLUDED.title,
  content_markdown = EXCLUDED.content_markdown,
  sort_order = EXCLUDED.sort_order,
  is_published = EXCLUDED.is_published,
  updated_at = NOW();

DELETE FROM homebrew_automation_entries
WHERE starting_grace_id IN (
  SELECT id
  FROM starting_graces
  WHERE slug IN (
    'arcane-ascendancy',
    'edge-of-conquest',
    'martyrs-vow',
    'sanguine-regeneration'
  )
);

WITH automation_rows AS (
  INSERT INTO homebrew_automation_entries (
    starting_grace_id,
    anchor_mode,
    panel_title,
    panel_subtitle,
    sort_order
  )
  SELECT
    sg.id,
    'starting_grace',
    ar.panel_title,
    'Expand to view setup and download options',
    0
  FROM starting_graces sg
  JOIN (
    VALUES
      ('arcane-ascendancy', 'Arcane Ascendancy Avrae Setup'),
      ('edge-of-conquest', 'Edge of Conquest Avrae Automation'),
      ('martyrs-vow', 'Martyr''s Vow Avrae Automation'),
      ('sanguine-regeneration', 'Sanguine Regeneration Avrae Automation')
  ) AS ar(slug, panel_title)
    ON ar.slug = sg.slug
  RETURNING id, starting_grace_id
),
automation_targets AS (
  SELECT
    ar.id AS automation_entry_id,
    sg.slug
  FROM automation_rows ar
  JOIN starting_graces sg
    ON sg.id = ar.starting_grace_id
)
INSERT INTO homebrew_automation_setup_commands (
  automation_entry_id,
  label,
  command,
  sort_order
)
SELECT
  at.automation_entry_id,
  sc.label,
  sc.command,
  sc.sort_order
FROM automation_targets at
JOIN (
  VALUES
    (
      'arcane-ascendancy',
      'Required Snippet',
      $$!snippet aa {{pb=proficiencyBonus}} -dc +{{pb//2}} -f "Arcane Ascendancy|If you have the Spellcasting or Pact Magic feature, your spell save DC increases by half your proficiency bonus (rounded down)."$$,
      0
    ),
    (
      'edge-of-conquest',
      'Required Snippet',
      $$!snippet eoc {{pb = proficiencyBonus//2}} -b {{pb}} -d {{pb}} -f "Edge of Conquest|Whenever you make an attack roll, you can choose to add a bonus to the attack and damage roll of that attack. This bonus equal half your proficiency bonus (rounded down)."$$,
      0
    )
) AS sc(slug, label, command, sort_order)
  ON sc.slug = at.slug;

WITH automation_targets AS (
  SELECT
    hae.id AS automation_entry_id,
    sg.slug
  FROM homebrew_automation_entries hae
  JOIN starting_graces sg
    ON sg.id = hae.starting_grace_id
  WHERE sg.slug IN (
    'edge-of-conquest',
    'martyrs-vow',
    'sanguine-regeneration'
  )
)
INSERT INTO homebrew_automation_code_blocks (
  automation_entry_id,
  title,
  code,
  download_name,
  sort_order
)
SELECT
  at.automation_entry_id,
  cb.title,
  cb.code,
  cb.download_name,
  cb.sort_order
FROM automation_targets at
JOIN (
  VALUES
    (
      'edge-of-conquest',
      'Edge of Conquest',
      $$!a import name: Edge of Conquest
automation:
  - type: target
    target: self
    effects:
      - type: text
        text: >-
          Whenever you make an attack roll, you can choose to add a bonus to the
          attack and damage roll of that attack. This bonus equal half your
          proficiency bonus (rounded down). At lvl 17, whenever you take the
          Attack action, you may make one additional attack.
        title: Edge of Conquest
      - type: ieffect2
        name: Edge of Conquest
        duration: null
        effects:
          to_hit_bonus: "{proficiencyBonus//2}"
          damage_bonus: "{proficiencyBonus//2}"
        attacks: []
        buttons: []
        end: false
        conc: false
        desc: >-
          Whenever you make an attack roll, you can choose to add a bonus to the
          attack and damage roll of that attack. This bonus equal half your
          proficiency bonus (rounded down).
        stacking: false
        save_as: null
        parent: null
        target_self: true
        tick_on_caster: false
_v: 2$$,
      'edge-of-conquest.txt',
      0
    ),
    (
      'martyrs-vow',
      'Martyr''s Vow',
      $$!a import name: Martyr's Vow
automation:
  - type: condition
    condition: level < 11
    onTrue:
      - type: roll
        dice: "{constitutionMod}"
        name: martyr
        displayName: Martyred HP
    onFalse:
      - type: condition
        condition: level < 17
        onTrue:
          - type: roll
            dice: "{constitution}/2"
            name: martyr
            displayName: Martyred HP
        onFalse:
          - type: roll
            dice: "{constitution}"
            name: martyr
            displayName: Martyred HP
  - type: target
    target: all
    effects:
      - type: damage
        damage: -{martyr}
  - type: target
    target: self
    effects:
      - type: condition
        condition: level < 17
        onTrue:
          - type: damage
            damage: "{martyr}"
        onFalse:
          - type: damage
            damage: "{martyr}/2"
_v: 2
proper: true
verb: endures the burden with$$,
      'martyrs-vow.txt',
      0
    ),
    (
      'sanguine-regeneration',
      'Sanguine Boost',
      $$!a import _v: 2
name: Sanguine Boost
automation:
  - type: counter
    counter: ","
    amount: "0"
    errorBehaviour: ignore
  - type: variable
    name: SR
    value: lastCounterRequestedAmount
  - type: target
    target: self
    effects:
      - type: damage
        damage: -{SR}[healing]
        fixedValue: true
      - type: text
        text: >-
          At lvl 9, whenever you regain hit points from an innate effect(effect not
          derived from a spell, magic item, or external magical effect), you
          regain twice as much.
verb: heals for more with their
proper: true
activation_type: 2$$,
      'sanguine-boost.txt',
      0
    ),
    (
      'sanguine-regeneration',
      'Heal Others',
      $$!a import name: Heal Others
automation:
  - type: variable
    name: Self
    value: (caster.max_hp * 0.50)
  - type: target
    target: self
    effects:
      - type: damage
        damage: "{Self}[sanguine]"
        fixedValue: true
  - type: target
    target: all
    effects:
      - type: damage
        damage: -{Self}[healing]
        fixedValue: true
  - type: counter
    counter: "Sanguine Regeneration: Heal Others"
    amount: "1"
    fixedValue: true
  - type: text
    text: >-
      At lvl 5, as an action you can touch a willing creature. That creature
      regains hit points equal to half your hit point maximum. You lose hit
      points equal to half your hit point maximum, and this damage cannot be
      reduced in any way. You can use this feature half your PB(rounded down)
      times per day.
_v: 2
proper: true
verb: sacrifices their life to
activation_type: 1
phrase: '"My life for yours, a fair trade, wouldn''t you say? We can discuss payment later~"'$$,
      'heal-others.txt',
      1
    ),
    (
      'sanguine-regeneration',
      'Sanguine Regeneration',
      $$!a import _v: 2
name: Sanguine Regeneration
automation:
  - type: target
    target: self
    effects:
      - type: ieffect2
        name: Sanguine Regeneration
        buttons:
          - automation:
              - type: condition
                condition: level >= 17
                onTrue:
                  - type: target
                    target: self
                    effects:
                      - type: damage
                        damage: -{proficiencyBonus*2}[healing]
                        fixedValue: true
                      - type: text
                        text: You regenerate {{proficiencyBonus*2}} per round so long as you have 1HP.
                        title: Greater Regenerate
                onFalse:
                  - type: target
                    target: self
                    effects:
                      - type: damage
                        damage: -{proficiencyBonus}[healing]
                        fixedValue: true
                      - type: text
                        text: You heal {{proficiencyBonus}} per round so long as you have 1HP.
                        title: Regenerate
            label: Regenerate
            verb: continues to Regenerate!
            style: "3"
      - type: text
        text: >-
          At the start of your turn in combat, you regain hit points equal to your
          PB, if you have at least 1 hit point. This effect increases to twice
          your PB at lvl 17.
verb: begins to regenerate with their
proper: true
activation_type: 2$$,
      'sanguine-regeneration.txt',
      2
    ),
    (
      'sanguine-regeneration',
      'Sanguine Regeneration (Remarkable Recovery)',
      $$name: Sanguine Regeneration
automation:
  - type: target
    target: self
    effects:
      - type: ieffect2
        name: Sanguine Regeneration
        duration: null
        effects: null
        attacks: []
        buttons:
          - label: Regenerate
            automation:
              - type: condition
                condition: level >= 17
                onTrue:
                  - type: target
                    target: self
                    effects:
                      - type: damage
                        damage: -({proficiencyBonus*2}+{constitutionMod})[healing]
                        overheal: false
                        fixedValue: true
                      - type: text
                        text: You regenerate {{proficiencyBonus*2}} per round so long as you have 1HP.
                        title: Greater Regenerate
                      - type: text
                        text: >-
                          Whenever you regain hit points as a result of a spell, potion, or class
                          feature, you regain additional hit points equal to
                          your Constitution modifier (minimum of 1).
                        title: Remarkable Recovery
                onFalse:
                  - type: target
                    target: self
                    effects:
                      - type: damage
                        damage: -({proficiencyBonus}+{constitutionMod})[healing]
                        overheal: false
                        fixedValue: true
                      - type: text
                        text: You heal {{proficiencyBonus}} per round so long as you have 1HP.
                        title: Regenerate
                      - type: text
                        text: >-
                          Whenever you regain hit points as a result of a spell, potion, or class
                          feature, you regain additional hit points equal to
                          your Constitution modifier (minimum of 1).
                        title: Remarkable Recovery
                errorBehaviour: "false"
            verb: continues to Regenerate!
            style: "3"
            defaultDC: null
            defaultAttackBonus: null
            defaultCastingMod: null
        end: false
        conc: false
        desc: null
        stacking: false
        save_as: null
        parent: null
        target_self: false
        tick_on_caster: false
      - type: text
        text: >-
          At the start of your turn in combat, you regain hit points equal to your
          PB, if you have at least 1 hit point. This effect increases to twice
          your PB at lvl 17.
        title: Effect
_v: 2
proper: true
verb: begins to regenerate with their
activation_type: 2$$,
      'sanguine-regeneration-remarkable-recovery.yaml',
      3
    )
) AS cb(slug, title, code, download_name, sort_order)
  ON cb.slug = at.slug;
