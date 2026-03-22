INSERT INTO homebrew_entries (
  section,
  title,
  slug,
  body_markdown,
  sort_order,
  is_published
)
VALUES
  ('wondrous-items', 'Common Wondrous Items', 'common-wondrous-items', '', 10, true),
  ('wondrous-items', 'Uncommon Wondrous Items', 'uncommon-wondrous-items', '', 20, true),
  ('wondrous-items', 'Rare Wondrous Items', 'rare-wondrous-items', '', 30, true),
  ('wondrous-items', 'Very Rare Wondrous Items', 'very-rare-wondrous-items', '', 40, true),
  ('wondrous-items', 'Legendary Wondrous Items', 'legendary-wondrous-items', '', 50, true),
  ('wondrous-items', 'Artifact Wondrous Items', 'artifact-wondrous-items', '', 60, true),
  ('wondrous-items', 'Varies Wondrous Item', 'varies-wondrous-item', '', 70, true)
ON CONFLICT (slug) DO UPDATE
SET
  title = EXCLUDED.title,
  body_markdown = EXCLUDED.body_markdown,
  sort_order = EXCLUDED.sort_order,
  is_published = EXCLUDED.is_published,
  updated_at = NOW();

WITH source_items (entry_slug, label, href) AS (
  VALUES
    ('common-wondrous-items', 'Corvid Bangle - Common Wondrous Item', 'https://www.dndbeyond.com/magic-items/10943849-corvid-bangle'),

    ('uncommon-wondrous-items', 'Diabolic Conduit +1 - Uncommon Wondrous Item', 'https://www.dndbeyond.com/magic-items/10912761-diabolic-conduit-1'),
    ('uncommon-wondrous-items', 'Sanguine Ichor +1 - Uncommon Wondrous Item', 'https://www.dndbeyond.com/magic-items/10721356-sanguine-ichor-1'),
    ('uncommon-wondrous-items', 'Sigil of the Ranger +1 - Uncommon Wondrous Item', 'https://www.dndbeyond.com/magic-items/10867723-sigil-of-the-hunter-1'),
    ('uncommon-wondrous-items', 'Surgeons Gloves - Uncommon Wondrous Item', 'https://www.dndbeyond.com/magic-items/11120555-surgeons-gloves'),

    ('rare-wondrous-items', 'Diabolic Conduit +2 - Rare Wondrous Item', 'https://www.dndbeyond.com/magic-items/10912765-diabolic-conduit-2'),
    ('rare-wondrous-items', 'Gauntlets of Consecrated Sacrifice - Rare Wondrous Item', 'https://www.dndbeyond.com/magic-items/10850733-gauntlets-of-consecrated-sacrifice'),
    ('rare-wondrous-items', 'Sanguine Ichor +2 - Rare Wondrous Item', 'https://www.dndbeyond.com/magic-items/10829895-sanguine-ichor-2'),
    ('rare-wondrous-items', 'Sigil of the Ranger +2 - Rare Wondrous Item', 'https://www.dndbeyond.com/magic-items/10867724-sigil-of-the-hunter-2'),
    ('rare-wondrous-items', 'Surgeons Coat - Rare Wondrous Item', 'https://www.dndbeyond.com/magic-items/11120583-surgeons-coat'),

    ('very-rare-wondrous-items', 'Amulet of the Night - Very Rare Wondrous Item', 'https://www.dndbeyond.com/magic-items/9255554-amulet-of-the-night'),
    ('very-rare-wondrous-items', 'Diabolic Conduit +3 - Very Rare Wondrous Item', 'https://www.dndbeyond.com/magic-items/10912764-diabolic-conduit-3'),
    ('very-rare-wondrous-items', 'Elementalist''s Staff - Very Rare Wondrous Item', 'https://www.dndbeyond.com/magic-items/10976544-elementalists-staff'),
    ('very-rare-wondrous-items', 'Red Diamond Cuirass - Very Rare Wondrous Item', 'https://www.dndbeyond.com/magic-items/11187182-red-diamond-cuirass'),
    ('very-rare-wondrous-items', 'Sanguine Ichor +3 - Very Rare Wondrous Item', 'https://www.dndbeyond.com/magic-items/10829943-sanguine-ichor-3'),
    ('very-rare-wondrous-items', 'Sigil of the Ranger +3 - Very Rare Wondrous Item', 'https://www.dndbeyond.com/magic-items/10867726-sigil-of-the-hunter-3'),
    ('very-rare-wondrous-items', 'Surgeons Scalpel - Very Rare Wondrous Item', 'https://www.dndbeyond.com/magic-items/11120597-surgeons-scalpel'),

    ('legendary-wondrous-items', 'Crest of the Eternal Hunter - Legendary Wondrous Item', 'https://www.dndbeyond.com/magic-items/10910419-crest-of-the-eternal-hunter'),
    ('legendary-wondrous-items', 'Endless Current - Legendary Wondrous Item', 'https://www.dndbeyond.com/magic-items/10838974-endless-current'),
    ('legendary-wondrous-items', 'The God Fragment - Legendary Wondrous Item', 'https://www.dndbeyond.com/magic-items/10842343-the-god-fragment'),
    ('legendary-wondrous-items', 'Instinct - Legendary Wondrous Item', 'https://www.dndbeyond.com/magic-items/10892554-instinct'),
    ('legendary-wondrous-items', 'Sigil of the Reaper - Legendary Wondrous Item', 'https://www.dndbeyond.com/magic-items/9231982-sigil-of-the-reaper'),
    ('legendary-wondrous-items', 'Strategy - Legendary Wondrous Item', 'https://www.dndbeyond.com/magic-items/10892547-strategy'),
    ('legendary-wondrous-items', 'Surgeons Mask - Legendary Wondrous Item', 'https://www.dndbeyond.com/magic-items/11120675-surgeons-mask'),

    ('artifact-wondrous-items', 'Heart of the Void - Artifact Wondrous Item', 'https://www.dndbeyond.com/magic-items/11166813-heart-of-the-void'),
    ('artifact-wondrous-items', 'Surgeons Handbag - Artifact Wondrous Item', 'https://www.dndbeyond.com/magic-items/11081170-surgeons-handbag'),

    ('varies-wondrous-item', 'Pocket Armory - Uncommon, Rare, Very Rare, Legendary Wondrous Item', 'https://www.dndbeyond.com/magic-items/10932978-pocket-armory'),
    ('varies-wondrous-item', 'Thematic Accompaniment - Common, Uncommon, Rare, Very Rare, Legendary Wondrous Item', 'https://www.dndbeyond.com/magic-items/11103877-thematic-accompaniment')
)
INSERT INTO homebrew_section_items (
  homebrew_entry_id,
  label,
  href,
  sort_order,
  is_published
)
SELECT
  e.id,
  s.label,
  s.href,
  0,
  true
FROM source_items s
JOIN homebrew_entries e
  ON e.slug = s.entry_slug
WHERE NOT EXISTS (
  SELECT 1
  FROM homebrew_section_items existing
  WHERE existing.homebrew_entry_id = e.id
    AND existing.href = s.href
);

WITH wondrous_automation_targets AS (
  SELECT i.id AS item_id
  FROM homebrew_section_items i
  WHERE i.href IN (
    'https://www.dndbeyond.com/magic-items/11166813-heart-of-the-void',
    'https://www.dndbeyond.com/magic-items/11103877-thematic-accompaniment',
    'https://www.dndbeyond.com/magic-items/9255554-amulet-of-the-night'
  )
)
DELETE FROM homebrew_automation_entries
WHERE homebrew_section_item_id IN (SELECT item_id FROM wondrous_automation_targets);

WITH automation_rows AS (
  SELECT
    e.id AS homebrew_entry_id,
    i.id AS homebrew_section_item_id,
    'Heart of the Void Avrae Automation'::text AS panel_title,
    'Expand to view setup and download options'::text AS panel_subtitle
  FROM homebrew_section_items i
  JOIN homebrew_entries e ON e.id = i.homebrew_entry_id
  WHERE i.href = 'https://www.dndbeyond.com/magic-items/11166813-heart-of-the-void'

  UNION ALL

  SELECT
    e.id,
    i.id,
    'Thematic Accompaniment Avrae Automation',
    'Expand to view setup and download options'
  FROM homebrew_section_items i
  JOIN homebrew_entries e ON e.id = i.homebrew_entry_id
  WHERE i.href = 'https://www.dndbeyond.com/magic-items/11103877-thematic-accompaniment'

  UNION ALL

  SELECT
    e.id,
    i.id,
    'Amulet of the Night Avrae Automation',
    'Expand to view setup and download options'
  FROM homebrew_section_items i
  JOIN homebrew_entries e ON e.id = i.homebrew_entry_id
  WHERE i.href = 'https://www.dndbeyond.com/magic-items/9255554-amulet-of-the-night'
)
INSERT INTO homebrew_automation_entries (
  homebrew_entry_id,
  homebrew_section_item_id,
  anchor_mode,
  panel_title,
  panel_subtitle,
  sort_order
)
SELECT
  homebrew_entry_id,
  homebrew_section_item_id,
  'item',
  panel_title,
  panel_subtitle,
  0
FROM automation_rows;

WITH automation_lookup AS (
  SELECT id, panel_title
  FROM homebrew_automation_entries
  WHERE panel_title IN (
    'Heart of the Void Avrae Automation',
    'Thematic Accompaniment Avrae Automation',
    'Amulet of the Night Avrae Automation'
  )
)
INSERT INTO homebrew_automation_setup_commands (
  automation_entry_id,
  label,
  command,
  sort_order
)
SELECT
  al.id,
  'Required CC',
  '!cc create "Desecration" -min 0 -max 10 -reset short -resetto 0',
  0
FROM automation_lookup al
WHERE al.panel_title = 'Heart of the Void Avrae Automation';

WITH automation_lookup AS (
  SELECT id, panel_title
  FROM homebrew_automation_entries
  WHERE panel_title IN (
    'Heart of the Void Avrae Automation',
    'Thematic Accompaniment Avrae Automation',
    'Amulet of the Night Avrae Automation'
  )
)
INSERT INTO homebrew_automation_code_blocks (
  automation_entry_id,
  title,
  code,
  download_name,
  sort_order
)
SELECT al.id, code_block.title, code_block.code, code_block.download_name, code_block.sort_order
FROM automation_lookup al
JOIN LATERAL (
  SELECT *
  FROM (
    VALUES
      (
        'Heart of the Void Avrae Automation',
        'Heart of the Void',
        $heart$- name: Desecrated Form
  automation:
    - type: text
      text: >+
        Your body is no longer harmed by decay; it is sustained by it. You are
        immune to necrotic damage. Whenever a hostile creature or harmful effect
        would deal necrotic damage to you, the damage is negated and its corrupt
        energy seeps into your body. Each time this occurs, you gain one
        Desecration stack (maximum of 10). Each stack lasts for 1 minute. When
        you roll initiative, you lose all Desecration stacks.

    - type: counter
      counter: Desecration
      amount: "-1"
  _v: 2
  proper: false
- name: Ruinous Discharge
  automation:
    - type: counter
      counter: Desecration
      amount: "0"
    - type: variable
      name: e
      value: lastCounterUsedAmount*2
    - type: target
      target: all
      effects:
        - type: damage
          damage: "{e}d8"
          fixedValue: true
    - type: text
      text: >+
        When you hit a creature with an attack or spell, you may expend any number
        of Desecration stacks. The target takes an additional 2d8 necrotic
        damage per stack spent.

  _v: 2
  proper: false
- name: Profane Persistence
  automation:
    - type: text
      text: >+
        When you fail a Strength, Dexterity, or Constitution saving throw, you may
        expend 3 Desecration stacks to reroll the save with advantage.

    - type: counter
      counter: "Desecration "
      amount: "3"
  _v: 2
  proper: false
- name: Form of Carrion
  automation:
    - type: counter
      counter: "Desecration "
      amount: "5"
    - type: target
      target: self
      effects:
        - type: ieffect2
          name: For of Carrion
          duration: "10"
          effects:
            damage_bonus: 1d10[necrotic]
          buttons:
            - label: Murder
              automation:
                - type: counter
                  counter: "Desecration "
                  amount: "-1"
              style: "4"
    - type: text
      text: >
        As a bonus action, you may expend 5 Desecration stacks to awaken the decay
        within you for 1 minute. While in this state:


        - Your attacks deal an additional 1d10 necrotic damage.

        - A creature damaged by your necrotic damage cannot regain hit points until the start of your next turn.

        - Whenever you reduce a creature to 0 hit points, you gain one Desecration stack.
  _v: 2
  proper: false
- name: Whispers of the Void
  automation:
    - type: target
      target: self
      effects:
        - type: ieffect2
          name: Whispers 0 stacks
          buttons:
            - label: tier 1 whispers
              automation:
                - type: target
                  target: self
                  effects:
                    - type: ieffect2
                      name: Tier 1 whispers
                      effects:
                        to_hit_bonus: "1"
                        dc_bonus: "1"
                        damage_bonus: 2d6[psychic]+1
                      buttons:
                        - label: Tier 1 whisper ATTACK
                          automation:
                            - type: target
                              target: self
                              effects:
                                - type: damage
                                  damage: 5[psychic]
                                - type: ieffect2
                                  name: T1 whisper attack
                                  stacking: true
                                  target_self: true
                                  effects:
                                    max_hp_bonus: "-5"
                          style: "4"
                        - label: Increase Tier -> T2
                          automation:
                            - type: target
                              target: self
                              effects:
                                - type: ieffect2
                                  name: Tier 2 Whispers
                                  effects:
                                    to_hit_bonus: "1"
                                    damage_bonus: 2d6[psychic]+1
                                    dc_bonus: "1"
                                  buttons:
                                    - label: Tier 2 Whisper ATTACK
                                      automation:
                                        - type: target
                                          target: self
                                          effects:
                                            - type: damage
                                              damage: 10[psychic]
                                            - type: ieffect2
                                              name: T2 whisper attack
                                              effects:
                                                max_hp_bonus: "-5"
                                              stacking: true
                                      style: "4"
                                    - label: Increase Tier -> T3
                                      automation:
                                        - type: target
                                          target: self
                                          effects:
                                            - type: ieffect2
                                              name: Tier 3 Whispers
                                              effects:
                                                to_hit_bonus: "1"
                                                dc_bonus: "1"
                                                damage_bonus: 2d6[psychic]+1
                                                vulnerabilities:
                                                  - cold
                                                  - force
                                                  - psychic
                                              buttons:
                                                - label: Tier 3 whisper ATTACK
                                                  automation:
                                                    - type: target
                                                      target: self
                                                      effects:
                                                        - type: damage
                                                          damage: 15[psychic]
                                                        - type: ieffect2
                                                          name: T3 whisper attack
                                                          effects:
                                                            max_hp_bonus: "-10"
                                                          stacking: true
                                                  style: "1"
                                                - label: Increase Tier -> T4
                                                  automation:
                                                    - type: target
                                                      target: self
                                                      effects:
                                                        - type: ieffect2
                                                          name: Tier 4 whispers
                                                          effects:
                                                            damage_bonus: 2d6[psychic]
                                                          desc: At four stacks of Whispers, the Heart ceases to whisper and begins to
                                                            decide. You
                                                            immediately enter a
                                                            state of total
                                                            abandonment as its
                                                            will moves through
                                                            you. While at this
                                                            stack, you are under
                                                            the effects of the
                                                            haste spell
                                                            (requiring no
                                                            concentration), and
                                                            whenever you hit a
                                                            creature, the attack
                                                            instead deals an
                                                            additional 8d6
                                                            psychic damage. This
                                                            state lasts until
                                                            the end of your
                                                            turn. When it ends,
                                                            you are stunned
                                                            until the start of
                                                            your next turn, gain
                                                            two levels of
                                                            exhaustion, and your
                                                            Wh
                                                          buttons:
                                                            - label: Tier 4 whisper ATTACK
                                                              automation:
                                                                - type: target
                                                                  target: self
                                                                  effects:
                                                                    - type: damage
                                                                      damage: 20[psychic]
                                                                    - type: ieffect2
                                                                      name: T4 whisper attack
                                                                      stacking: true
                                                                      effects:
                                                                        max_hp_bonus: "-10"
                                                              style: "4"
                                                            - label: End of turn
                                                              automation:
                                                                - type: target
                                                                  target: self
                                                                  effects:
                                                                    - type: ieffect2
                                                                      name: "stunned "
                                                                      duration: "1"
                                                                    - type: counter
                                                                      counter: Exhaustion
                                                                      amount: "-2"
                                                              style: "1"
                                                  style: "1"
                                      style: "3"
                                  desc: >+
                                    At two stacks of Whispers, the world narrows to the immediate space around
                                    you as everything beyond fades into
                                    irrelevance. While at this stack, you are
                                    blinded and deafened beyond a range of 30
                                    feet. Your bonus increases to +2 to your
                                    spell save DC, attack rolls, and damage
                                    rolls, and whenever you hit a creature, the
                                    attack instead deals an additional 4d6
                                    psychic damage.

                          style: "3"
                      desc: >+
                        At one stack of Whispers, faint murmurs brush against your thoughts,
                        subtly guiding your hand. While at this stack, you gain
                        a +1 bonus to your spell save DC, attack rolls, and
                        damage rolls, and whenever you hit a creature, the
                        attack deals an additional 2d6 psychic damage.

              style: "1"
    - type: text
      text: >+
        The Heart does not speak in words. It presses gently against the edges of
        your mind, offering fragments of something vast and distant. Each time
        you listen, the pressure deepens. At the start of your turn, you may
        choose to invoke the Whispers of the Void, gaining one stack of
        Whispers, to a maximum of four stacks. You suffer the effects of your
        current Whispers stack and all lower stacks. While you have one or more
        stacks of Whispers, your Armor Class and all saving throws are reduced
        by an amount equal to your number of Whispers stacks.


        Whenever you attack a creature, you immediately take psychic damage equal to 5 Ã— your current Whispers stack. This psychic damage bypasses resistance and immunity. In addition, whenever you deal damage to a creature, your maximum hit points are reduced until the end of your next long rest; by 5 hit points while you have one or two stacks of Whispers, or by 10 hit points while you have three or four stacks. The Heart also demands violence to sustain its voice; if you do not attack or deal damage to at least one creature during your turn, you cannot gain additional Whispers stacks on your next turn.

  _v: 2
  proper: false$heart$,
        'heart-of-the-void.yaml',
        0
      ),
      (
        'Thematic Accompaniment Avrae Automation',
        'Thematic Accompaniment',
        $theme$_v: 2
name: Thematic Accompaniment
automation:
  - type: target
    target: self
    effects:
      - type: ieffect2
        name: Theme Song Running
        duration: "10"
        attacks:
          - attack:
              _v: 2
              name: Theme Song Power
              automation:
                - type: target
                  target: all
                  effects:
                    - type: ieffect2
                      name: Affected by Thematic Accompaniment
                      attacks: []
                      buttons:
                        - automation:
                            - type: target
                              target: self
                              effects:
                                - type: damage
                                  damage: -2d8[heal]
                                  overheal: false
                                  fixedValue: true
                            - type: text
                              text: >-
                                All affected creatures regain 1d4 hp at the start of their turn, in
                                addition to the previous effect. This increases
                                to 1d6 as a rare item, 1d8 as a very rare item,
                                and 2d8 as a legendary item.
                              title: Effect
                          label: Regenerate
                          style: "3"
                      end: false
                      conc: false
                      stacking: false
                      parent: p
                      target_self: false
                      tick_on_caster: false
                      effects:
                        check_bonus: "{ceil(constitutionMod/2)}"
                        save_bonus: "{ceil(constitutionMod/2)}"
              verb: spreads the
              proper: true
              activation_type: 2
          - attack:
              _v: 2
              name: Bolster
              automation:
                - type: target
                  target: all
                  effects:
                    - type: temphp
                      amount: "{level}"
                - type: text
                  text: >-
                    All affected creatures gain THP equal to the user's level at the start of
                    their turn.
                  title: Effect
              verb: uses
              activation_type: 2
        buttons: []
        end: false
        conc: false
        stacking: false
        save_as: p
        target_self: false
        tick_on_caster: false
  - type: text
    text: >-
      While your theme song is playing, creatures of your choice up to your
      proficiency bonus that can hear the song with 60 ft gain the following
      benefits, depending on the rarity of the item. If a creature can no longer
      hear the music, such as while being Unconscious or Deafened, they lose the
      benefits of the item until they are able to hear the music again.

      **Common:** All affected creatures gain THP equal to the user's level at the start of their turn.

      **Uncommon:** All affected creatures regain 1d4 hp at the start of their turn, in addition to the previous effect. This increases to 1d6 as a rare item, 1d8 as a very rare item, and 2d8 as a legendary item.

      **Rare:** All affected creatures can choose to gain advantage on one saving throw per round, as well as the previous effects.

      **Very Rare:** All affected creatures gain an additional action on each of their turn, as well as the previous effects. This action can be used to take the Dash, Disengage, Hide, or Utilize.

      **Legendary:** All affected creatures gain a bonus to your saving throws and ability checks equal to half the user's Constitution modifier rounded up, as well as the previous effects. This bonus cannot be used with a Paladin's aura, and you instead use the higher bonus.
    title: Effect
verb: uses
thumb: https://tenor.com/view/hakari-dance-hakari-jjk-gif-934314822346932465$theme$,
        'thematic-accompaniment.yaml',
        0
      ),
      (
        'Amulet of the Night Avrae Automation',
        'Amulet of the Night',
        $amulet$!a import name: Amulet of the Night
automation:
  - type: text
    text: >-
      **Mist of the Night**: Whenever you use your walking speed, you may
      instead teleport to your destination, assuming you can see it. This still
      uses up your walking move speed. You may arrive in a different position
      that you started in(example: you can teleport from prone into standing up,
      or from standing up to prone, without expending additional movement).

      **Scourge of the Living**: Whenever you hit an enemy with a melee attack, you regain hit points equal to your level.

      **Walker in the Dark**: You gain resistance to necrotic damage. If you already have necrotic resistance, you gain immunity instead. Regardless of whether you have resistance or immunity, you gain vulnerability to radiant damage.
    title: Effect
  - type: target
    target: self
    effects:
      - type: damage
        damage: -({level}) [heal]
        overheal: false
        fixedValue: true
_v: 2
activation_type: 2$amulet$,
        'amulet-of-the-night.txt',
        0
      )
  ) AS seed(panel_title, title, code, download_name, sort_order)
  WHERE seed.panel_title = al.panel_title
) code_block ON true;
