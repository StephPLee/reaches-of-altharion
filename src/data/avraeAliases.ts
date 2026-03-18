export const heartOfVoidCounterCommand =
  '!cc create "Desecration" -min 0 -max 10 -reset short -resetto 0';

export const griefTakerCounterCommand =
  '!cc create "burden" -min 0 -max 10 -reset short -resetto 0';

export type HomebrewAutomationEntry = {
  id: string;
  href?: string;
  linkText?: string;
  headingSelector?: string;
  headingText?: string;
  title: string;
  code: string;
  codeBlocks?: Array<{
    title: string;
    code: string;
    downloadName: string;
  }>;
  counterCommand?: string;
  setupCommands?: Array<{
    command: string;
    label?: string;
  }>;
  downloadName: string;
};

export const heartOfVoidAlias = `- name: Desecrated Form
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


        Whenever you attack a creature, you immediately take psychic damage equal to 5 × your current Whispers stack. This psychic damage bypasses resistance and immunity. In addition, whenever you deal damage to a creature, your maximum hit points are reduced until the end of your next long rest; by 5 hit points while you have one or two stacks of Whispers, or by 10 hit points while you have three or four stacks. The Heart also demands violence to sustain its voice; if you do not attack or deal damage to at least one creature during your turn, you cannot gain additional Whispers stacks on your next turn.

  _v: 2
  proper: false`;

export const griefTakerAlias = `- _v: 2
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


        - **Broken Guard.** The creature’s defences collapse under the weight of the blow. Its Armor Class is reduced by 2 until the start of your next turn.

        - **Blood Mark.** The creature is marked by the weapon’s hunger. The next time it suffers damage before your next turn, it takes an additional 2d8 necrotic damage.

        - **Sundered Vitality.** The weapon drains the creature’s life force. Until the start of your next turn, the creature cannot regain hit points, and whenever it deals damage before then, it takes necrotic damage equal to your Constitution modifier.
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
              desc: The creature’s defences collapse under the weight of the blow. Its Armor
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
              desc: The creature is marked by the weapon’s hunger. The next time it suffers
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
              desc: The weapon drains the creature’s life force. Until the start of your next
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

        • It has a disadvantage on attacks against creatures other than you

        • When it damages a creature other than you, it takes 2d8 necrotic damage

        • If it attempts to teleport or to leave its current plane by any means, it takes 4d6 necrotic damage and must make a Wisdom saving throw (DC = 10 + your proficiency bonus + your Constitution modifier). On a failure, the attempt to teleport or leave the plane fails.
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
  proper: false`;

export const graspOfAshCommands = [
  {
    command:
      '!cc create "Elemental Burden" -min 0 -max {proficiencyBonus} -reset long -desc "When you hit a creature with these claws, you can cause the strike to leave behind volatile elemental wounds that continue to ravage the target. The target takes an extra 3d8 damage of the claw\'s current elemental type, and unstable elemental energy clings to the injury. At the start of each of the target\'s turns for the next 1 minute, it takes 2d8 damage of the claw\'s current elemental type. A creature can end this effect early by using its action to attempt to purge the lingering energy, making a Constitution saving throw against your feature save DC (8 + your attack modifier with this weapon). On a success, the effect ends.\n\nYou can use this feature a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."',
    label: "Required CC",
  },
  {
    command:
      '!cc create "Devouring Onslaught" -min 0 -max 1 -reset short -desc "When you take the Attack action on your turn, you can choose to fight with reckless ferocity until the start of your next turn. When you do so:\n\n- Attack rolls made with these claws have advantage.\n- Each hit with the claws deals an extra 2d8 damage of the claw\'s current elemental type.\n- Attack rolls against you have advantage until the start of your next turn.\n- If you reduce a creature to 0 hit points while this feature is active, the claws drink in the fading essence, and the next hit you make before the end of your turn deals an additional 5d8 damage of the claw\'s current elemental type.\n\nOnce you use this feature, you can\'t use it again until you finish a short or long rest."',
    label: "Required CC",
  },
  {
    command:
      '!snippet don -d1 5d8[acid] -f "Devouring Onslaught| If you reduce a creature to 0 hit points while this feature is active, the claws drink in the fading essence, and the next hit you make before the end of your turn deals an additional 5d8 damage of the claw\'s current elemental type."',
    label: "Required Snippet",
  },
];

export const graspOfAshAlias = `name: Devouring Onslaught
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
activation_type: 2`;

export const psionophageCommands = [
  {
    command: "!snippet blud -dtype pyschic>bludgeoning",
    label: "Required Snippet",
  },
  {
    command: "!snippet pier -dtype pyschic>piercing",
    label: "Required Snippet",
  },
  {
    command: "!snippet slash -dtype pyschic>slashing",
    label: "Required Snippet",
  },
  {
    command: "!snippet psyblud -dtype bludgeoning>psychic",
    label: "Required Snippet",
  },
  {
    command: "!snippet psypier -dtype piercing>psychic",
    label: "Required Snippet",
  },
];

export const psionophageAlias = `name: Psychic Erosion
automation:
  - type: target
    target: all
    effects:
      - type: ieffect2
        name: Eroded Psyche
        duration: "10"
        effects:
          to_hit_bonus: "-1"
          save_bonus: "-1"
          check_bonus: "-1"
        stacking: true
  - type: text
    text: >-
      Once per turn, when you deal psychic damage to a creature, you can erode
      its mind, imposing a -1 penalty to its attack rolls, saving throws, and
      ability checks for 1 minute.

      This penalty stacks with itself, up to a maximum of -5. If the creature
      is affected by multiple instances of this effect, the duration resets to
      1 minute each time the penalty increases.
_v: 2
proper: true
verb: causes
activation_type: 8

- name: Shattered Focus
automation:
  - type: target
    target: all
    effects:
      - type: damage
        damage: 8d10[psychic]
        fixedValue: true
  - type: text
    text: >-
      Once per turn, when a creature affected by your Psychic Erosion fails an
      attack roll, saving throw, or ability check, it takes 8d10 psychic
      damage.
_v: 2
proper: true
verb: causes
activation_type: 8`;

export const firebrandAlias = `!a import name: Firebrand Detonation
automation:
  - type: counter
    counter: dummy
    amount: "1"
    errorBehaviour: ignore
  - type: variable
    name: dice
    value: lastCounterRequestedAmount * 8
  - type: roll
    dice: "{{dice}}d6mi3"
    name: damage
  - type: target
    target: all
    effects:
      - type: damage
        damage: "{{damage}}[fey flame]"
  - type: text
    text: >-
      When you deal fire damage to a creature, you can mark it (no action
      required). A creature can be marked this way only once per turn. The next
      time you deal fire damage to a marked creature, the mark detonates,
      dealing 8d6 fire damage to the marked creature and every creature within
      20 feet of it. A creature can be affected by only one detonation per turn,
      and a mark cannot detonate on the same turn it is applied.
  - type: target
    target: self
    effects:
      - type: damage
        damage: -{{damage}}[healing]
_v: 2
verb: sets off
proper: false`;

export const edictOfMercyAndRuinCommands = [
  {
    command:
      '!snippet judgement -d 2d10[radiant] -f "Judgement Infusion|At the start of your turn while the storm is active, you can choose to forgo calling down bolts. Until the end of your turn, whenever you hit with an attack, you can choose for the attack to deal an additional 2d10 radiant damage, or deal no damage and instead restore 4d10 hit points to the target."',
    label: "Required Snippet",
  },
];

export const edictOfMercyAndRuinCodeBlocks = [
  {
    title: "Divine Storm - Ruin",
    code: `!a import name: Divine Storm - Ruin
automation:
  - type: target
    target: all
    effects:
      - type: damage
        damage: 10d10[radiant]
  - type: text
    text: >-
      As an action, you summon a storm of divine energy centered on you that
      moves with you and extends 120 feet in all directions. When the storm
      appears, and at the start of each of your turns, you can call down bolts
      of divine energy on any number of creatures within the storm. Each bolt
      either restores 5d10 hit points or deals 10d10 radiant damage, your choice
      for each creature. This storm is a magical effect treated as a 9th-level
      spell for the purpose of dispelling.
    title: ""
_v: 2
proper: false`,
    downloadName: "divine-storm-ruin.txt",
  },
  {
    title: "Divine Storm - Mercy",
    code: `!a import name: Divine Storm - Mercy
automation:
  - type: target
    target: all
    effects:
      - type: damage
        damage: -5d10[healing]
        overheal: null
  - type: text
    text: >-
      As an action, you summon a storm of divine energy centered on you that
      moves with you and extends 120 feet in all directions. When the storm
      appears, and at the start of each of your turns, you can call down bolts
      of divine energy on any number of creatures within the storm. Each bolt
      either restores 5d10 hit points or deals 10d10 radiant damage, your choice
      for each creature. This storm is a magical effect treated as a 9th-level
      spell for the purpose of dispelling.
    title: Effect
_v: 2
proper: false`,
    downloadName: "divine-storm-mercy.txt",
  },
];

export const thematicAccompanimentAlias = `_v: 2
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
thumb: https://tenor.com/view/hakari-dance-hakari-jjk-gif-934314822346932465`;

export const sanguineBoostAlias = `!a import _v: 2
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
activation_type: 2`;

export const healOthersAlias = `!a import name: Heal Others
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
phrase: '"My life for yours, a fair trade, wouldn''t you say? We can discuss payment later~"'`;

export const sanguineRegenerationAlias = `!a import _v: 2
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
activation_type: 2`;

export const sanguineRegenerationRemarkableRecoveryAlias = `name: Sanguine Regeneration
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
activation_type: 2`;

export const verminKinCommands = [
  {
    command:
      '!snippet pp -d1 {{proficiencyBonus}}[poison] -f "Potent Poisons|Once per turn when the Plague-Master deals poison damage they can add their proficiency bonus to the damage as poison damage."',
    label: "Required Snippet",
  },
  {
    command:
      '!cc "Scatter!" -min 0 -max 1 -reset "long" -dispType "hex" -desc "You can use your bonus action to disengage and dash. You can do this once per long rest."',
    label: "Required CC",
  },
];

export const warriorOfTheForgottenPastAlias = `- _v: 2
  name: Forgotten Trickster
  automation:
    - type: text
      text: >-
        Once per turn, you can replace an attack with a persuading comment, as you
        manifest the Forgotten tricksters teaching, the creature you're targeting
        must make a wisdom saving throw, on a success the creature is unfazed by
        your distraction, if the creature fails it is successfully distracted,
        causing you to gain advantage on checks using the influence action for 1
        minute or until you attempt to attack the creature, and advantage on your
        attack rolls against the creature until the start of the creatures next
        turn, you can do this once per long rest for free after that you must use
        1 focus point to activate it
      title: Effect
    - type: counter
      counter: Forgotten Trickster
      amount: "1"
      allowOverflow: false
      errorBehaviour: ignore
      fixedValue: true
    - type: condition
      condition: (lastCounterUsedAmount == 1)
      onTrue: []
      onFalse:
        - type: counter
          counter: Focus Points
          amount: "1"
          allowOverflow: false
          errorBehaviour: warn
          fixedValue: true
      errorBehaviour: "false"
    - type: condition
      condition: ("love" in choice)
      onTrue:
        - type: variable
          name: condur
          value: "2"
        - type: variable
          name: conatk
          value: "2"
      onFalse:
        - type: variable
          name: condur
          value: "10"
        - type: variable
          name: conatk
          value: "1"
      errorBehaviour: "false"
    - type: target
      target: all
      effects:
        - type: save
          stat: wis
          fail:
            - type: ieffect2
              name: Distracted (Checks)
              duration: condur
              attacks: []
              buttons:
                - automation:
                    - type: remove_ieffect
                  label: Undistracted
                  style: "1"
              end: false
              conc: false
              desc: Checks {caster.name} makes towards {target.name} with the influence action
                is done with advantage.
              stacking: false
              target_self: false
              tick_on_caster: false
            - type: ieffect2
              name: Distracted (Attacks)
              duration: conatk
              attacks: []
              buttons: []
              end: false
              conc: false
              desc: "{caster.name} has advantage on attack rolls against {target.name}"
              stacking: false
              target_self: false
              tick_on_caster: false
          success: []
          dc: 8+wisdomMod+proficiencyBonus
  verb: uses
  proper: true

- _v: 2
  name: Forgotten Tech
  automation:
    - type: condition
      condition: ("micro" in choice)
      onTrue:
        - type: text
          text: >-
            When you activate patient defense or step of the wind target a creature
            within 60 feet of you, that creature gains the Defensive Microbots,
            whenever they get hit by an attack you can acitvate deflect attacks
            for the creature as your reaction, when deflecting in this way instead
            of using focus to be able to redirect if reduced to 0, you can use one
            focus point to increase the amount of damage reduction by one roll of
            your martial arts die, only one creature can be under the effect of
            Defensive Microbots at a time and they last for 1 minute
          title: Defensive Microbots
        - type: target
          target: all
          effects:
            - type: ieffect2
              name: Defensive Microbots
              duration: "10"
              desc: "{caster.name} can use Deflect Attack to protect you!"
        - type: target
          target: self
          effects:
            - type: ieffect2
              name: Microbots
              duration: "10"
              attacks:
                - attack:
                    _v: 2
                    name: Microbot Deflection
                    automation:
                      - type: text
                        text: >-
                          You can acitvate deflect attacks for the creature as your reaction, when
                          deflecting in this way instead of using focus to be able
                          to redirect if reduced to 0, you can use one focus point
                          to increase the amount of damage reduction by one roll
                          of your martial arts die, only one creature can be under
                          the effect of Defensive Microbots at a time and they
                          last for 1 minute
                      - type: counter
                        counter: Focus Points
                        amount: "0"
                      - type: condition
                        condition: (lastCounterUsedAmount == 0)
                        onTrue:
                          - type: roll
                            dice: 1d10+{dexterityMod}+{monkLevel}
                            name: Reduction
                        onFalse:
                          - type: roll
                            dice: 1d10+{dexterityMod}+{monkLevel}+1d{6+2*((monkLevel+1)//6)}
                            name: Reduction
                    verb: uses
                    activation_type: 4
      onFalse:
        - type: condition
          condition: ("diablo" in choice)
          onTrue:
            - type: text
              text: >-
                As an action you can spend up to 5 focus points to call down an orbital
                strike centered at a point you choose within 120 feet, at the end
                of your next turn the GromNuke lands and has a radius of 30 feet
                and does 3 rolls of your martial art die in force damage for every
                focus point expended,
              title: Diablo Strike
            - type: counter
              counter: Focus Points
              amount: "0"
            - type: condition
              condition: (lastCounterUsedAmount == 0)
              onTrue:
                - type: text
                  text: >-
                    Whoops it had no effect! To use this action you must do \`!a "Forgotten
                    Tech" -choice diablo -amt #\` where # is your choice of 1-5
              onFalse:
                - type: target
                  target: self
                  effects:
                    - type: ieffect2
                      name: Nuke Falling
                      attacks:
                        - attack:
                            _v: 2
                            name: Nuke Lands
                            automation:
                              - type: remove_ieffect
                              - type: counter
                                counter: Jdhdhdsv
                                amount: "0"
                                errorBehaviour: ignore
                              - type: condition
                                condition: ("love" in choice)
                                onTrue:
                                  - type: variable
                                    name: dmgamt
                                    value: "5"
                                onFalse:
                                  - type: variable
                                    name: dmgamt
                                    value: "3"
                              - type: roll
                                dice: "{dmgamt*lastCounterRequestedAmount}d6+2*((monkLevel+1)//8)"
                                name: Damage
                              - type: target
                                target: all
                                effects:
                                  - type: damage
                                    damage: "{lastRoll}[force]"
                            verb: the
                            proper: true
                            activation_type: 2
          onFalse:
            - type: condition
              condition: ("supply" in choice)
              onTrue:
                - type: text
                  text: >-
                    As a action you can call in a supply drop 5 feet infront of you, the
                    supply drops contains a variety of healing remedies, the
                    remedies potency last for 1 minute before they become non
                    magical,you can do this once per long rest for free and then
                    it costs 6 focus points any time afterwards.

                    The supply drop lasts for 1 minute. When you drop the supply
                    drop, you can choose any number of creatures. Those creatures
                    can go next to the supply drop and use a bonus action to use
                    part of it. Any creature can only do this once. Using part of
                    the supply drop restores hit points to a creature equal to 3
                    rolls of your martial arts die + three times your WIS
                    modifier, recharges one spell slot of the creature(up to a
                    level equal to your PB) and grants advantage on the next
                    attack roll or saving throw that the creature makes.
                  title: Resupply Beacon
                - type: counter
                  counter: Resupply Beacon
                  amount: "1"
                  errorBehaviour: ignore
                - type: condition
                  condition: (lastCounterUsedAmount == 1)
                  onTrue: []
                  onFalse:
                    - type: counter
                      counter: Focus Points
                      amount: "6"
                - type: target
                  target: self
                  effects:
                    - type: ieffect2
                      name: Supply Beacon
                      duration: "10"
                      attacks:
                        - attack:
                            _v: 2
                            name: Supplies
                            automation:
                              - type: text
                                text: >-
                                  Using part of the supply drop restores hit points to a creature equal
                                  to 3 rolls of your martial arts die + three times
                                  your WIS modifier, recharges one spell slot of
                                  the creature(up to a level equal to your PB) and
                                  grants advantage on the next attack roll or
                                  saving throw that the creature makes.
                              - type: condition
                                condition: ("love" in choice)
                                onTrue:
                                  - type: variable
                                    name: healamt
                                    value: "5"
                                onFalse:
                                  - type: variable
                                    name: healamt
                                    value: "3"
                              - type: target
                                target: all
                                effects:
                                  - type: damage
                                    damage: -{healamt}d{6+2*((monkLevel+1)//8)}-{wisdomMod*3}[heal]
                                    fixedValue: true
                            verb: uses
                            proper: true
                            activation_type: 2
              onFalse:
                - type: text
                  text: >-
                    Whoops no effect! To use this action you must do \`!a "Forgotten Tech"
                    -choice name\` where name is instead one of the below options

                    micro for Defensive Microbots \`!a "Forgotten Tech" -choice micro\`

                    diablo for Diablo Strike \`!a "Forgotten Tech" -choice diablo -amt 1\`
                    use -amt # to decide how many Focus Points to use

                    supply for Resupply Beacon \`!a "Forgotten Tech" -choice supply\`
    verb: uses
    proper: true
    activation_type: 8

- _v: 2
  name: Forgotten Love
  automation:
    - type: text
      text: >-
        In your past you were in love with someone, they were your anchor point,
        and you were their's, every moment you shared together was special but one
        moment always stood out.

        As a bonus action you can spend 2 focus points to conjure up an illusion
        of that one special moment, be it the beach, a lake, or a mountain
        resort, this is an emanation with a radius of 120 feet

        While inside of the emmanation at the start of your turn you can cause of
        one of these effect to occur

        While in the emmanation you become fully lucid of your past, and as your
        remember both the good and bad moments you gain the following effects

        When activated Forgotten Shadows emmanation also activates with no cost,
        but instead of the emmanation being its regular radius, it is instead the
        radius of Forgotten love

        Your monk dc increases by 3 and when an enemy fails against forgotten
        trickster it lasts for 2 rounds instead and your allies also gain
        advantage

        You heal 10 hp at the start of your turn if your not at 0 hp as your love
        manifests and treats your wounds

        When diablo strike is used instead of being a radius it affects all
        creatures inside of the emmanation of your choice and does 5 martial arts
        die per focus point used instead of 3 as a guardian angel protects your
        allies

        Defensive microbots becomes a free action which can be used once per round
        instead of a Reaction

        Supply beacon heals 5 rolls of your martial art die instead of 3

        This aura lasts until the start of your next turn. At that point you can
        expend 2 focus points to extend its duration by 1 round.
    - type: target
      target: self
      effects:
        - type: ieffect2
          name: Forgotten Love
          desc: ""
          save_as: aura
          attacks:
            - attack:
                _v: 2
                name: Spread Illusion
                automation:
                  - type: target
                    target: each
                    effects:
                      - type: ieffect2
                        name: In the Illusion
                        duration: ieffect.remaining
                        desc: Lasts while within 120 feet of {{caster.name}}
                        parent: ieffect
                        buttons:
                          - label: Leave Illusion
                            automation:
                              - type: remove_ieffect
                            verb: leaves the range of the Aura
                            style: "4"
                verb: begins to
                proper: true
            - attack:
                _v: 2
                name: Loss
                automation:
                  - type: text
                    text: >-
                      3 creatures of your choice inside of the emanation feel the heartbreak of
                      losing their closest love, they must roll a wisdom saving
                      throw, on a success, whenever they roll a wisdom or charisma
                      saving throw they must roll a d4 and subtract it from the
                      result until the start of your next turn, additionally they
                      cant be targetted by Loss for 24 hours, on a failure the
                      creature is full heart broken and can't act, until the start
                      of your next turn it has the stunned condition
                  - type: target
                    target: all
                    effects:
                      - type: save
                        stat: wis
                        fail:
                          - type: ieffect2
                            name: "Loss: Stunned"
                            duration: "1"
                            tick_on_caster: true
                        success:
                          - type: ieffect2
                            name: "Loss: Reduction"
                            tick_on_caster: true
                            duration: "1"
                        dc: 8+wisdomMod+proficiencyBonus+3
                proper: true
                activation_type: 2
            - attack:
                _v: 2
                name: Love
                automation:
                  - type: text
                    text: >-
                      3 creatures of your choice inside of the emanation feel the joy of love,
                      they become bolder and feel like they can go through
                      anything, until the start of your next turn they are immune
                      to charm effects, gain a d4 bonus to saving throws and
                      attack rolls, and gain temporary hp equal to 2 rolls of your
                      martial art die.
                  - type: target
                    target: all
                    effects:
                      - type: ieffect2
                        name: Love
                        duration: "1"
                        tick_on_caster: true
                        effects:
                          save_bonus: 1d4
                          to_hit_bonus: 1d4
                          immunities:
                            - Charmed
                      - type: temphp
                        amount: 2d{6+2*((monkLevel+1)//6)}
                proper: true
                activation_type: 2
          buttons:
            - label: "Forgotten Love: Upkeep"
              automation:
                - type: counter
                  counter: Focus Points
                  amount: "2"
              style: "1"
            - label: "Forgotten Love: Start of Turn"
              automation:
                - type: target
                  target: self
                  effects:
                    - type: damage
                      damage: "-10"
                      fixedValue: true
              style: "1"
            - label: "Forgotten Love: End"
              automation:
                - type: remove_ieffect
              style: "1"
    - type: target
      target: each
      effects:
        - type: ieffect2
          name: In the Illusion
          desc: Lasts while within 120 feet of {{caster.name}}
          parent: aura
          buttons:
            - label: Leave Illusion
              automation:
                - type: remove_ieffect
              verb: leaves the range of the Aura
              style: "4"
    - type: counter
      counter: Focus Points
      amount: "2"
  verb: uses
  proper: true
  activation_type: 3

- name: Forgotten Shadow
  automation:
    - type: text
      text: >-
        In your past you encountered a figure who always loomed in the shadows and
        took his time to strike until the right moment,

        As an action you can expend 1-3 focus points to make a emanation surround
        you, the size of the emanation is equal to 10*focus points expended and
        lasts for 1 minute

        All creatures and objects inside of the emanation are considered lightly
        obscured to all creatures except you.

        Whenever you make an unarmed strike of weapon attack you can target
        anyone inside of the emanation instead of a creature within range

        At the end of your turn if you haven't landed a critical hit you gain a
        focused shadow stack, for every focused shadow stack you have your crit
        range for unarmed strikes or melee monk weapons increases by 1 (does not
        stack with other subclass features such as champion fighter)

        When you land a critical hit, you consume all of your Focused shadow
        stacks, empowering yourself. At the start of your next turn, you gain a
        "Focused Shadow" effect for every stack you had, which lasts until the end
        of your turn. This effect increases your crit range for monk weapons
        attack and unarmed strikes by 1 and makes your unarmed and monk weapon
        attacks do an additional 1d4 extra damage for every stack.
      title: Effect
    - type: condition
      condition: ("ignorethis" in choice)
      onTrue: []
      onFalse:
        - type: target
          target: self
          effects:
            - type: ieffect2
              name: Forgotten Shadow
              duration: "10"
              effects: null
              attacks:
                - attack:
                    name: Spread Shadow
                    automation:
                      - type: target
                        target: each
                        effects:
                          - type: ieffect2
                            name: In the Shadow
                            duration: ieffect.remaining
                            effects: null
                            attacks: []
                            buttons:
                              - label: Leave Aura
                                automation:
                                  - type: remove_ieffect
                                verb: leaves the range of the Aura
                                style: "4"
                            end: false
                            conc: false
                            desc: null
                            stacking: false
                            save_as: null
                            parent: ieffect
                            target_self: false
                            tick_on_caster: false
                          - type: text
                            text: >-
                              All creatures and objects inside of the emanation are considered lightly
                              obscured to all creatures except you.

                              Whenever you make an unarmed strike of weapon attack you can target anyone inside of the emanation instead of a creature within range
                            title: Effect
                    _v: 2
                    proper: true
                    verb: begins to
                    activation_type: 2
                - attack:
                    name: Shadow's Critical
                    automation:
                      - type: text
                        text: >-
                          When you land a critical hit, you consume all of your Focused shadow
                          stacks, empowering yourself. At the start of your next
                          turn, you gain a "Focused Shadow" effect for every stack
                          you had, which lasts until the end of your turn. This
                          effect increases your crit range for monk weapons attack
                          and unarmed strikes by 1 and makes your unarmed and monk
                          weapon attacks do an additional 1d4 extra damage for
                          every stack.
                        title: Effect
                      - type: counter
                        counter: Focused Shadow
                        amount: "0"
                        allowOverflow: false
                        errorBehaviour: warn
                        fixedValue: true
                      - type: variable
                        name: applebees
                        value: lastCounterRemaining
                      - type: counter
                        counter: Focused Shadow
                        amount: "{applebees}"
                        allowOverflow: false
                        errorBehaviour: warn
                      - type: target
                        target: self
                        effects:
                          - type: ieffect2
                            name: Focused Shadow x{lastCounterUsedAmount}
                            duration: "2"
                            effects:
                              damage_bonus: "{lastCounterUsedAmount}d4"
                            attacks: []
                            buttons: []
                            end: true
                            conc: false
                            desc: Your Crit Range and damage rolls for Monk Weapons and Unarmed Strikes are
                              increased by {lastCounterUsedAmount} and
                              {lastCounterUsedAmount}d4
                            stacking: false
                            save_as: null
                            parent: null
                            target_self: false
                            tick_on_caster: false
                    _v: 2
                    proper: true
                    activation_type: 2
              buttons:
                - label: "End of Turn: No Criticals"
                  automation:
                    - type: text
                      text: >-
                        At the end of your turn if you haven't landed a critical hit you gain a
                        focused shadow stack, for every focused shadow stack you
                        have your crit range for unarmed strikes or melee monk
                        weapons increases by 1 (does not stack with other subclass
                        features such as champion fighter)
                      title: Effect
                    - type: counter
                      counter: Focused Shadow
                      amount: "-1"
                      allowOverflow: false
                      errorBehaviour: warn
                      fixedValue: true
                    - type: text
                      text: >-
                        Your Crit Range for Monk Weapons and Unarmed Strikes is increased by a
                        total of {lastCounterRemaining}
                      title: Effect
                  style: "1"
              end: false
              conc: false
              desc: Affects allies within 30 feet of you
              stacking: false
              save_as: aura
              parent: null
              target_self: false
              tick_on_caster: false
        - type: target
          target: each
          effects:
            - type: ieffect2
              name: In the Aura
              duration: "10"
              effects: null
              attacks: []
              buttons:
                - label: Leave Shadow
                  automation:
                    - type: remove_ieffect
                  verb: leaves the range of the Aura
                  style: "4"
              end: false
              conc: false
              desc: null
              stacking: false
              save_as: null
              parent: aura
              target_self: false
              tick_on_caster: false
      errorBehaviour: "false"
  _v: 2
  verb: uses
  activation_type: 2`;

export const hemophageCommands = [
  {
    command: '!cc create "Blood Pool" -min 0 -max {FighterLevel*10}',
    label: "Required CC",
  },
];

export const arcaneAscendencyCommands = [
  {
    command:
      '!snippet aa {{pb=proficiencyBonus}} -dc +{{pb//2}} -f "Arcane Ascendancy|If you have the Spellcasting or Pact Magic feature, your spell save DC increases by half your proficiency bonus (rounded down)."',
    label: "Required Snippet",
  },
];

export const edgeOfConquestCommands = [
  {
    command:
      '!snippet eoc {{pb = proficiencyBonus//2}} -b {{pb}} -d {{pb}} -f "Edge of Conquest|Whenever you make an attack roll, you can choose to add a bonus to the attack and damage roll of that attack. This bonus equal half your proficiency bonus (rounded down)."',
    label: "Required Snippet",
  },
];

export const edgeOfConquestAlias = `!a import name: Edge of Conquest
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
_v: 2`;

export const ashenNaginataPlus3Commands = [
  {
    command:
      '!cc create "Naginata Special Opp Attack" -min 0 -max {proficiencyBonus} -reset long -type hex -desc "When you make an attack of opportunity, you can make two attacks instead of one. You can use this property a number of times equal to your proficiency bonus, you regain all uses of this ability on a long rest."',
    label: "Required CC",
  },
  {
    command:
      '!cc create "Elemental Sweep" -min 0 -max 1 -reset long -type hex -desc "When you take the Attack action, you can forgo your other attacks to make a single sweeping strike imbued with the naginata’s elemental power. All creatures of your choice within your reach must make a Dexterity saving throw (DC = 8 + your proficiency bonus + your Strength or Dexterity modifier). On a failed save, a creature takes 5d10 damage of the polearm\'s current elemental type. On a successful save, it takes half as much damage. Once you use this feature, you can’t use it again until you finish a long rest."',
    label: "Required CC",
  },
];

export const ashenNaginataPlus3Alias = `!a import name: Elemental Sweep
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
          a single sweeping strike imbued with the naginata’s elemental power.
          All creatures of your choice within your reach must make a Dexterity
          saving throw (DC = 8 + your proficiency bonus + your Strength or
          Dexterity modifier). On a failed save, a creature takes 5d10 damage of
          the polearm's current elemental type. On a successful save, it takes
          half as much damage. Once you use this feature, you can’t use it again
          until you finish a long rest.
      - type: counter
        counter: Elemental Sweep
        amount: "1"
        fixedValue: true
_v: 2
proper: false
verb: forgoes attacks to lash out with`;

export const giantDomainCommands = [
  {
    command:
      '!cc create "Stone Shield" -min 0 -max 2*{proficiencyBonus} -reset long',
    label: "Required CC",
  },
  {
    command:
      '!cc create "Runic Riposte" -min 0 -max {proficiencyBonus} -reset short',
    label: "Required CC",
  },
];

export const giantDomainCodeBlocks = [
  {
    title: "Stone Shield",
    code: `name: Stone Shield
automation:
  - type: target
    target: self
    effects:
      - type: counter
        counter: Stone Shield
        amount: ""
        errorBehaviour: ignore
      - type: damage
        damage: -{lastCounterUsedAmount}
        fixedValue: true
  - type: text
    text: >-
      The shield has a pool of hit points separate from your own, equal to your
      shield's total AC bonus × your proficiency bonus. If you would take
      damage, the shield’s hit points are reduced first. The shield’s hit points
      are restored to full when you finish a long rest.
_v: 2
proper: true
verb: uses`,
    downloadName: "stone-shield.yaml",
  },
  {
    title: "Runic Riposte",
    code: `name: Runic Riposte
automation:
  - type: condition
    condition: ClericLevel >= 18
    onTrue:
      - type: variable
        name: d
        value: "4"
    onFalse:
      - type: condition
        condition: ClericLevel >= 13
        onTrue:
          - type: variable
            name: d
            value: "3"
        onFalse:
          - type: condition
            condition: ClericLevel >= 7
            onTrue:
              - type: variable
                name: d
                value: "2"
            onFalse:
              - type: variable
                name: d
                value: "1"
  - type: counter
    counter: Runic Riposte
    amount: "1"
    fixedValue: true
  - type: roll
    dice: "{d}d8+{wisdomMod}"
    name: dmg
    fixedValue: true
    displayName: Damage
  - type: target
    target: all
    effects:
      - type: save
        stat: dex
        fail:
          - type: damage
            damage: "{dmg}[force]"
            fixedValue: true
        success:
          - type: damage
            damage: "{dmg/2}[force]"
            fixedValue: true
        dc: caster.spellbook.dc
  - type: text
    text: >-
      When a creature within 10 feet of you damages you while you are wielding
      your Stone Shield, you can use your reaction to release a burst of runic
      force. The attacker must make a Dexterity saving throw against your spell
      save DC. On a failed save, the creature takes 1d8 force damage + your
      Wisdom modifier. On a successful save, the creature takes half as much
      damage.

      The damage increases to 2d8 at 7th level, 3d8 at 13th level, and 4d8 at 18th level. You can use this feature a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a short or long rest.
_v: 2
proper: true
verb: uses`,
    downloadName: "runic-riposte.yaml",
  },
  {
    title: "Channel Divinity: Stone Hearted Shield Wall",
    code: `_v: 2
name: "Channel Divinity: Stone Hearted Shield Wall"
automation:
  - type: counter
    counter: Channel Divinity
    amount: "1"
    fixedValue: true
  - type: target
    target: all
    effects:
      - type: ieffect2
        name: Stone Hearted Shield Wall
        duration: "2"
        effects:
          to_hit_bonus: "2"
        tick_on_caster: true
  - type: text
    text: >-
      Starting at 3rd level, you can use your Channel Divinity to fortify your
      allies with giant-born resilience. As an action, you present your Stone
      Shield and invoke its runes, granting the following benefits to you and
      all allies within 10 feet of you until the start of your next turn:

      - A +2 bonus to attack rolls

      - Whenever a creature makes an attack roll against you, the attacker subtracts 1d4 from the attack roll.
verb: uses
proper: true`,
    downloadName: "channel-divinity-stone-hearted-shield-wall.yaml",
  },
];

export const mistbloomCommands = [
  {
    command:
      '!cc create "Mistbloom Technique" -min 0 -max {{FighterLevel+proficiencyBonus}} -reset long -desc "You can use these techniques a number of times equal to your fighter level + your proficiency bonus, and you regain all expended uses after finishing a long rest and half when taking a short rest(rounded up)."',
    label: "Required CC",
  },
  {
    command: `!snippet mst {{mistbloom = character().levels.get('Fighter')}}
{{dice = ((mistbloom>=7)+(mistbloom>=11)+(mistbloom>=15))}}
{{dmg = max(1, wisdomMod)}}
{{args=argparse(&ARGS&)}}
{{multi=int(args.get('rr')[0]) if args.get('rr') else 1}}
-adv {{f''' -d "{dice}d6+{dmg}" ''' if dice else f''' -d "{dmg}" '''}}
{{pc.mod_cc("Mistbloom Technique", -multi, True) if (cc := (pc := character()).cc("Mistbloom Technique")).value > cc.min else err("No more Techniques uses left!")}} -f "Mistbloom Technique|{{pc.cc_str("Mistbloom Technique")}} (-{multi})"
-f "Mistveil Strike|Before making an attack roll, you can envelop your weapon with mist and petals by expending 1 use of your Mistbloom Technique, granting advantage on the attack roll. If the attack hits, it deals **{{f' {dice}d6+{dmg}' if dice else f' {dmg}'}}** additional damage."`,
    label: "Required Snippet",
  },
  {
    command:
      '!cc create "Unnatural Mist" -min 0 -max 1 -type bubble -reset short -desc "As an action, you can create an area of mist and petals in a sphere that emanates from you. The sphere is centered on you, has a 15-foot radius, and moves with you. It lasts for 1 minute or until you are incapacitated or die. You act as if you are concentrating on a spell while the mist is active. Whenever you and friendly creatures within the mist are healed, the healing heals additional hit points equal to your wisdom modifier (minimum of 1). This healing increases by 1d6 at 11th level in this class(1d6+Wis Mod), 15th level (2d6+Wis Mod), and 18th level (3d6+Wis Mod)."',
    label: "Required CC",
  },
  {
    command:
      '!cc create "Blessing of Mist and Petals" -min 0 -max 1 -type bubble -reset short -desc "As an action on your turn, choose up to two creatures within 60 feet of you.\n\nSupported by the petals, these creatures gain a number of temporary hit points equal to your fighter level plus your wisdom modifier (minimum of 1) and gain advantage on saving throws and attack rolls while they have these hit points. You can target one additional creature when you reach 15th level in this class (up to three creatures) and another upon reaching 20th level (up to four creatures)."',
    label: "Required CC",
  },
  {
    command:
      '!cc create "Misty Flourish" -min 0 -max 1 -type bubble -reset short -desc "After using your Action Surge feature, you can teleport up to 30 feet to an unoccupied space you can see and your weapon attacks deal additional force damage equal to your wisdom modifier (minimum of 1) until the end of your next turn, as your weapon is infused with ethereal energy."',
    label: "Required CC",
  },
  {
    command:
      '!cc edit "Unnatural Mist" -max 3 -desc "As an action, you can create an area of mist and petals in a sphere that emanates from you. The sphere is centered on you, has a 30-foot radius, and moves with you. It lasts for 1 minute or until you are incapacitated or die. You act as if you are concentrating on a spell while the mist is active. Whenever you and friendly creatures within the mist are healed, the healing heals additional hit points equal to your wisdom modifier (minimum of 1). This healing increases by 1d6 at 11th level in this class(1d6+Wis Mod), 15th level (2d6+Wis Mod), and 18th level (3d6+Wis Mod)."',
    label: "Level 18 CC Update",
  },
  {
    command:
      '!cc edit "Blessing of Mist and Petals" -max 3 -desc "As an action on your turn, choose up to two creatures within 60 feet of you.\n\nSupported by the petals, these creatures gain a number of temporary hit points equal to your fighter level plus your wisdom modifier (minimum of 1) and gain advantage on saving throws and attack rolls and gains the effects of half cover while they have these hit points. You can target one additional creature when you reach 15th level in this class (up to three creatures) and another upon reaching 20th level (up to four creatures)."',
    label: "Level 18 CC Update",
  },
  {
    command:
      '!cc edit "Misty Flourish" -min 0 -max 3 -type bubble -reset short -desc "After using your Action Surge feature, you can teleport up to 30 feet to an unoccupied space you can see and your weapon attacks deal additional force damage equal to your wisdom modifier (minimum of 1) until the end of your next turn, as your weapon is infused with ethereal energy."',
    label: "Level 18 CC Update",
  },
];

export const mistbloomCodeBlocks = [
  {
    title: "Veil of Petals",
    code: `name: Veil of Petals
automation:
  - type: counter
    counter: smth
    amount: "0"
    allowOverflow: false
    errorBehaviour: ignore
  - type: variable
    name: amt
    value: lastCounterRequestedAmount
  - type: condition
    condition: amt > 0
    onTrue:
      - type: target
        target: all
        effects:
          - type: damage
            damage: -({{FighterLevel}}+{{max(1, wisdomMod)}})[heal]
            overheal: false
          - type: ieffect2
            name: Veil of Petals
            duration: "2"
            effects: null
            attacks: []
            buttons: []
            end: true
            conc: false
            desc: You have advantage on saving throws against being charmed and frightened
              until the end of {{caster.name}}'s turn.
            stacking: false
            save_as: null
            parent: null
            target_self: false
            tick_on_caster: true
    onFalse:
      - type: text
        text: "Use \`-amt #\` to specify how many charges is used."
        title: No value inputted!
    errorBehaviour: "false"
  - type: text
    text: >-
      As a bonus action, you can conjure a flurry of flower petals that swirl
      centered on you in a 10-foot radius. Creatures of your choice within this
      radius is healed by a number of hit points equal to your fighter level
      plus your Wisdom Modifier (minimum of 1) and they have advantage on saving
      throws against being charmed and frightened until the end of your next
      turn. For every two creatures chosen, you expend one use of Mistbloom
      Techniques.
    title: Effect
  - type: counter
    counter: Mistbloom Technique
    amount: int(amt)
    allowOverflow: false
    errorBehaviour: raise
_v: 2
verb: conjures
activation_type: 3`,
    downloadName: "veil-of-petals.yaml",
  },
  {
    title: "Petal Shield",
    code: `name: Petal Shield
automation:
  - type: variable
    name: shield
    value: max(1, wisdomMod)
  - type: target
    target: all
    effects:
      - type: ieffect2
        name: Petal Shield
        duration: "1"
        effects:
          ac_bonus: int(shield)
        attacks: []
        buttons: []
        end: false
        conc: false
        desc: You have a +{{shield}} bonus to your AC until the start of your next turn.
        stacking: false
        save_as: null
        parent: null
        target_self: false
        tick_on_caster: false
  - type: text
    text: As a reaction when you or a creature within **{{"30" if FighterLevel>=18
      else "10"}}** feet of you is hit by an attack, you can expend 2 uses of
      your Mistbloom Techniques to conjure a shield of swirling petals. Until
      the start of the target's next turn, they have a bonus to AC equal to your
      Wisdom Modifier(minimum of 1), including against the triggering attack.
    title: Effect
  - type: counter
    counter: Mistbloom Technique
    amount: "2"
    allowOverflow: false
    errorBehaviour: raise
    fixedValue: true
_v: 2
verb: conjures
activation_type: 4`,
    downloadName: "petal-shield.yaml",
  },
  {
    title: "Unnatural Mist",
    code: `name: Unnatural Mist
automation:
  - type: variable
    name: mistbloom
    value: caster.levels.get('Fighter')
  - type: variable
    name: dice
    value: ((mistbloom>=11)+(mistbloom>=15)+(mistbloom>=18))
  - type: variable
    name: heal
    value: max(1, wisdomMod)
  - type: target
    target: self
    effects:
      - type: ieffect2
        name: Unnatural Mist
        conc: true
        duration: "10"
        attacks:
          - attack:
              _v: 2
              name: Unnatural Mist Bonus Healing
              automation:
                - type: variable
                  name: mistbloom
                  value: caster.levels.get('Fighter')
                - type: variable
                  name: dice
                  value: ((mistbloom>=11)+(mistbloom>=15)+(mistbloom>=18))
                - type: variable
                  name: heal
                  value: max(1, wisdomMod)
                - type: condition
                  condition: int(dice) == 0
                  onTrue:
                    - type: target
                      target: all
                      effects:
                        - type: damage
                          damage: -({{heal}})[magical heal]
                  onFalse:
                    - type: target
                      target: all
                      effects:
                        - type: damage
                          damage: -({{dice}}d6+{{heal}})[magical heal]
                - type: text
                  text: While within the mist, you and friendly creatures heal an additional
                    **{{f''' {dice}d6+{heal} ''' if dice else f''' {heal}
                    '''}}** hit points per instance of healing.
              verb: gives
              activation_type: 2
  - type: text
    text: >-
      Starting at 7th level, you can conjure a swirling mist of blossoms to
      protect yourself and your allies. As an action, you can create a **{{"30"
      if mistbloom>=18 else "15"}}**-foot-radius sphere of mist at a location
      within 30 feet of you. This mist lasts 1 minute and you act as if you are
      concentrating on a spell while the mist is active. While within the mist,
      you and friendly creatures heal an additional **{{f''' {dice}d6+{heal} '''
      if dice else f''' {heal} '''}}** per instance of healing.

      {{"You can use this feature 3 times before a short or long rest." if mistbloom>=18 else "Once you use this feature, you can't use it again until you finish a short or long rest."}}
  - type: counter
    counter: Unnatural Mist
    amount: "1"
    fixedValue: true
    errorBehaviour: raise
_v: 2
proper: false
verb: conjures
activation_type: 1`,
    downloadName: "unnatural-mist.yaml",
  },
  {
    title: "Blessing of Mist and Petals",
    code: `name: Blessing of Mist and Petals
automation:
  - type: variable
    name: mistbloom
    value: caster.levels.get('Fighter')
  - type: variable
    name: number
    value: 2+((mistbloom>=15)+(mistbloom==20))
  - type: variable
    name: petal
    value: mistbloom+max(1, wisdomMod)
  - type: target
    target: all
    effects:
      - type: temphp
        amount: ({{petal}}, {{target.temp_hp}}[CURRENT THP])kh1
      - type: condition
        condition: mistbloom >= 18
        onTrue:
          - type: ieffect2
            name: Blessing of Mist and Petals
            effects:
              attack_advantage: "1"
              save_adv:
                - all
              ac_bonus: "2"
            desc: While you have the temporary hit points provided by this feature, you have
              advantage on your attack rolls and saving throws and gain the
              effects of half cover.
        onFalse:
          - type: ieffect2
            name: Blessing of Mist and Petals
            desc: While you have the temporary hit points provided by this feature, you have
              advantage on your attack rolls and saving throws.
            effects:
              attack_advantage: "1"
              save_adv:
                - all
  - type: text
    text: >-
      At 10th level, you have mastered the art of fusing your mist and the
      blossoms, allowing you to handle the energy of life. As an action on your
      turn, choose up to **{{number}}** creatures within 60 feet of you.

      Supported by the petals, these creatures gain **{{petal}}** temporary hit points and gain advantage on saving throws and attack rolls{{" and the effects of half cover" if mistbloom>=18 else ""}} while they have these hit points.

      {{"You can use this feature 3 times before a short or long rest." if mistbloom>=18 else "Once you use this feature, you can't use it again until you finish a short or long rest."}}
  - type: counter
    counter: Blessing of Mist and Petals
    amount: "1"
    fixedValue: true
    errorBehaviour: raise
_v: 2
proper: false
verb: grants
activation_type: 1`,
    downloadName: "blessing-of-mist-and-petals.yaml",
  },
  {
    title: "Misty Flourish",
    code: `name: Misty Flourish
automation:
  - type: variable
    name: mistbloom
    value: caster.levels.get('Fighter')
  - type: variable
    name: dmg
    value: max(1, wisdomMod)
  - type: target
    target: self
    effects:
      - type: ieffect2
        name: Misty Flourish
        duration: "2"
        effects:
          damage_bonus: "{{dmg}}[force]"
  - type: text
    text: >-
      Starting at 15th level, your mastery over mist and flowers allows you to
      perform unnatural feats on the battlefield. After using your Action Surge
      feature, you can teleport up to 30 feet to an unoccupied space you can see
      and your weapon attacks deal **{{dmg}}** additional force damage until the
      end of your next turn, as your weapon is infused with ethereal energy.

      {{"You can use this feature 3 times before a short or long rest." if mistbloom>=18 else "Once you use this feature, you can't use it again until you finish a short or long rest."}}
  - type: counter
    counter: Misty Flourish
    amount: "1"
    fixedValue: true
    errorBehaviour: raise
_v: 2
proper: false
activation_type: 2`,
    downloadName: "misty-flourish.yaml",
  },
];

export const kitsuneAlias = `!a import _v: 2
name: Fox Fire
automation:
  - type: spell
    id: 2618858
  - type: counter
    counter: "Fox Fire: Faerie Fire"
    amount: "1"
    fixedValue: true
  - type: text
    text: >-
      Kitsunes are well known, in lore, for their exceptional control over
      harmless flames. You can cast Faerie Fire once per day, without expending
      a spell slot, choosing whatever colour you desire instead of the normal
      blue, green, or violet.
proper: false`;

export const martyrsVowAlias = `!a import name: Martyr's Vow
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
verb: endures the burden with`;

export const amuletOfTheNightAlias = `!a import name: Amulet of the Night
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
activation_type: 2`;

export const shrinekeeperCommands = [
  {
    command: "!a nature's -t target -choice debi",
    label: "Quick Command",
  },
  {
    command: "!a nature's -t ally -choice ward",
    label: "Quick Command",
  },
  {
    command:
      '!cc create "Ward of the Kami" -min 0 -max {{wisdomMod}} -type bubble -reset long -desc "When you reach 6th level, your mastery over magical wards gains new heights. You can cast the Sanctuary spell without expending a spell slot a number of times equal to your Wisdom modifier (minimum of 1)."',
    label: "Required CC",
  },
];

export const shrinekeeperCodeBlocks = [
  {
    title: "Channel Divinity: Nature's Guardians",
    code: `name: "Channel Divinity: Nature's Guardians"
automation:
  - type: variable
    name: bonus
    value: int(ClericLevel)//3
  - type: condition
    condition: choice == ""
    onTrue:
      - type: text
        text: >-
          Choose between \`debilitate\` and \`warding\` with \`-choice\`. You may use
          \`ward\` and \`debi\` for short.
        title: No Input!
    onFalse:
      - type: condition
        condition: choice.lower() == "debilitate" or choice.lower() == "debi"
        onTrue:
          - type: target
            target: all
            effects:
              - type: ieffect2
                name: Weakened Defenses
                duration: "2"
                tick_on_caster: true
                end: true
                effects:
                  ac_bonus: -bonus
                desc: Your AC is reduced by {{bonus}} until the end of {{caster.name}}'s turn.
          - type: text
            text: >-
              When you hit a creature, you expend one use of your channel divinity to
              weaken their defenses. The creature’s AC is reduced by
              **{{bonus}}** until the end of your next turn.
          - type: counter
            counter: Channel Divinity
            amount: "1"
            fixedValue: true
            errorBehaviour: raise
        onFalse:
          - type: condition
            condition: choice.lower() == "warding" or choice.lower() == "ward"
            onTrue:
              - type: target
                target: all
                effects:
                  - type: ieffect2
                    name: Increased Defenses
                    duration: "2"
                    end: true
                    tick_on_caster: true
                    effects:
                      ac_bonus: bonus
                    desc: Your AC is increased by {{bonus}} unti the end of {{caster.name}}'s next
                      turn.
              - type: text
                text: >-
                  You can use a Magic action to expend one use of your channel divinity to
                  increase the defense of an ally you can see within 30 feet of
                  you. The ally’s AC is increased by **{{bonus}}** until the end
                  of your next turn.
              - type: counter
                counter: Channel Divinity
                amount: "1"
                fixedValue: true
                errorBehaviour: raise
            onFalse: []
_v: 2
proper: false
verb: manifests
activation_type: 1`,
    downloadName: "channel-divinity-natures-guardians.yaml",
  },
  {
    title: "Ward of the Kami",
    code: `name: Ward of the Kami
automation:
  - type: target
    target: all
    effects:
      - type: ieffect2
        name: Sanctuary
        duration: "10"
        desc: Any creature who targets the warded creature with an attack roll or a
          damaging spell must succeed on a Wisdom saving throw or either choose
          a new target or lose the attack or spell. This spell doesn’t protect
          the warded creature from areas of effect. The spell ends if the warded
          creature makes an at- tack roll, casts a spell, or deals damage.
        attacks:
          - attack:
              _v: 2
              name: Sanctuary
              automation:
                - type: target
                  target: all
                  effects:
                    - type: save
                      stat: wis
                      fail: []
                      success: []
                - type: text
                  text: >-
                    Until the spell ends, any creature who targets the warded creature with an
                    attack roll or a damaging spell must succeed on a Wisdom
                    saving throw or either choose a new target or lose the
                    attack or spell. This spell doesn’t protect the warded
                    creature from areas of effect. The spell ends if the warded
                    creature makes an at- tack roll, casts a spell, or deals
                    damage.
              verb: is protected by
              proper: true
            defaultDC: spell_dc
  - type: text
    text: >-
      You ward a creature within range. Until the spell ends, any creature who
      targets the warded creature with an attack roll or a damaging spell must
      succeed on a Wisdom saving throw or either choose a new target or lose the
      attack or spell. This spell doesn't protect the warded creature from areas
      of effect.

      The spell ends if the warded creature makes an attack roll, casts a spell, or deals damage.
  - type: text
    text: >-
      When you reach 6th level, your mastery over magical wards gains new
      heights. You can cast the Sanctuary spell without expending a spell slot
      **{{wisdomMod}}** times.

      When a creature warded by your Sanctuary makes an attack, casts a spell, or deals damage, it is not dispelled until the start of your next turn. Otherwise, the spell acts as normal. Only one creature can be affected by this benefit at any time.
  - type: counter
    counter: Ward of the Kami
    amount: "1"
    fixedValue: true
    errorBehaviour: raise
_v: 2
proper: false
verb: grants
activation_type: 3`,
    downloadName: "ward-of-the-kami.yaml",
  },
  {
    title: "Avatar of Nature",
    code: `_v: 2
name: Avatar of Nature
automation:
  - type: target
    target: self
    effects:
      - type: ieffect2
        name: Kami! I Choose You!
        buttons:
          - label: Amaterasu
            automation:
              - type: remove_ieffect
              - type: target
                target: self
                effects:
                  - type: ieffect2
                    name: Worshipping Amaterasu
                    effects:
                      resistances:
                        - radiant
                      save_adv:
                        - con
                    attacks:
                      - attack:
                          _v: 2
                          name: "Channel Divinity: Amaterasu's Radiance"
                          automation:
                            - type: counter
                              counter: Channel Divinity
                              amount: "1"
                              allowOverflow: false
                              errorBehaviour: raise
                              fixedValue: true
                            - type: target
                              target: 1
                              effects:
                                - type: damage
                                  damage: "- (8d6 + {wisdomMod}) [heal]"
                                  fixedValue: true
                            - type: target
                              target: all
                              effects:
                                - type: condition
                                  condition: targetNumber > 1
                                  onTrue:
                                    - type: save
                                      stat: con
                                      fail:
                                        - type: ieffect2
                                          name: Blinded by Radiance!
                                          effects:
                                            attack_advantage: "-1"
                                          buttons:
                                            - label: Try to See (End of Turn)
                                              automation:
                                                - type: target
                                                  target: self
                                                  effects:
                                                    - type: save
                                                      stat: con
                                                      fail:
                                                        - type: text
                                                          text: "{target.name} still can't see!"
                                                      success:
                                                        - type: text
                                                          text: "{target.name} can see!"
                                                        - type: remove_ieffect
                                                      dc: spell_dc
                                              verb: tries to see
                                              style: "1"
                                              defaultDC: lastSaveDC
                                      success: []
                                  onFalse: []
                            - type: text
                              text: As a bonus action, you can heal a creature within 30 feet that you can see
                                for 8d6 plus your wisdom modifier in hit points.
                                All creatures within 10 feet of them must
                                succeed on a Constitution saving throw against
                                your spell save DC or be blinded for one minute.
                                A creature blinded by this feature can repeat
                                the saving throw at the end of each of its
                                turns, removing the effect on a success.
                          verb: glows with
                          proper: true
            verb: is worshipping Amaterasu
            style: "1"
          - label: Inari
            automation:
              - type: remove_ieffect
              - type: target
                target: self
                effects:
                  - type: ieffect2
                    name: Worshipping Inari
                    effects:
                      resistances:
                        - poison
                      save_adv:
                        - cha
                    attacks:
                      - attack:
                          _v: 2
                          name: "Channel Divinity: Inari's Prosperity"
                          automation:
                            - type: target
                              target: all
                              effects:
                                - type: damage
                                  damage: "- (3d8) [heal]"
                                  fixedValue: true
                                  cantripScale: false
                                - type: ieffect2
                                  name: Inari's Prosperity
                                  duration: "10"
                                  desc: Can add {wisdomMod} to one D20 Test of their choice in the next minute.
                                  buttons:
                                    - label: Uses Inari's Prosperity
                                      automation:
                                        - type: remove_ieffect
                                      verb: uses Inari's Prosperity
                                      style: "1"
                            - type: text
                              text: As an action, you can choose up to six creatures within 30 feet of you
                                that you can see. Each target regains 3d8 hit
                                points and can add your wisdom modifier to one
                                D20 test of their choice within the next minute.
                            - type: counter
                              counter: Channel Divinity
                              amount: "1"
                              fixedValue: true
                              allowOverflow: true
                              errorBehaviour: raise
                          verb: blesses their allies with
                          proper: true
            verb: is worshipping Inari
            style: "1"
          - label: Susanoo
            automation:
              - type: remove_ieffect
              - type: target
                target: self
                effects:
                  - type: ieffect2
                    name: Worshipping Susanoo
                    effects:
                      resistances:
                        - lightning
                      save_adv:
                        - dex
                    attacks:
                      - attack:
                          _v: 2
                          name: "Channel Divinity: Susanoo's Fury"
                          automation:
                            - type: counter
                              counter: Channel Divinity
                              amount: "1"
                              fixedValue: true
                              errorBehaviour: raise
                            - type: text
                              text: As a reaction when you or a creature within 10 feet of you is hit by a
                                melee attack, you can release a burst of
                                thunder. The attacker must make a Constitution
                                saving throw against your spell save DC. On a
                                failure, they take 5d8 thunder damage, are
                                pushed 10 feet away from the target hit by the
                                attack, and cannot take reactions for 1 round.
                                On a success, they take half damage and no
                                further effects.
                            - type: target
                              target: all
                              effects:
                                - type: save
                                  stat: con
                                  fail:
                                    - type: damage
                                      damage: 5d8 [thunder]
                                      fixedValue: true
                                    - type: ieffect2
                                      name: Susanoo's Fury!
                                      duration: "1"
                                      tick_on_caster: true
                                      desc: "Cannot take reactions. "
                                  success:
                                    - type: damage
                                      damage: (5d8)/2 [thunder]
                          verb: retaliates with
                          proper: true
            verb: is worshipping Susanoo
            style: "1"
          - label: Izanagi/Izanami
            automation:
              - type: remove_ieffect
              - type: target
                target: self
                effects:
                  - type: ieffect2
                    name: Worshipping Izanagi and Izanami
                    effects:
                      resistances:
                        - necrotic
                      save_adv:
                        - wis
                    attacks:
                      - attack:
                          _v: 2
                          name: "Channel Divinity: Izanagi and Izanami's Protection"
                          automation:
                            - type: roll
                              dice: 5d6
                              name: iza
                              fixedValue: true
                              hidden: false
                              displayName: Healing and Damage
                            - type: counter
                              counter: Channel Divinity
                              amount: "1"
                              fixedValue: true
                              errorBehaviour: raise
                            - type: text
                              text: As a Magic action, you can invoke both death and life upon your
                                surroundings. Each creature of your choice in a
                                20-foot-radius sphere centered on a point within
                                60 feet of you regains 5d6 hit points. Each
                                creature within the sphere you choose not to
                                heal in this way must make a Constitution saving
                                throw against your spell save DC, taking 5d6
                                necrotic damage on a failure and half as much on
                                a successful one.
                            - type: counter
                              counter: "''"
                              amount: "0"
                              errorBehaviour: ignore
                            - type: variable
                              name: allies
                              value: lastCounterRequestedAmount
                            - type: target
                              target: all
                              effects:
                                - type: condition
                                  condition: targetNumber > allies
                                  onTrue:
                                    - type: save
                                      stat: con
                                      fail:
                                        - type: damage
                                          damage: "{iza} [necrotic]"
                                      success:
                                        - type: damage
                                          damage: "{iza}/2 [necrotic]"
                                  onFalse:
                                    - type: damage
                                      damage: -{iza} [heal]
                          verb: invokes death and life with
                          proper: true
            verb: is worshipping Izanagi and Izanami
            style: "1"
  - type: text
    text: >-
      At 17th level, at the end of every long rest, you can choose one of the
      following Kami to put your devotion into. You gain resistance to a damage
      type and advantage on a saving throw associated with your chosen Kami.

      Worshippers may also call upon their Kami’s blessing. You gain a channel divinity associated with your chosen Kami.
  - type: target
    target: 1
    effects: []
verb: is an
proper: true`,
    downloadName: "avatar-of-nature.yaml",
  },
];

export const hemophageAlias = `name: Blood Pool
automation:
  - type: text
    text: >-
      Starting at level 3, your Blood Pool is a pool of hit points that fills as
      you take damage. Whenever you take damage from another creature, store the
      hit points lost in your Blood Pool. When you use a Blood Art, you may
      substitute some or all of the Hit Point Cost from the pool of hit points
      in your Blood Pool. At the end of your turn, the Blood Pool empties,
      reducing itself down to zero. Your Blood Pool cannot contain more than 10
      times your fighter level hit points at any given time.
    title: Blood Pool
  - type: target
    target: self
    effects:
      - type: ieffect2
        name: Blood Pool
        duration: null
        effects: null
        attacks:
          - attack:
              name: fill the Blood Pool
              automation:
                - type: counter
                  counter: IfYouNameACounterThisYouAreDumb
                  amount: "0"
                  allowOverflow: false
                  errorBehaviour: ignore
                - type: variable
                  name: x
                  value: lastCounterRequestedAmount
                - type: counter
                  counter: Blood Pool
                  amount: -x
                  allowOverflow: false
                  errorBehaviour: warn
                  fixedValue: true
              _v: 2
              proper: true
              verb: uses the damage she took to
        buttons:
          - label: Drain Blood Pool
            automation:
              - type: counter
                counter: Blood Pool
                amount: "0"
                allowOverflow: true
                errorBehaviour: ignore
                fixedValue: true
              - type: variable
                name: BloodAmount
                value: lastCounterRemaining
              - type: counter
                counter: Blood Pool
                amount: BloodAmount
                allowOverflow: false
                errorBehaviour: warn
                fixedValue: true
            verb: drains their blood pool
            style: "4"
        end: false
        conc: false
        desc: null
        stacking: false
        save_as: null
        parent: null
        target_self: false
        tick_on_caster: false
_v: 2
proper: true
verb: is filling a
activation_type: 2

- name: Vampiric Strike
automation:
  - type: counter
    counter: IfYouNameACounterThisYouAreStupid
    amount: "0"
    allowOverflow: false
    errorBehaviour: ignore
  - type: variable
    name: Healing
    value: lastCounterRequestedAmount
  - type: counter
    counter: Blood Pool
    amount: "0"
    allowOverflow: false
    errorBehaviour: ignore
    fixedValue: true
  - type: variable
    name: Pool
    value: lastCounterRemaining
  - type: condition
    condition: Pool >= Healing
    onTrue:
      - type: target
        target: self
        effects:
          - type: damage
            damage: -{Healing} [heal]
            overheal: false
            fixedValue: true
          - type: counter
            counter: Blood Pool
            amount: Healing
            allowOverflow: false
            errorBehaviour: warn
            fixedValue: true
    onFalse:
      - type: target
        target: self
        effects:
          - type: damage
            damage: -{Pool} [heal]
            overheal: false
            fixedValue: true
          - type: counter
            counter: Blood Pool
            amount: Pool
            allowOverflow: false
            errorBehaviour: warn
            fixedValue: true
    errorBehaviour: "false"
  - type: text
    text: >-
      You may spend any amount of Hit Points from your Blood Pool (up to the
      amount of damage dealt by the attack) to heal for the amount spent.
    title: Effect
_v: 2
verb: absorbs the enemy's lifeforce with
activation_type: 2

- name: Pooling Strike
automation:
  - type: counter
    counter: "''"
    amount: "0"
    allowOverflow: false
    errorBehaviour: ignore
    fixedValue: false
  - type: variable
    name: Pooling
    value: lastCounterRequestedAmount * -1
  - type: counter
    counter: Blood Pool
    amount: Pooling
    allowOverflow: false
    errorBehaviour: warn
    fixedValue: true
  - type: text
    text: >-
      Your Blood Pool fills with an amount of Hit Points equal to the amount of
      damage dealt by the attack.
    title: Effect
_v: 2
verb: steals the enemy's vitality with
activation_type: 2

- name: Exalted
automation:
  - type: text
    text: >-
      Starting at level 15, you begin to truly relish in the art of manipulating
      blood. At any point during your turn, if the amount of Hit Points in your
      Blood Pool is above 33% of it's maximum value (rounded up), you may enter
      a state of Exaltation until the end of your turn.

      Exalted: Until the end of your turn, the range to land a critical strike on damaged creatures increases by one.
    title: Effect
  - type: counter
    counter: Blood Pool
    amount: "0"
    allowOverflow: false
    errorBehaviour: warn
    fixedValue: true
  - type: variable
    name: Pool
    value: lastCounterRemaining
  - type: target
    target: self
    effects:
      - type: condition
        condition: Pool >= ((10 * (FighterLevel))*0.33)
        onTrue:
          - type: ieffect2
            name: Exalted!
            duration: "1"
            effects: null
            attacks: []
            buttons: []
            end: true
            conc: false
            desc: Until the end of your turn, the range to land a critical strike on damaged
              creatures increases by one.
            stacking: false
            save_as: null
            parent: null
            target_self: false
            tick_on_caster: false
        onFalse:
          - type: text
            text: Not yet exalted...
            title: Effect
        errorBehaviour: raise
_v: 2
proper: true
verb: grins as they see the blood, becoming
activation_type: 2

- name: Bloodless Exaltation
automation:
  - type: target
    target: self
    effects:
      - type: condition
        condition: (caster.hp) <= (caster.max_hp * 0.33)
        onTrue:
          - type: ieffect2
            name: Exalted!
            duration: "1"
            effects: null
            attacks: []
            buttons: []
            end: true
            conc: false
            desc: Until the end of your turn, the range to land a critical strike on damaged
              creatures increases by one.
            stacking: false
            save_as: null
            parent: null
            target_self: false
            tick_on_caster: false
          - type: counter
            counter: Bloodless Exaltation
            amount: "1"
            allowOverflow: false
            errorBehaviour: raise
        onFalse:
          - type: text
            text: You aren't bloody enough... yet.
            title: Effect
        errorBehaviour: "false"
  - type: text
    text: >-
      The loss of your own blood can drive you into a delirious, blood-frenzied
      state. When your Hit Points drop below 33% of your maximum hit points
      (rounded down), you become Exalted until the end of your next turn. You
      can only become Exalted this way once per Short Rest.
    title: Bloodless Exaltation
  - type: text
    text: >-
      Until the end of your turn, the range to land a critical strike on damaged
      creatures increases by one.
    title: Exalted
_v: 2
verb: smirks as they lose blood, entering
activation_type: 2

- name: Blood Rush
automation:
  - type: text
    text: >-
      Starting at level 18, constantly losing and regaining the blood in your
      veins has sped up your attacks and speed. Whenever you score a critical
      hit on a damaged target, or kill a creature, you gain the effects of the
      Haste spell until the end of your next turn, not requiring concentration.
    title: Effect
  - type: target
    target: self
    effects:
      - type: ieffect2
        name: Haste
        duration: "2"
        effects:
          ac_bonus: "2"
          save_adv:
            - dex
        attacks: []
        buttons: []
        end: true
        conc: false
        desc: +2 AC, Advantage on Dex Saving Throws, extra action for Attack (one attack
          only), Dash, Disengage, Hide or Utilize. Lethargy if this ends without
          starting again.
        stacking: false
        save_as: null
        parent: null
        target_self: false
        tick_on_caster: false
_v: 2
verb: revels in the crimson, entering
activation_type: 2

- name: Crimson Martyr
automation:
  - type: variable
    name: BloodDC
    value: "27"
  - type: counter
    counter: Blood Pool
    amount: "0"
    allowOverflow: false
    errorBehaviour: ignore
    fixedValue: true
  - type: variable
    name: Pool
    value: lastCounterRemaining
  - type: counter
    counter: "''"
    amount: "0"
    allowOverflow: false
    errorBehaviour: ignore
    fixedValue: false
  - type: variable
    name: Cost
    value: lastCounterRequestedAmount
  - type: target
    target: self
    effects:
      - type: condition
        condition: Pool >= Cost
        onTrue:
          - type: counter
            counter: Blood Pool
            amount: Cost
            allowOverflow: false
            errorBehaviour: warn
            fixedValue: true
        onFalse:
          - type: variable
            name: Overflow
            value: Cost - Pool
          - type: counter
            counter: Blood Pool
            amount: Pool
            allowOverflow: false
            errorBehaviour: warn
            fixedValue: true
          - type: damage
            damage: "{Overflow}"
            overheal: false
            fixedValue: true
        errorBehaviour: "false"
  - type: target
    target: all
    effects:
      - type: damage
        damage: -{Cost}
        overheal: false
  - type: text
    text: >-
      As a reaction, when another creature within 60 ft. of you would take
      damage, you may spend Hit Points up to half of the amount of damage they
      would take. The damage they take is reduced by the amount of hit points
      spent.
    title: Crimson Martyr
_v: 2
verb: shields an ally with blood, becoming
activation_type: 4

- name: Blood Doping
automation:
  - type: variable
    name: BloodDC
    value: "27"
  - type: counter
    counter: Blood Pool
    amount: "0"
    allowOverflow: false
    errorBehaviour: ignore
    fixedValue: true
  - type: variable
    name: Pool
    value: lastCounterRemaining
  - type: variable
    name: Cost
    value: (caster.max_hp * 0.15)
  - type: target
    target: self
    effects:
      - type: condition
        condition: Pool >= Cost
        onTrue:
          - type: counter
            counter: Blood Pool
            amount: Cost
            allowOverflow: false
            errorBehaviour: warn
            fixedValue: true
        onFalse:
          - type: variable
            name: Overflow
            value: Cost - Pool
          - type: counter
            counter: Blood Pool
            amount: Pool
            allowOverflow: false
            errorBehaviour: warn
            fixedValue: true
          - type: damage
            damage: "{Overflow}"
            overheal: false
            fixedValue: true
        errorBehaviour: "false"
  - type: target
    target: all
    effects:
      - type: ieffect2
        name: Doped!
        duration: "1"
        effects: null
        attacks: []
        buttons: []
        end: true
        conc: false
        desc: |-
          Walking speed increased by 10 ft.
          Increased to 20 at level 5, 30 at level 10,  and 40 at level 15.
        stacking: false
        save_as: null
        parent: null
        target_self: false
        tick_on_caster: false
  - type: text
    text: >-
      As a Bonus Action, increase the walking speed of a creature within 30 feet
      of you by 10 feet until the end of their next turn. Increase this amount
      to 20 at level 5, 30 at level 10, and 40 at level 15.
    title: Effect
_v: 2
proper: true
verb: infuses an allies blood, increasing their speed with
activation_type: 3

- name: Blood Shield
automation:
  - type: variable
    name: BloodDC
    value: "27"
  - type: counter
    counter: Blood Pool
    amount: "0"
    allowOverflow: false
    errorBehaviour: ignore
    fixedValue: true
  - type: variable
    name: Pool
    value: lastCounterRemaining
  - type: variable
    name: Cost
    value: (caster.max_hp * 0.10)
  - type: target
    target: self
    effects:
      - type: condition
        condition: Pool >= Cost
        onTrue:
          - type: counter
            counter: Blood Pool
            amount: Cost
            allowOverflow: false
            errorBehaviour: warn
            fixedValue: true
        onFalse:
          - type: variable
            name: Overflow
            value: Cost - Pool
          - type: counter
            counter: Blood Pool
            amount: Pool
            allowOverflow: false
            errorBehaviour: warn
            fixedValue: true
          - type: damage
            damage: "{Overflow}"
            overheal: false
            fixedValue: true
        errorBehaviour: "false"
      - type: condition
        condition: FighterLevel >= 15
        onTrue:
          - type: variable
            name: shield
            value: "4"
        onFalse:
          - type: condition
            condition: FighterLevel >= 10
            onTrue:
              - type: variable
                name: shield
                value: "3"
            onFalse:
              - type: condition
                condition: FighterLevel >= 7
                onTrue:
                  - type: variable
                    name: shield
                    value: "2"
                onFalse:
                  - type: variable
                    name: shield
                    value: "1"
                errorBehaviour: "false"
            errorBehaviour: "false"
        errorBehaviour: "false"
      - type: ieffect2
        name: Blood Shield
        duration: "1"
        effects:
          ac_bonus: shield
        attacks: []
        buttons: []
        end: false
        conc: false
        desc: Protected by droplets of blood.
        stacking: false
        save_as: null
        parent: null
        target_self: false
        tick_on_caster: false
  - type: text
    text: >-
      When you land an attack on a damaged creature, you can use your control
      over blood to create Bloody Droplets that circle around you, attempting to
      disrupt blows from hitting you. You gain +1 AC until the start of your
      next turn. (Increases to +2 AC at level 7, +3 at level 10, and +4 at level
      15.)
    title: Effect
_v: 2
verb: uses the droplets to shield herself, creating
activation_type: 8

- name: Blood Transfer
automation:
  - type: variable
    name: BloodDC
    value: "27"
  - type: counter
    counter: Blood Pool
    amount: "0"
    allowOverflow: false
    errorBehaviour: ignore
    fixedValue: true
  - type: variable
    name: Pool
    value: lastCounterRemaining
  - type: variable
    name: Cost
    value: (caster.max_hp * 0.15)
  - type: target
    target: self
    effects:
      - type: condition
        condition: Pool >= Cost
        onTrue:
          - type: counter
            counter: Blood Pool
            amount: Cost
            allowOverflow: false
            errorBehaviour: warn
            fixedValue: true
        onFalse:
          - type: variable
            name: Overflow
            value: Cost - Pool
          - type: counter
            counter: Blood Pool
            amount: Pool
            allowOverflow: false
            errorBehaviour: warn
            fixedValue: true
          - type: damage
            damage: "{Overflow}"
            overheal: false
            fixedValue: true
        errorBehaviour: "false"
  - type: text
    text: >-
      When you land an attack on a creature, you may allow one creature within 5
      ft. of it (other than yourself) to spend one of their hit dice to heal, as
      if it was spent during a Short Rest.
    title: Effect
_v: 2
verb: restores an allies vitality with
activation_type: 8

- name: Bloodseeker Weapon
automation:
  - type: variable
    name: BloodDC
    value: "27"
  - type: counter
    counter: Blood Pool
    amount: "0"
    allowOverflow: false
    errorBehaviour: ignore
    fixedValue: true
  - type: variable
    name: Pool
    value: lastCounterRemaining
  - type: variable
    name: Cost
    value: (caster.max_hp * 0.20)
  - type: target
    target: self
    effects:
      - type: condition
        condition: Pool >= Cost
        onTrue:
          - type: counter
            counter: Blood Pool
            amount: Cost
            allowOverflow: false
            errorBehaviour: warn
            fixedValue: true
        onFalse:
          - type: variable
            name: Overflow
            value: Cost - Pool
          - type: counter
            counter: Blood Pool
            amount: Pool
            allowOverflow: false
            errorBehaviour: warn
            fixedValue: true
          - type: damage
            damage: "{Overflow}"
            overheal: false
            fixedValue: true
        errorBehaviour: "false"
      - type: ieffect2
        name: Bloodseeker Weapon
        duration: "1"
        effects: null
        attacks: []
        buttons: []
        end: true
        conc: false
        desc: null
        stacking: false
        save_as: null
        parent: null
        target_self: false
        tick_on_caster: false
  - type: text
    text: >-
      When you take the attack action on your turn, you may coat you weapons
      with your blood. Until the end of your turn, you may add your Constitution
      Modifier to your attack rolls against any Bloodied creature.
    title: Effect
_v: 2
verb: enhances their weapons with blood, making them
activation_type: 8

- name: Coagulopathy
automation:
  - type: variable
    name: BloodDC
    value: "27"
  - type: counter
    counter: Blood Pool
    amount: "0"
    allowOverflow: false
    errorBehaviour: ignore
    fixedValue: true
  - type: variable
    name: Pool
    value: lastCounterRemaining
  - type: variable
    name: Cost
    value: (caster.max_hp * 0.25)
  - type: target
    target: self
    effects:
      - type: condition
        condition: Pool >= Cost
        onTrue:
          - type: counter
            counter: Blood Pool
            amount: Cost
            allowOverflow: false
            errorBehaviour: warn
            fixedValue: true
        onFalse:
          - type: variable
            name: Overflow
            value: Cost - Pool
          - type: counter
            counter: Blood Pool
            amount: Pool
            allowOverflow: false
            errorBehaviour: warn
            fixedValue: true
          - type: damage
            damage: "{Overflow}"
            overheal: false
            fixedValue: true
        errorBehaviour: "false"
  - type: target
    target: all
    effects:
      - type: ieffect2
        name: Coagulopathy
        duration: "1"
        effects:
          immunities:
            - heal
        attacks: []
        buttons: []
        end: false
        conc: false
        desc: The creature cannot regain hit points.
        stacking: false
        save_as: null
        parent: null
        target_self: false
        tick_on_caster: true
  - type: text
    text: >-
      When you land an attack on a creature, you can force their body to stop
      regulating it's own repair. Until the start of your next turn, the
      creature cannot regain hit points.
    title: Effect
_v: 2
proper: true
verb: forces the enemies blood to run with
activation_type: 8

- name: Emergency Coagulation
automation:
  - type: variable
    name: BloodDC
    value: "27"
  - type: counter
    counter: Blood Pool
    amount: "0"
    allowOverflow: false
    errorBehaviour: ignore
    fixedValue: true
  - type: variable
    name: Pool
    value: lastCounterRemaining
  - type: variable
    name: Cost
    value: (caster.max_hp * 0.05)
  - type: target
    target: self
    effects:
      - type: condition
        condition: Pool >= Cost
        onTrue:
          - type: counter
            counter: Blood Pool
            amount: Cost
            allowOverflow: false
            errorBehaviour: warn
            fixedValue: true
        onFalse:
          - type: variable
            name: Overflow
            value: Cost - Pool
          - type: counter
            counter: Blood Pool
            amount: Pool
            allowOverflow: false
            errorBehaviour: warn
            fixedValue: true
          - type: damage
            damage: "{Overflow}"
            overheal: false
            fixedValue: true
        errorBehaviour: "false"
  - type: text
    text: >-
      As a reaction, when a creature within 30 ft. of you fails a Death Saving
      Throw, you can change the failure to a success.
    title: Effect
_v: 2
proper: true
verb: tries to save an ally with some
activation_type: 4

- name: Endorphin Rush
automation:
  - type: variable
    name: BloodDC
    value: "27"
  - type: counter
    counter: Blood Pool
    amount: "0"
    allowOverflow: false
    errorBehaviour: ignore
    fixedValue: true
  - type: variable
    name: Pool
    value: lastCounterRemaining
  - type: variable
    name: Cost
    value: (caster.max_hp * 0.10)
  - type: target
    target: self
    effects:
      - type: condition
        condition: Pool >= Cost
        onTrue:
          - type: counter
            counter: Blood Pool
            amount: Cost
            allowOverflow: false
            errorBehaviour: warn
            fixedValue: true
        onFalse:
          - type: variable
            name: Overflow
            value: Cost - Pool
          - type: counter
            counter: Blood Pool
            amount: Pool
            allowOverflow: false
            errorBehaviour: warn
            fixedValue: true
          - type: damage
            damage: "{Overflow}"
            overheal: false
            fixedValue: true
        errorBehaviour: "false"
  - type: text
    text: >-
      As a reaction, when a creature within 30 ft. of you makes an Acrobatics or
      Athletics check, you may add your Constitution Modifier to the ability
      check.
    title: Effect
_v: 2
proper: true
verb: enhances an ally with an
activation_type: 4

- name: Muscle Spasticity
automation:
  - type: variable
    name: BloodDC
    value: "27"
  - type: counter
    counter: Blood Pool
    amount: "0"
    allowOverflow: false
    errorBehaviour: ignore
    fixedValue: true
  - type: variable
    name: Pool
    value: lastCounterRemaining
  - type: variable
    name: Cost
    value: (caster.max_hp * 0.10)
  - type: target
    target: self
    effects:
      - type: condition
        condition: Pool >= Cost
        onTrue:
          - type: counter
            counter: Blood Pool
            amount: Cost
            allowOverflow: false
            errorBehaviour: warn
            fixedValue: true
        onFalse:
          - type: variable
            name: Overflow
            value: Cost - Pool
          - type: counter
            counter: Blood Pool
            amount: Pool
            allowOverflow: false
            errorBehaviour: warn
            fixedValue: true
          - type: damage
            damage: "{Overflow}"
            overheal: false
            fixedValue: true
        errorBehaviour: "false"
  - type: target
    target: all
    effects:
      - type: ieffect2
        name: Muscle Spasticity
        duration: "1"
        effects: null
        attacks: []
        buttons: []
        end: true
        conc: false
        desc: Spasming Muscles! Movement Speed is halved.
        stacking: false
        save_as: null
        parent: null
        target_self: false
        tick_on_caster: false
  - type: text
    text: >-
      When you land an attack on a creature, you can force their muscles to
      spasm. Until the end of their next turn, their movement speed is halved.
    title: Effect
_v: 2
proper: true
verb: seizes up an opponents muscles, causing
activation_type: 8`;

export const crucibleBladeAlias = `name: Crucible Blade
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
verb: uses`;

export const threadboundCodeBlocks = [
  {
    title: "Reinforced Strike",
    code: `!a import name: Reinforced Strike
automation:
  - type: target
    target: all
    effects:
      - type: attack
        hit:
          - type: damage
            damage: 1d8 + {proficiencyBonus} [force]
        miss: []
        attackBonus: ""
      - type: text
        text: >-
          Melee Weapon Attack: your spell attack modifier to hit, reach 5 ft., one
          target. Hit: 1d8 + PB force damage.
        title: "Reinforced Strike. "
_v: 2
proper: false
verb: commands Vanguard to attack with a`,
    downloadName: "reinforced-strike.txt",
  },
  {
    title: "Brace (Signature Ability)",
    code: `!a import name: Brace (Signature Ability)
automation:
  - type: target
    target: all
    effects:
      - type: damage
        damage: -({proficiencyBonus} + {charismaMod})
      - type: text
        text: >-
          Until the start of your next turn

          When a Bound Puppet within 10 feet of the Vanguard takes damage from an attack, it can use its reaction to reduce that damage by PB + your Charisma modifier (minimum 1).

          This can only occur once per round.
        title: "Brace (Signature Ability). "
_v: 2
proper: false
verb: commands Vanguard to`,
    downloadName: "brace-signature-ability.txt",
  },
  {
    title: "Interpose Strings",
    code: `!a import name: Interpose Strings
automation:
  - type: target
    target: all
    effects:
      - type: text
        text: >-
          When a creature the Puppet can see within 5 feet of it is hit by an
          attack, the Puppet may move the protected creature 5 feet to an
          unoccupied space near it without provoking opportunity attacks
        title: Interpose Strings.
_v: 2
proper: false
verb: commands Vanguard to interfere with`,
    downloadName: "interpose-strings.txt",
  },
  {
    title: "Relentless Pressure",
    code: `!a import name: Relentless Pressure
automation:
  - type: target
    target: all
    effects:
      - type: text
        text: >-
          When the Striker Puppet hits a creature with an attack the target’s speed
          is reduced by 10 ft until the start of its next turn.
        title: Relentless Pressure
      - type: ieffect2
        name: Relentless Pressure
        duration: "1"
        desc: Speed reduction 10 ft
_v: 2
proper: false`,
    downloadName: "relentless-pressure.txt",
  },
  {
    title: "Execution Protocol (Signature Ability)",
    code: `!a import name: Execution Protocol (Signature Ability)
automation:
  - type: target
    target: all
    effects:
      - type: attack
        hit:
          - type: damage
            damage: 1d10 + {proficiencyBonus} [force]
          - type: damage
            damage: 1d6 [force]
            cantripScale: true
        miss: []
        adv: "1"
      - type: text
        text: >-
          The Striker Puppet attacks once, with one Threaded Slash at advantage.

          Pressing the Advantage. If the Striker Puppet has advantage on its attack roll, it deals an additional 1d6 force damage.

          This damage increases by 1d6 when you reach levels 5 (2d6), 11 (3d6), and 17 (4d6).
        title: Execution Protocol (Signature Ability)
_v: 2
proper: false
verb: commands Striker to perform`,
    downloadName: "execution-protocol-signature-ability.txt",
  },
  {
    title: "Threaded Slash",
    code: `!a import name: Threaded Slash
automation:
  - type: target
    target: all
    effects:
      - type: attack
        hit:
          - type: damage
            damage: 1d10 + {proficiencyBonus} [force]
            overheal: null
        miss: []
        adv: "0"
      - type: text
        text: >-
          Melee Weapon Attack: your spell attack modifier to hit, reach 5 ft., one
          target. Hit: 1d10 + PB force damage.
        title: Threaded Slash
_v: 2
verb: commands Striker to attack with`,
    downloadName: "threaded-slash.txt",
  },
  {
    title: "Pressing the Advantage",
    code: `!a import name: Pressing the Advantage
automation:
  - type: target
    target: all
    effects:
      - type: damage
        damage: 1d6 [force]
        cantripScale: true
      - type: text
        text: >-
          If the Striker Puppet has advantage on its attack roll, it deals an
          additional 1d6 force damage.

          This damage increases by 1d6 when you reach levels 5 (2d6), 11 (3d6), and 17 (4d6).
        title: Pressing the Advantage
_v: 2
proper: false
verb: commands Striker to`,
    downloadName: "pressing-the-advantage.txt",
  },
  {
    title: "Thread Lash",
    code: `!a import name: Thread Lash
automation:
  - type: target
    target: all
    effects:
      - type: attack
        hit:
          - type: damage
            damage: 1d6 + {proficiencyBonus} [force]
          - type: save
            stat: str
            fail:
              - type: text
                text: The threaded target gets pulled up to 10 feet toward the Weaver Puppet.
                title: Pulled
            success: []
        miss: []
      - type: text
        text: >-
          Melee Weapon Attack: your spell attack modifier to hit, reach 10 ft., one
          target. Hit: 1d6 + PB force damage. On a hit, the target must succeed
          on a Strength saving throw against your Sorcerer spell save DC or be
          pulled up to 10 feet toward the Weaver Puppet.
        title: Thread Lash
_v: 2
proper: false
verb: commands Weaver to attack with`,
    downloadName: "thread-lash.txt",
  },
  {
    title: "Ensnaring Weave (Signature Ability)",
    code: `!a import name: Ensnaring Weave (Signature Ability)
automation:
  - type: target
    target: all
    effects:
      - type: attack
        hit:
          - type: ieffect2
            name: Grappled
            desc: You are grappled
            buttons:
              - label: Roll Escape (Ath/Acr)
                automation:
                  - type: text
                    text: ""
                    title: Escape DC = Sorcerer Spell Save DC (ask puppet master). If you meet it, click Release Grapple
                  - type: target
                    target: self
                    effects:
                      - type: check
                        ability:
                          - athletics
                          - acrobatics
                style: "1"
              - label: Release Grapple (If Passed)
                automation:
                  - type: remove_ieffect
                style: "1"
            end: false
        miss: []
  - type: text
    text: >-
      Ranged Weapon Attack: your spell attack modifier to hit, reach 15 ft.,
      one target. Hit: the target becomes Grappled by the Weaver Puppet. Escape
      DC is your spell save DC. * This Grapple ends at the start of your next
      turn.
    title: Ensnaring Weave (Signature Ability)
_v: 2
proper: false
verb: commands Weaver to attack with`,
    downloadName: "ensnaring-weave-signature-ability.txt",
  },
  {
    title: "Reactive Pull",
    code: `!a import name: Reactive Pull
automation:
  - type: target
    target: all
    effects:
      - type: save
        stat: str
        fail:
          - type: text
            text: >-
              You are pulled by the Weaver. Your movement immediately ends and you are
              pulled 5 feet toward the Weaver Puppet.
            title: Pulled
        success: []
      - type: text
        text: >-
          When a creature within 10 feet of the Weaver Puppet moves willingly, it
          can use its Reaction to force it to make a Strength saving throw
          against your spell save DC.

          On a failure, its movement immediately ends and it is pulled 5 feet toward the puppet.

          On a success, its movement continues normally.
        title: Reactive Pull
_v: 2
proper: false
verb: commands Weaver to use`,
    downloadName: "reactive-pull.txt",
  },
  {
    title: "Summon a Bound Puppet",
    code: `!a import name: Summon a Bound Puppet
automation:
  - type: counter
    counter: "Font of Magic: Sorcery Points"
    amount: "2"
    errorBehaviour: raise
  - type: text
    text: >-
      As a Bonus Action, you may spend 2 Sorcery Points to summon a Bound Puppet
      in an unoccupied space within 30 feet.
    title: Summon a Bound Puppet
_v: 2
proper: false
verb: uses Sorcery Points to`,
    downloadName: "summon-a-bound-puppet.txt",
  },
  {
    title: "Thread Repair",
    code: `!a import name: Thread Repair
automation:
  - type: target
    target: all
    effects:
      - type: damage
        damage: -(2d8 + {charismaMod})
  - type: counter
    counter: "Font of Magic: Sorcery Points"
    amount: "2"
    errorBehaviour: raise
  - type: text
    text: >-
      As a Bonus Action, you may spend 2 Sorcery Points to restore 2d8 + your
      Charisma modifier hit points to the shared puppet HP pool.

      When you use this Bonus Action, you do not command any Bound Puppets on that turn.

      Bound Puppets cannot regain hit points by any means other than Thread Repair or features of this subclass.
    title: Thread Repair
_v: 2
proper: false
verb: uses Sorcery Points to perform`,
    downloadName: "thread-repair.txt",
  },
  {
    title: "Last Strand",
    code: `!a import name: Last Strand
automation:
  - type: counter
    counter: "Font of Magic: Sorcery Points"
    amount: "2"
    errorBehaviour: raise
  - type: text
    text: >-
      When the shared puppet HP pool would be reduced to 0, you may use your
      reaction and spend 2 Sorcery Points to leave it at 1 HP instead.
    title: Last Strand
_v: 2
proper: false
verb: uses Sorcery Points to enact`,
    downloadName: "last-strand.txt",
  },
  {
    title: "Change Primary Puppet",
    code: `!a import name: Change Primary Puppet
automation:
  - type: counter
    counter: "Font of Magic: Sorcery Points"
    amount: "1"
    errorBehaviour: raise
  - type: text
    text: >-
      When you use your Bonus Action to command a Bound Puppet, you may spend 1
      Sorcery Point to change which of your active puppets is designated as your
      Primary Puppet.

      This change occurs immediately before the commanded puppet takes its action. You may use this feature once per turn.

      If you use this feature, you cannot also use Enhanced Command on the same turn.
    title: Dynamic Conduction
_v: 2
proper: false
verb: uses Sorcery Points to`,
    downloadName: "change-primary-puppet.txt",
  },
  {
    title: "Improved Thread Repair",
    code: `!a import name: Improved Thread Repair
automation:
  - type: target
    target: all
    effects:
      - type: damage
        damage: -(3d8 + {charismaMod})
  - type: counter
    counter: "Font of Magic: Sorcery Points"
    amount: "2"
    errorBehaviour: raise
  - type: text
    text: >-
      When you use Thread Repair, the healing increases to 3d8 + your Charisma modifier.
    title: Thread Repair
_v: 2
proper: false
verb: uses Sorcery Points to perform`,
    downloadName: "improved-thread-repair.txt",
  },
  {
    title: "Improved Dynamic Conduction",
    code: `!a import name: Improved Dynamic Conduction
automation:
  - type: counter
    counter: "Font of Magic: Sorcery Points"
    amount: "2"
    errorBehaviour: raise
  - type: text
    text: >-
      When you use Dynamic Conduction, you may spend 2 Sorcery Points instead of 1 to allow the newly designated Primary Puppet to immediately use its Signature Ability as part of the same Bonus Action.
    title: Improved Dynamic Conduction
_v: 2
proper: false
verb: uses Sorcery Points to`,
    downloadName: "improved-dynamic-conduction.txt",
  },
];

export const homebrewAutomationEntries: HomebrewAutomationEntry[] = [
  {
    id: "heart-of-the-void",
    href: "https://www.dndbeyond.com/magic-items/11166813-heart-of-the-void",
    linkText: "Heart of the Void - Artifact Wondrous Item",
    title: "Heart of the Void Avrae Automation",
    code: heartOfVoidAlias,
    counterCommand: heartOfVoidCounterCommand,
    downloadName: "heart-of-the-void.yaml",
  },
  {
    id: "grief-taker",
    href: "https://www.dndbeyond.com/magic-items/11333779-grief-taker-the-edge-of-the-bound-martyr",
    linkText: "Grief-Taker, The Edge of the Bound Martyr",
    title: "Grief Taker Avrae Automation",
    code: griefTakerAlias,
    counterCommand: griefTakerCounterCommand,
    downloadName: "grief-taker.yaml",
  },
  {
    id: "grasp-of-ash",
    href: "https://www.dndbeyond.com/magic-items/11325377-grasp-of-ash-shuko-of-the-ashen-veil",
    linkText: "Grasp of Ash, Shuko of the Ashen Veil - Legendary Hand Claws",
    title: "Grasp of Ash Avrae Automation",
    code: graspOfAshAlias,
    setupCommands: graspOfAshCommands,
    downloadName: "grasp-of-ash.yaml",
  },
  {
    id: "psionophage",
    headingSelector: "h2",
    headingText: "Psionophage",
    title: "Psionophage Avrae Automation",
    code: psionophageAlias,
    setupCommands: psionophageCommands,
    downloadName: "psionophage.yaml",
  },
  {
    id: "firebrand",
    headingSelector: "h2",
    headingText: "Firebrand",
    title: "Firebrand Avrae Automation",
    code: firebrandAlias,
    downloadName: "firebrand.txt",
  },
  {
    id: "edict-of-mercy-and-ruin",
    headingSelector: "h2",
    headingText: "Edict of Mercy and Ruin",
    title: "Edict of Mercy and Ruin Avrae Automation",
    code: "",
    codeBlocks: edictOfMercyAndRuinCodeBlocks,
    setupCommands: edictOfMercyAndRuinCommands,
    downloadName: "edict-of-mercy-and-ruin.txt",
  },
  {
    id: "thematic-accompaniment",
    href: "https://www.dndbeyond.com/magic-items/11103877-thematic-accompaniment",
    linkText:
      "Thematic Accompaniment - Common, Uncommon, Rare, Very Rare, Legendary Wondrous Item",
    title: "Thematic Accompaniment Avrae Automation",
    code: thematicAccompanimentAlias,
    downloadName: "thematic-accompaniment.yaml",
  },
  {
    id: "amulet-of-the-night",
    href: "https://www.dndbeyond.com/magic-items/9255554-amulet-of-the-night",
    linkText: "Amulet of the Night - Very Rare Wondrous Item",
    title: "Amulet of the Night Avrae Automation",
    code: amuletOfTheNightAlias,
    downloadName: "amulet-of-the-night.txt",
  },
  {
    id: "vermin-kin",
    href: "https://www.dndbeyond.com/species/2058822-vermin-kin#Vermin-kinRaceDetails",
    linkText: "Vermin Kin",
    title: "Vermin Kin Avrae Setup",
    code: "",
    setupCommands: verminKinCommands,
    downloadName: "vermin-kin.txt",
  },
  {
    id: "kitsune",
    href: "https://www.dndbeyond.com/species/2019700-kitsune",
    linkText: "Kitsune",
    title: "Kitsune Avrae Automation",
    code: kitsuneAlias,
    downloadName: "kitsune.txt",
  },
  {
    id: "sanguine-regeneration",
    headingSelector: "h2",
    headingText: "Sanguine Regeneration",
    title: "Sanguine Regeneration Avrae Automation",
    code: "",
    codeBlocks: [
      {
        title: "Sanguine Boost",
        code: sanguineBoostAlias,
        downloadName: "sanguine-boost.txt",
      },
      {
        title: "Heal Others",
        code: healOthersAlias,
        downloadName: "heal-others.txt",
      },
      {
        title: "Sanguine Regeneration",
        code: sanguineRegenerationAlias,
        downloadName: "sanguine-regeneration.txt",
      },
      {
        title: "Sanguine Regeneration (Remarkable Recovery)",
        code: sanguineRegenerationRemarkableRecoveryAlias,
        downloadName: "sanguine-regeneration-remarkable-recovery.yaml",
      },
    ],
    downloadName: "sanguine-regeneration.txt",
  },
  {
    id: "arcane-ascendency",
    headingSelector: "h2",
    headingText: "Arcane Ascendancy",
    title: "Arcane Ascendancy Avrae Setup",
    code: "",
    setupCommands: arcaneAscendencyCommands,
    downloadName: "arcane-ascendency.txt",
  },
  {
    id: "edge-of-conquest",
    headingSelector: "h2",
    headingText: "Edge of Conquest",
    title: "Edge of Conquest Avrae Automation",
    code: edgeOfConquestAlias,
    setupCommands: edgeOfConquestCommands,
    downloadName: "edge-of-conquest.txt",
  },
  {
    id: "martyrs-vow",
    headingSelector: "h2",
    headingText: "Martyr's Vow",
    title: "Martyr's Vow Avrae Automation",
    code: martyrsVowAlias,
    downloadName: "martyrs-vow.txt",
  },
  {
    id: "hemophage",
    href: "https://www.dndbeyond.com/subclasses/2264535-hemophage",
    linkText: "Hemophage - Fighter Archetype",
    title: "Hemophage Avrae Automation",
    code: hemophageAlias,
    setupCommands: hemophageCommands,
    downloadName: "hemophage.yaml",
  },
  {
    id: "giant-domain",
    href: "https://www.dndbeyond.com/subclasses/2689109-giant-domain",
    linkText: "Giant Domain - Cleric Domain",
    title: "Giant Domain Avrae Automation",
    code: "",
    codeBlocks: giantDomainCodeBlocks,
    setupCommands: giantDomainCommands,
    downloadName: "giant-domain.txt",
  },
  {
    id: "shrinekeeper",
    href: "https://www.dndbeyond.com/subclasses/2659506-shrinekeeper",
    linkText: "Shrinekeeper - Cleric Domain",
    title: "Shrinekeeper Avrae Automation",
    code: "",
    codeBlocks: shrinekeeperCodeBlocks,
    setupCommands: shrinekeeperCommands,
    downloadName: "shrinekeeper.txt",
  },
  {
    id: "mistbloom",
    href: "https://www.dndbeyond.com/subclasses/2638462-mistblooom",
    linkText: "Mistbloom - Fighter Archetype",
    title: "Mistbloom Avrae Automation",
    code: "",
    codeBlocks: mistbloomCodeBlocks,
    setupCommands: mistbloomCommands,
    downloadName: "mistbloom.txt",
  },
  {
    id: "ashen-naginata-plus-3",
    href: "https://www.dndbeyond.com/magic-items/10894826-ashen-naginata-3",
    linkText: "Ashen Naginata +3 - Very Rare Glaive",
    title: "Ashen Naginata +3 Avrae Automation",
    code: ashenNaginataPlus3Alias,
    setupCommands: ashenNaginataPlus3Commands,
    downloadName: "ashen-naginata-plus-3.txt",
  },
  {
    id: "crucible-blade",
    href: "https://www.dndbeyond.com/magic-items/11079808-crucible-blade",
    linkText: "Crucible Blade - Very Rare Longsword",
    title: "Crucible Blade Avrae Automation",
    code: crucibleBladeAlias,
    downloadName: "crucible-blade.yaml",
  },
  {
    id: "threadbound",
    href: "https://www.dndbeyond.com/subclasses/2685081-threadbound-conductor",
    linkText: "Threadbound Conductor - Sorcerer Bloodline",
    title: "Threadbound Conductor Avrae Automation",
    code: "",
    codeBlocks: threadboundCodeBlocks,
    downloadName: "threadbound.txt",
  },
  {
    id: "warrior-of-the-forgotten-past",
    href: "https://www.dndbeyond.com/subclasses/2728617-warrior-of-the-forgotten-past",
    linkText: "Warrior of the Forgotten Past - Warrior",
    title: "Warrior of the Forgotten Past Avrae Automation",
    code: warriorOfTheForgottenPastAlias,
    downloadName: "warrior-of-the-forgotten-past.yaml",
  },
];
