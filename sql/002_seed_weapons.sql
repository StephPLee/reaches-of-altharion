INSERT INTO homebrew_entries (
  section,
  title,
  slug,
  body_markdown,
  sort_order,
  is_published
)
VALUES
  ('weapons', 'Common Weapons', 'common-weapons', '', 10, true),
  ('weapons', 'Uncommon Weapons', 'uncommon-weapons', '', 20, true),
  ('weapons', 'Rare Weapons', 'rare-weapons', '', 30, true),
  ('weapons', 'Very Rare Weapons', 'very-rare-weapons', '', 40, true),
  ('weapons', 'Legendary Weapons', 'legendary-weapons', '', 50, true),
  ('weapons', 'Artifact Weapons', 'artifact-weapons', '', 60, true)
ON CONFLICT (slug) DO UPDATE
SET
  title = EXCLUDED.title,
  body_markdown = EXCLUDED.body_markdown,
  sort_order = EXCLUDED.sort_order,
  is_published = EXCLUDED.is_published,
  updated_at = NOW();

WITH source_items (entry_slug, label, href) AS (
  VALUES
    ('common-weapons', 'Heavy Whip - Common Whip', 'https://www.dndbeyond.com/magic-items/10673566-heavy-whip'),
    ('common-weapons', 'Long Whip - Common Whip', 'https://www.dndbeyond.com/magic-items/10673575-long-whip'),

    ('uncommon-weapons', 'Ashen Katana +1 - Uncommon Longsword', 'https://www.dndbeyond.com/magic-items/10894420-ashen-katana-1'),
    ('uncommon-weapons', 'Ashen Kunai +1 - Uncommon Dagger', 'https://www.dndbeyond.com/magic-items/10829979-ashen-kunai-1'),
    ('uncommon-weapons', 'Ashen Kusarigama +1 - Uncommon Whip', 'https://www.dndbeyond.com/magic-items/10840664-ashen-kusarigama-1'),
    ('uncommon-weapons', 'Ashen Naginata +1 - Uncommon Glaive', 'https://www.dndbeyond.com/magic-items/10894824-ashen-naginata-1'),
    ('uncommon-weapons', 'Ashen Odachi +1 - Uncommon Greatsword', 'https://www.dndbeyond.com/magic-items/10912977-ashen-odachi-1'),
    ('uncommon-weapons', 'Ashen Shuko +1 - Uncommon Hand Claws', 'https://www.dndbeyond.com/magic-items/11325367-ashen-shuko-1'),
    ('uncommon-weapons', 'Ashen Tanegashima +1 - Uncommon Sniper Rifle', 'https://www.dndbeyond.com/magic-items/10995603-ashen-tanegashima-1'),
    ('uncommon-weapons', 'Ashen Yumi +1 - Uncommon Longbow', 'https://www.dndbeyond.com/magic-items/10894905-ashen-yumi-1'),
    ('uncommon-weapons', 'Halberd of the Reforged Soul +1 - Uncommon Halberd', 'https://www.dndbeyond.com/magic-items/10781629-halberd-of-the-reforged-soul-stage-1'),

    ('rare-weapons', 'Ashen Katana +2 - Rare Longsword', 'https://www.dndbeyond.com/magic-items/10894421-ashen-katana-2'),
    ('rare-weapons', 'Ashen Kunai +2 - Rare Dagger', 'https://www.dndbeyond.com/magic-items/10830193-ashen-kunai-2'),
    ('rare-weapons', 'Ashen Kusarigama +2 - Rare Whip', 'https://www.dndbeyond.com/magic-items/10840719-ashen-kusarigama-2'),
    ('rare-weapons', 'Ashen Naginata +2 - Rare Glaive', 'https://www.dndbeyond.com/magic-items/10894825-ashen-naginata-2'),
    ('rare-weapons', 'Ashen Odachi +2 - Rare Greatsword', 'https://www.dndbeyond.com/magic-items/10912976-ashen-odachi-2'),
    ('rare-weapons', 'Ashen Shuko +2 - Rare Hand Claws', 'https://www.dndbeyond.com/magic-items/11325375-ashen-shuko-2'),
    ('rare-weapons', 'Ashen Tanegashima +2 - Rare Sniper Rifle', 'https://www.dndbeyond.com/magic-items/10995602-ashen-tanegashima-2'),
    ('rare-weapons', 'Ashen Yumi +2 - Rare Longbow', 'https://www.dndbeyond.com/magic-items/10894906-ashen-yumi-2'),
    ('rare-weapons', 'Halberd of the Reforged Soul +2 - Rare Halberd', 'https://www.dndbeyond.com/magic-items/10763549-halberd-of-the-reforged-soul-stage-2'),

    ('very-rare-weapons', 'Ashen Katana +3 - Very Rare Longsword', 'https://www.dndbeyond.com/magic-items/10894422-ashen-katana-3'),
    ('very-rare-weapons', 'Ashen Kunai +3 - Very Rare Dagger', 'https://www.dndbeyond.com/magic-items/10838579-ashen-kunai-3'),
    ('very-rare-weapons', 'Ashen Kusarigama +3 - Very Rare Whip', 'https://www.dndbeyond.com/magic-items/10840721-ashen-kusarigama-3'),
    ('very-rare-weapons', 'Ashen Naginata +3 - Very Rare Glaive', 'https://www.dndbeyond.com/magic-items/10894826-ashen-naginata-3'),
    ('very-rare-weapons', 'Ashen Odachi +3 - Very Rare Greatsword', 'https://www.dndbeyond.com/magic-items/10917568-ashen-odachi-3'),
    ('very-rare-weapons', 'Ashen Shuko +3 - Very Rare Hand Claws', 'https://www.dndbeyond.com/magic-items/11325376-ashen-shuko-3'),
    ('very-rare-weapons', 'Ashen Tanegashima +3 - Very Rare Sniper Rifle', 'https://www.dndbeyond.com/magic-items/10995604-ashen-tanegashima-3'),
    ('very-rare-weapons', 'Ashen Yumi +3 - Very Rare Longbow', 'https://www.dndbeyond.com/magic-items/10894909-ashen-yumi-3'),
    ('very-rare-weapons', 'Crucible Blade - Very Rare Longsword', 'https://www.dndbeyond.com/magic-items/11079808-crucible-blade'),
    ('very-rare-weapons', 'Halberd of the Reforged Soul +3 - Very Rare Halberd', 'https://www.dndbeyond.com/magic-items/10763512-halberd-of-the-reforged-soul-stage-3'),
    ('very-rare-weapons', 'Storm''s Wrath Maul - Very Rare Wrath Maul', 'https://www.dndbeyond.com/magic-items/11140483-storms-wrath-maul'),

    ('legendary-weapons', 'Ashrender, Odachi of the Ashen Veil - Legendary Greatsword', 'https://www.dndbeyond.com/magic-items/10917570-ashrender-odachi-of-the-ashen-veil'),
    ('legendary-weapons', 'Beckoning Death - Legendary Dagger', 'https://www.dndbeyond.com/magic-items/9021467-beckoning-death'),
    ('legendary-weapons', 'Blade of the Veil, Katana of the Ashen Veil - Legendary Longsword', 'https://www.dndbeyond.com/magic-items/10894423-blade-of-the-fading-veil-katana-of-the-ashen-veil'),
    ('legendary-weapons', 'Crescent of Ash, Naginata of the Ashen Veil - Legendary Glaive', 'https://www.dndbeyond.com/magic-items/10894829-crescent-of-ash-naginata-of-the-ashen-veil'),
    ('legendary-weapons', 'Erevale’s Final Mercy - Legendary Sniper Rifle', 'https://www.dndbeyond.com/magic-items/10808600-erevales-final-mercy'),
    ('legendary-weapons', 'Gaze of the Veil, Tanegashima of the Ashen Veil - Legendary Sniper Rifle', 'https://www.dndbeyond.com/magic-items/10995605-gaze-of-the-veil-tanegashima-of-the-ashen-veil'),
    ('legendary-weapons', 'Grasp of Ash, Shuko of the Ashen Veil - Legendary Hand Claws', 'https://www.dndbeyond.com/magic-items/11325377-grasp-of-ash-shuko-of-the-ashen-veil'),
    ('legendary-weapons', 'Relithia''s Justice - Legendary Crossbow, Hand', 'https://www.dndbeyond.com/magic-items/10782693-relithias-justice'),
    ('legendary-weapons', 'Shadowcoil, Kusarigama of the Ashen Veil - Legendary Whip', 'https://www.dndbeyond.com/magic-items/10840722-shadowcoil-kusarigama-of-the-ashen-veil'),
    ('legendary-weapons', 'Shadowsight, Yumi of the Ashen Veil - Legendary Longbow', 'https://www.dndbeyond.com/magic-items/10894910-shadowsight-yumi-of-the-ashen-veil'),
    ('legendary-weapons', 'Veilpiercer, Kunai of the Ashen Veil - Legendary Dagger', 'https://www.dndbeyond.com/magic-items/10830663-veilpiercer-kunai-of-the-ashen-veil'),

    ('artifact-weapons', 'Akirou''s Quiet Reproach - Artifact Greatsword', 'https://www.dndbeyond.com/magic-items/10994019-akirous-quiet-reproach'),
    ('artifact-weapons', 'Grief-Taker, The Edge of the Bound Martyr', 'https://www.dndbeyond.com/magic-items/11333779-grief-taker-the-edge-of-the-bound-martyr')
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

WITH weapon_automation_targets AS (
  SELECT i.id AS item_id
  FROM homebrew_section_items i
  WHERE i.href IN (
    'https://www.dndbeyond.com/magic-items/11333779-grief-taker-the-edge-of-the-bound-martyr',
    'https://www.dndbeyond.com/magic-items/11325377-grasp-of-ash-shuko-of-the-ashen-veil',
    'https://www.dndbeyond.com/magic-items/10894826-ashen-naginata-3',
    'https://www.dndbeyond.com/magic-items/11079808-crucible-blade'
  )
)
DELETE FROM homebrew_automation_entries
WHERE homebrew_section_item_id IN (SELECT item_id FROM weapon_automation_targets);

WITH automation_rows AS (
  SELECT
    e.id AS homebrew_entry_id,
    i.id AS homebrew_section_item_id,
    'Grief Taker Avrae Automation'::text AS panel_title,
    'Expand to view setup and download options'::text AS panel_subtitle
  FROM homebrew_section_items i
  JOIN homebrew_entries e ON e.id = i.homebrew_entry_id
  WHERE i.href = 'https://www.dndbeyond.com/magic-items/11333779-grief-taker-the-edge-of-the-bound-martyr'

  UNION ALL

  SELECT
    e.id,
    i.id,
    'Grasp of Ash Avrae Automation',
    'Expand to view setup and download options'
  FROM homebrew_section_items i
  JOIN homebrew_entries e ON e.id = i.homebrew_entry_id
  WHERE i.href = 'https://www.dndbeyond.com/magic-items/11325377-grasp-of-ash-shuko-of-the-ashen-veil'

  UNION ALL

  SELECT
    e.id,
    i.id,
    'Ashen Naginata +3 Avrae Automation',
    'Expand to view setup and download options'
  FROM homebrew_section_items i
  JOIN homebrew_entries e ON e.id = i.homebrew_entry_id
  WHERE i.href = 'https://www.dndbeyond.com/magic-items/10894826-ashen-naginata-3'

  UNION ALL

  SELECT
    e.id,
    i.id,
    'Crucible Blade Avrae Automation',
    'Expand to view setup and download options'
  FROM homebrew_section_items i
  JOIN homebrew_entries e ON e.id = i.homebrew_entry_id
  WHERE i.href = 'https://www.dndbeyond.com/magic-items/11079808-crucible-blade'
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
    'Grief Taker Avrae Automation',
    'Grasp of Ash Avrae Automation',
    'Ashen Naginata +3 Avrae Automation',
    'Crucible Blade Avrae Automation'
  )
)
INSERT INTO homebrew_automation_setup_commands (
  automation_entry_id,
  label,
  command,
  sort_order
)
SELECT al.id, setup.label, setup.command, setup.sort_order
FROM automation_lookup al
JOIN LATERAL (
  SELECT *
  FROM (
    VALUES
      ('Grief Taker Avrae Automation', 'Required CC', '!cc create "burden" -min 0 -max 10 -reset short -resetto 0', 0),

      ('Grasp of Ash Avrae Automation', 'Required CC', '!cc create "Elemental Burden" -min 0 -max {proficiencyBonus} -reset long -desc "When you hit a creature with these claws, you can cause the strike to leave behind volatile elemental wounds that continue to ravage the target. The target takes an extra 3d8 damage of the claw''s current elemental type, and unstable elemental energy clings to the injury. At the start of each of the target''s turns for the next 1 minute, it takes 2d8 damage of the claw''s current elemental type. A creature can end this effect early by using its action to attempt to purge the lingering energy, making a Constitution saving throw against your feature save DC (8 + your attack modifier with this weapon). On a success, the effect ends.\n\nYou can use this feature a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."', 0),
      ('Grasp of Ash Avrae Automation', 'Required CC', '!cc create "Devouring Onslaught" -min 0 -max 1 -reset short -desc "When you take the Attack action on your turn, you can choose to fight with reckless ferocity until the start of your next turn. When you do so:\n\n- Attack rolls made with these claws have advantage.\n- Each hit with the claws deals an extra 2d8 damage of the claw''s current elemental type.\n- Attack rolls against you have advantage until the start of your next turn.\n- If you reduce a creature to 0 hit points while this feature is active, the claws drink in the fading essence, and the next hit you make before the end of your turn deals an additional 5d8 damage of the claw''s current elemental type.\n\nOnce you use this feature, you can''t use it again until you finish a short or long rest."', 1),
      ('Grasp of Ash Avrae Automation', 'Required Snippet', '!snippet don -d1 5d8[acid] -f "Devouring Onslaught| If you reduce a creature to 0 hit points while this feature is active, the claws drink in the fading essence, and the next hit you make before the end of your turn deals an additional 5d8 damage of the claw''s current elemental type."', 2),

      ('Ashen Naginata +3 Avrae Automation', 'Required CC', '!cc create "Naginata Special Opp Attack" -min 0 -max {proficiencyBonus} -reset long -type hex -desc "When you make an attack of opportunity, you can make two attacks instead of one. You can use this property a number of times equal to your proficiency bonus, you regain all uses of this ability on a long rest."', 0),
      ('Ashen Naginata +3 Avrae Automation', 'Required CC', '!cc create "Elemental Sweep" -min 0 -max 1 -reset long -type hex -desc "When you take the Attack action, you can forgo your other attacks to make a single sweeping strike imbued with the naginataâ€™s elemental power. All creatures of your choice within your reach must make a Dexterity saving throw (DC = 8 + your proficiency bonus + your Strength or Dexterity modifier). On a failed save, a creature takes 5d10 damage of the polearm''s current elemental type. On a successful save, it takes half as much damage. Once you use this feature, you canâ€™t use it again until you finish a long rest."', 1)
  ) AS seed(panel_title, label, command, sort_order)
  WHERE seed.panel_title = al.panel_title
) setup ON true;

WITH automation_lookup AS (
  SELECT id, panel_title
  FROM homebrew_automation_entries
  WHERE panel_title IN (
    'Grief Taker Avrae Automation',
    'Grasp of Ash Avrae Automation',
    'Ashen Naginata +3 Avrae Automation',
    'Crucible Blade Avrae Automation'
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
        'Grief Taker Avrae Automation',
        'Grief-Taker',
        $grief$- _v: 2
  name: Grief-taker
  automation:
    - type: target
      target: self
      effects:
        - type: condition
          condition: target.hp <= (target.max_hp)/2
          onTrue:
            - type: variable
              name: blood
              value: "1"
          onFalse:
            - type: variable
              name: blood
              value: "0"
    - type: target
      target: all
      effects:
        - type: counter
          counter: burden
          amount: "0"
        - type: variable
          name: BoL
          value: lastCounterRemaining*(1+blood)
        - type: attack
          hit:
            - type: damage
              damage: 1d12+{strengthMod}+3[slashing]+{BoL}[necrotic]
            - type: counter
              counter: burden
              amount: "-1"
          miss: []
          attackBonus: strengthMod+proficiencyBonus+3
    - type: text
      text: >-
        The head of this axe is forged from dark iron shot through with thin
        crystalline veins, the colour of dried blood. Its blade is broad and
        brutal, yet strangely elegant, as though shaped with care rather than
        rage. The haft is wrapped in worn leather stitched with silver thread,
        polished smooth by centuries of hands that carried burdens heavier than
        the weapon itself. Creatures struck by the blade sometimes claim they
        felt something impossible in that moment; Not hatred nor cruelty, but
        the quiet certainty that their suffering had been taken into the weapon
        and made into strength.


        You gain a +3 bonus to attack and damage rolls made with this weapon. Grief-Taker also has the Reach property
      title: Grief taker
    - type: text
      text: >-
        Grief-Taker gathers fragments of suffering called Burden. You gain 1
        Burden whenever one of the following occurs:


        - You hit a creature with this weapon.

        - You take damage from a creature within 15 feet of you.

        - A creature within 15 feet of you fails a saving throw against one of your abilities.


        You can hold a maximum of 10 Burden.

        Burden lasts for 1 minute. For each stack of Burden you have, your attacks deal +1 necrotic damage. If you are bloodied at the start of your turn, this bonus damage is doubled.
      title: Burden of the Living
  proper: false
- _v: 2
  name: grief hurt
  automation:
    - type: counter
      counter: burden
      amount: "-1"
    - type: text
      text: You gain 1 burden when you take damage from a creature within 15 ft of you
  proper: false
- _v: 2
  name: grief save
  automation:
    - type: counter
      counter: burden
      amount: "-1"
  proper: false
- _v: 2
  name: Weight of suffering
  automation:
    - type: counter
      counter: burden
      amount: "0"
    - type: target
      target: all
      effects:
        - type: damage
          damage: "{lastCounterUsedAmount}d6[necrotic]"
    - type: text
      text: >-
        When you hit a creature with this weapon, you can expend any number of
        Burden to unleash the pain the weapon has gathered. For each Burden
        spent:


        - The attack deals an extra 1d6 necrotic damage.

        - The target must succeed on a Constitution saving throw (DC = 10 + your proficiency bonus + your Constitution modifier) or suffer one of the following effects of your choice:


        - **Broken Guard.** The creatureâ€™s defences collapse under the weight of the blow. Its Armor Class is reduced by 2 until the start of your next turn.

        - **Blood Mark.** The creature is marked by the weaponâ€™s hunger. The next time it suffers damage before your next turn, it takes an additional 2d8 necrotic damage.

        - **Sundered Vitality.** The weapon drains the creatureâ€™s life force. Until the start of your next turn, the creature cannot regain hit points, and whenever it deals damage before then, it takes necrotic damage equal to your Constitution modifier.
      title: Weight of Suffering
  proper: false
- _v: 2
  name: Broken guard
  automation:
    - type: target
      target: all
      effects:
        - type: save
          stat: con
          fail:
            - type: ieffect2
              name: Broken guard
              duration: "2"
              effects:
                ac_bonus: "-2"
              end: true
              desc: The creatureâ€™s defences collapse under the weight of the blow. Its Armor
                Class is reduced by 2 until the start of your next turn.
              tick_on_caster: true
          success: []
          dc: 10+proficiencyBonus+constitutionMod
  proper: false
- _v: 2
  name: Blood mark
  automation:
    - type: target
      target: all
      effects:
        - type: save
          stat: con
          fail:
            - type: ieffect2
              name: Blood mark
              duration: "2"
              end: true
              desc: The creature is marked by the weaponâ€™s hunger. The next time it suffers
                damage before your next turn, it takes an additional 2d8
                necrotic damage.
              tick_on_caster: true
          success: []
          dc: 10+proficiencyBonus+constitutionMod
  proper: false
- _v: 2
  name: Sundered vitality
  automation:
    - type: target
      target: all
      effects:
        - type: save
          stat: con
          fail:
            - type: ieffect2
              name: Sundered vitality
              duration: "2"
              effects:
                ac_bonus: "-2"
              end: true
              desc: The weapon drains the creatureâ€™s life force. Until the start of your next
                turn, the creature cannot regain hit points, and whenever it
                deals damage before then, it takes necrotic damage equal to your
                Constitution modifier.
              tick_on_caster: true
          success: []
          dc: 10+proficiencyBonus+constitutionMod
  proper: false
- _v: 2
  name: Martyr's exchange
  automation:
    - type: target
      target: self
      effects:
        - type: roll
          dice: 1d10+{constitutionMod}
          name: Martyr's exchange
  proper: false
- _v: 2
  name: Claim the oppressor
  automation:
    - type: counter
      counter: burden
      amount: "3"
    - type: target
      target: all
      effects:
        - type: ieffect2
          name: Claim the oppressor
          duration: "2"
          end: true
          tick_on_caster: true
    - type: text
      text: >-
        As a bonus action, you may expend 3 Burden to bind a creature you can see
        within 30 feet. Until the end of your next turn:

        â€¢ It has a disadvantage on attacks against creatures other than you

        â€¢ When it damages a creature other than you, it takes 2d8 necrotic damage

        â€¢ If it attempts to teleport or to leave its current plane by any means, it takes 4d6 necrotic damage and must make a Wisdom saving throw (DC = 10 + your proficiency bonus + your Constitution modifier). On a failure, the attempt to teleport or leave the plane fails.
      title: Claim the oppressor
  proper: false
- _v: 2
  name: Judgement of the enduring
  automation:
    - type: counter
      counter: burden
      amount: "5"
    - type: target
      target: self
      effects:
        - type: ieffect2
          name: Judgmento of the enduring
          duration: "2"
          attacks:
            - attack:
                _v: 2
                name: Enduring attack
                automation:
                  - type: target
                    target: self
                    effects:
                      - type: condition
                        condition: target.hp <= (target.max_hp)/2
                        onTrue:
                          - type: variable
                            name: blood
                            value: "1"
                        onFalse:
                          - type: variable
                            name: blood
                            value: "0"
                  - type: target
                    target: all
                    effects:
                      - type: counter
                        counter: burden
                        amount: "0"
                      - type: variable
                        name: BoL
                        value: lastCounterRemaining*(1+blood)
                      - type: attack
                        hit:
                          - type: damage
                            damage: 1d12+{strengthMod}+3[slashing]+{BoL}+2d10[necrotic]
                          - type: counter
                            counter: burden
                            amount: "-1"
                        miss: []
                        attackBonus: strengthMod+proficiencyBonus+3
                  - type: target
                    target: self
                    effects:
                      - type: temphp
                        amount: "{lastDamage}+{target.temp_hp}"
          end: false
  proper: false
- _v: 2
  name: Last witness
  automation:
    - type: counter
      counter: burden
      amount: "-3"
    - type: text
      text: If a creature within 10 feet of you is reduced to 0 hit points, you may
        use your reaction to gather its fading suffering. You gain 3 Burden and
        may immediately move 10 feet without provoking opportunity attacks and
        make one attack with this weapon against a creature within your reach.
      title: The Last Witness
  proper: false$grief$,
        'grief-taker.yaml',
        0
      ),
      (
        'Grasp of Ash Avrae Automation',
        'Grasp of Ash',
        $grasp$name: Devouring Onslaught
automation:
  - type: target
    target: self
    effects:
      - type: ieffect2
        name: Reckless Onslaught
        duration: "2"
        tick_on_caster: true
        effects:
          damage_bonus: 2d8[acid]
          attack_advantage: "1"
  - type: text
    text: >-
      When you take the Attack action on your turn, you can choose to fight with
      reckless ferocity until the start of your next turn. When you do so:

      - Attack rolls made with these claws have advantage.
      - Each hit with these claws deals an extra 2d8 damage of the claw's current
        elemental type.
      - Attack rolls against you have advantage until the start of your next
        turn.
      - If you reduce a creature to 0 hit points while this feature is active,
        the claws drink in the fading essence, and the next hit you make before
        the end of your turn deals an additional 5d8 damage of the claw's
        current elemental type.

      Once you use this feature, you can't use it again until you finish a
      short or long rest.
  - type: counter
    counter: Devouring Onslaught
    amount: "1"
    fixedValue: true
_v: 2
proper: false
activation_type: 8

- name: Elemental Burden
automation:
  - type: target
    target: all
    effects:
      - type: damage
        damage: 3d8[acid]
      - type: ieffect2
        name: Corrosive Burden
        buttons:
          - label: Start of Turn Elemental Burden Damage
            automation:
              - type: target
                target: self
                effects:
                  - type: damage
                    damage: 2d8[acid]
                    fixedValue: true
                  - type: text
                    text: >-
                      At the start of each of the target's turns for the next
                      1 minute, it takes 2d8 damage of the claw's current
                      elemental type. A creature can end this effect early by
                      using its action to attempt to purge the lingering energy,
                      making a Constitution saving throw against your feature
                      save DC (8 + your attack modifier with this weapon). On a
                      success, the effect ends.
            verb: is burdened by acid
            style: "4"
          - label: Purges the Burden
            automation:
              - type: target
                target: self
                effects:
                  - type: save
                    stat: con
                    fail: []
                    success:
                      - type: remove_ieffect
                    dc: 8 + dexterityMod + proficiencyBonus + 3
            verb: attempts to purge the Elemental Burden
            style: "1"
        duration: "10"
  - type: text
    text: >-
      When you hit a creature with these claws, you can cause the strike to
      leave behind volatile elemental wounds that continue to ravage the target.
      The target takes an extra 3d8 damage of the claw's current elemental
      type, and unstable elemental energy clings to the injury. At the start of
      each of the target's turns for the next 1 minute, it takes 2d8 damage of
      the claw's current elemental type. A creature can end this effect early
      by using its action to attempt to purge the lingering energy, making a
      Constitution saving throw against your feature save DC (8 + your attack
      modifier with this weapon). On a success, the effect ends.

      You can use this feature a number of times equal to your proficiency
      bonus, and you regain all expended uses when you finish a long rest.
  - type: counter
    counter: Elemental Burden
    amount: "1"
    fixedValue: true
_v: 2
proper: true
verb: inflicts an
activation_type: 2$grasp$,
        'grasp-of-ash.yaml',
        0
      ),
      (
        'Ashen Naginata +3 Avrae Automation',
        'Elemental Sweep',
        $naginata$!a import name: Elemental Sweep
automation:
  - type: roll
    dice: 5d10
    name: dmg
    displayName: Elemental Sweep Damage
    fixedValue: true
  - type: target
    target: all
    effects:
      - type: save
        stat: dex
        fail:
          - type: damage
            damage: "{dmg}[lightning]"
            fixedValue: true
        success:
          - type: damage
            damage: "{dmg}/2[lightning]"
            fixedValue: true
        dc: 8 + proficiencyBonus + dexterityMod
      - type: text
        text: >-
          When you take the Attack action, you can forgo your other attacks to make
          a single sweeping strike imbued with the naginataâ€™s elemental power.
          All creatures of your choice within your reach must make a Dexterity
          saving throw (DC = 8 + your proficiency bonus + your Strength or
          Dexterity modifier). On a failed save, a creature takes 5d10 damage of
          the polearm's current elemental type. On a successful save, it takes
          half as much damage. Once you use this feature, you canâ€™t use it again
          until you finish a long rest.
      - type: counter
        counter: Elemental Sweep
        amount: "1"
        fixedValue: true
_v: 2
proper: false
verb: forgoes attacks to lash out with$naginata$,
        'ashen-naginata-plus-3.txt',
        0
      ),
      (
        'Crucible Blade Avrae Automation',
        'Crucible Blade',
        $crucible$name: Crucible Blade
automation:
  - type: target
    target: all
    effects:
      - type: attack
        hit:
          - type: damage
            damage: 1d8+{max(strengthMod, dexterityMod)}+1[magical slashing]+2d8[radiant]
        miss: []
        attackBonus: max(strengthMod, dexterityMod) + proficiencyBonus + 1
  - type: target
    target: self
    effects:
      - type: damage
        damage: 1d6[radiant]
        fixedValue: true
  - type: text
    text: >-
      A single edged, slightly curved blade with a small, round handguard. The
      handle appears wrapped in worn gold that merges with the handguard and
      continues up around the blade like ribbons, though this doesn't seem to
      impede the cutting ability of the blade. Celestial energy flows weakly but
      freely through the gold, dealing an extra 2d8 radiant damage per hit, and
      1d6 radiant damage to the wielder. While attuned to this weapon, you also
      know Celestial in addition to any other language(s) you know.

      This weapon has the finesse property.

      You have a +1 to attack and damage rolls made with this weapon.
_v: 2
proper: false

- name: "Crucible Blade: Sunbreaker"
automation:
  - type: counter
    counter: Crucible Blade
    amount: ""
    errorBehaviour: ignore
  - type: variable
    name: n
    value: lastCounterUsedAmount
    onError: "0"
  - type: target
    target: all
    effects:
      - type: damage
        damage: "{n}d8[radiant]"
        fixedValue: true
  - type: text
    text: >-
      When you have two or more charges of Suncatcher, you can expend charges to
      deal extra radiant damage to a creature you hit with the Crucible Blade.
      For each charge of Suncatcher expended, the target creature takes an extra
      1d8 radiant damage.
_v: 2
proper: true
verb: uses$crucible$,
        'crucible-blade.yaml',
        0
      )
  ) AS seed(panel_title, title, code, download_name, sort_order)
  WHERE seed.panel_title = al.panel_title
) code_block ON true;
