ALTER TABLE side_quest_objectives ADD COLUMN IF NOT EXISTS flavor_text TEXT;

-- Apply title renames before the bulk upsert below, so existing rows are
-- updated in place instead of leaving orphaned rows behind under their old titles.
UPDATE side_quest_objectives o
SET title = 'Fancy Spells', updated_at = NOW()
FROM guilds g
WHERE o.guild_id = g.id AND g.slug = 'golden-quill' AND o.title = 'Flavour Flair';

UPDATE side_quest_objectives o
SET title = 'Omens of Destruction', updated_at = NOW()
FROM guilds g
WHERE o.guild_id = g.id AND g.slug = 'dread-legion' AND o.title = 'Flavour Flair';

UPDATE side_quest_objectives o
SET title = 'Wild, not War', updated_at = NOW()
FROM guilds g
WHERE o.guild_id = g.id AND g.slug = 'verdant-accord' AND o.title = 'Flavour Flair';

UPDATE side_quest_objectives o
SET title = 'Leave No Trace', updated_at = NOW()
FROM guilds g
WHERE o.guild_id = g.id AND g.slug = 'black-hand' AND o.title = 'Leave No Signature';

UPDATE side_quest_objectives o
SET title = 'Unseen Blade', updated_at = NOW()
FROM guilds g
WHERE o.guild_id = g.id AND g.slug = 'black-hand' AND o.title = 'No One Will Notice If There''s Nobody to Notice';

INSERT INTO side_quest_objectives (
  guild_id,
  title,
  description,
  flavor_text,
  sort_order,
  is_published
)
SELECT
  g.id,
  v.title,
  v.description,
  v.flavor_text,
  v.sort_order,
  true
FROM guilds g
JOIN (
  VALUES
    ('golden-quill','Fancy Spells','Before initiative is joined on a quest, use your highest level spell slot to do anything that is not a prebuff.',
      'A note in Elendel''s hand, delivered by a scribe who is visibly relieved to be rid of it.
"Use something enormous on something trivial and tell me exactly what happened. I have a theory."',10),
    ('golden-quill','Weave-r Happy','Have the first spell you cast during the quest use your highest available spell slot.',
      'You hear guildmistress Elendel''s voice, speaking to you without preamble, as though continuing a conversation you were not present for.
"Open with your heaviest. I want to know if the resistance is at the top of the channel or the bottom."',20),
    ('golden-quill','Write It Down Anyway','Return with a written record of the quest, made by you.',
      'A blank journal arrives at your door with a single line written inside the cover.
"Write it down. All of it. The boring parts especially. The boring parts are where the pattern hides."',30),
    ('golden-quill','Test the Claim','Take a piece of information the party was given and verify or disprove it firsthand.',
      'You receive a magical message from guildmistress Elendel.
"Somebody told you something. Go and find out whether they were right."',40),
    ('golden-quill','Recovered Text','Bring writing of any kind from the quest site back to the quest giver.',
      'You find a note on the next door you open, addressed to you specifically, in handwriting that gets smaller toward the end.
"Anything written. A letter, a ledger, a name scratched into a beam. Bring it."',50),
    ('golden-quill','The Method Matters','Successfully use a spell, item, or technique in a way it was not designed for.',
      'As you prepare your magics, a voice appears in your head:
"Use it "wrong". Deliberately. Then come back and explain why it worked."',60),
    ('golden-quill','Wrong Turn','Investigate something clearly irrelevant to the quest objective.',
      'A folded note, tucked into your pack without your noticing, damp at one corner.
"There will be something there that has nothing to do with why you went. Go and look at it anyway."',70),
    ('golden-quill','Arcane Might Displayed','Enter a single initiative with all of your highest level spell slots available, and end that initiative having spent all of them.',
      'A vision of guildmistress Elendel, who has clearly not slept, appears before you:
"Exhaust yourself in a single fight. We need to know what the weave feels like now."',80),
    ('golden-quill','Arcane Might Unwithstood','Have an enemy fail a saving throw against one of your spells.',
      'A vision of guildmistress Elendel, who has clearly not slept, appears before you:
"Overwhelm them with your magics. Then write what it was. Note what you cast."',90),
    ('golden-quill','Arcane Might Unerring','During at least 2 different turns, hit an enemy with a spell attack.',
      'A vision of guildmistress Elendel, who has clearly not slept, appears before you:
"Aim true. I want to test if the new Weave interferes with precision."',100),
    ('golden-quill','Read the Weave','Identify a magical effect, enchantment, or spell that you found at the quest site.',
      'The message arrives by self-scribing tome, which finishes the sentence as you read it.
"Somebody else''s magic is out there. Find out whose and what it was for."',110),

    ('iron-vanguard','Claim the Ground','After a significant enemy falls, go to its place and hold it until the end of initiative, and for 1 minute thereafter.',
      'Guildmistress Minerva delivers it at muster, in the tone of something she has said a thousand times and will say a thousand more.
"When it falls, hold where it fell. Ground is not taken until it is held."',10),
    ('iron-vanguard','Break the Chain of Command','Personally kill or capture the enemy leader before any other enemy in that encounter dies.',
      'General Ironwing taps a point on the map twice and moves on to the next briefing.
"The one giving orders. First. Before anything else."',20),
    ('iron-vanguard','Not One Lost','Ensure no party member is reduced to 0 Hit Points.',
      'Written beneath your orders, underlined, in General Minerva''s own hand.
"Nobody goes down. Not one. That is the standard."',30),
    ('iron-vanguard','Hold the Line','Never end your turn more than 15 feet from another party member.',
      'From the drill yard, shouted at you and everyone else:
"Never further than fifteen feet from another of yours. That line is the whole point."',40),
    ('iron-vanguard','The Standard Stands','At the start of the quest, you attach a banner to a party member. Ensure that the party member with the banner doesn''t fall to 0 HP for the duration of the quest.',
      'A Vanguard officer hands you a folded banner, with instructions folded into it.
"You carry the banner to them. They carry it home standing."',50),
    ('iron-vanguard','Spare the Innocent','Do not personally harm any enemy who did not attack first.',
      'She says this quietly, after the briefing has ended and the others have filed out.
"If it did not raise a hand to you, you do not raise one to it."',60),
    ('iron-vanguard','Kill the Guilty','Personally deliver the killing blow to at least one enemy that attacked first.',
      'Delivered briskly, in passing, without Minerva breaking stride.
"Something out there swings first. See that it does not swing twice."',70),
    ('iron-vanguard','Fair Fight','Kill an enemy from full HP without any other party member doing damage to it.',
      'In the training years, under the watchful gaze of General Ironwing, she shouts:
"From all to none, alone. No help. The Vanguard should know what it is worth by itself."',80),
    ('iron-vanguard','Draw Their Ire','At least once during the quest, end your turn in a position where you are the party member closest to all enemies.',
      'Delivered at the morning muster, as though it were the simplest thing in the world. To guildmistress Minerva, it is.
"Be the closest. Let them come to you. That is the whole job."',90),
    ('iron-vanguard','Thick of the Fight','End at least 5 of your turns within 5 feet of an enemy. Ending your turn within 5 feet of more than one enemy counts as ending your turn next to an enemy a number of times equal to the number of enemies within 5 feet of you.',
      'Training yards. It''s always at the training yard when General Minerva gives these out:
"In the face of the enemy, in the thick of the fight, that is our place."',100),
    ('iron-vanguard','Against the Unclean','Personally destroy a hostile undead, fiend, or aberration during the quest.',
      'A standing instruction, written into Vanguard orders since long before Minerva held command.
"From Unholy Abominations, to wretched mutants, to dread demons. All of them will fall before the might of the Vanguard."',110),
    ('iron-vanguard','Against the Unholy','Personally destroy a hostile humanoid, undead, or fiend during the quest.',
      'A standing instruction, written into Vanguard orders since long before Minerva held command.
"From Unholy Abominations, to wretched mutants, to dread demons. All of them will fall before the might of the Vanguard."',120),
    ('iron-vanguard','Against the Mutant','Personally destroy a hostile humanoid, aberration, or monstrosity during the quest.',
      'A standing instruction, written into Vanguard orders since long before Minerva held command.
"From Unholy Abominations, to wretched mutants, to dread demons. All of them will fall before the might of the Vanguard."',130),

    ('black-hand','One Cut','Within a single turn, reduce an enemy from full HP to none.',
      'The voice of Sarfir appears from the other side of a door that does not open.
"Full to nothing, at once. That is the quality we need."',10),
    ('black-hand','Leave No Trace','Ensure no surviving witness can identify you.',
      'A draconic shadow falls down on you, and looking up you see Sarfir on her shadow dragon flying above you. No one else seems to see her:
"Nobody walks away able to describe you. Nobody."',20),
    ('black-hand','The Blade of Shadows','Allow no enemy combatant to leave the quest alive.',
      'Your own shadow shifts, and you hear the voice of Ehrendil coming from it:
"Nobody will notice, if there''s nobody to notice."',25),
    ('black-hand','The Deserving','Establish through evidence or confession that a target was guilty of a specific crime or has done harm before you kill them.',
      'Yuki appears before you as you are about to go to sleep:
"The Hand has been wrong before, and does not intend to be again. Know what they did before you do it. We do not take the word of the person paying."',30),
    ('black-hand','A Debt Repaid','Aid someone who cannot pay you, or refuse your share of gold rewards from the quest.',
      'Yuki does not explain this one. She never explains this kind, and you have learned not to ask.
"Someone out there cannot pay. Help them anyway, and take nothing for it."',40),
    ('black-hand','Cut the Root','Identify who gave the orders, not just who carried them out, by speaking to an enemy as an action during combat.',
      'Folded into something else entirely, which you notice only later. Sarfir''s hand.... you think... maybe...
"The hand that held the knife is not the one that matters. Ask them who sent them. Mid-fight, if you must."',50),
    ('black-hand','Unseen Blade','Personally deliver the killing blow to at least one enemy without any other enemy witnessing it.',
      'Emerging from a shadowed corner, Ehrendil speaks to you, before disappearing in a puff of black smoke:
"One kill, unseen by anything still breathing."',60),
    ('black-hand','Must Have Been the Wind','End a combat encounter having never been the target of a successful enemy attack.',
      'Yuki finds you in a crowd, says a few words, and is gone before you notice her properly.
"Not a scratch. If they touched you, they knew you were there."',70),
    ('black-hand','Clean Work','Complete the quest without leaving any collateral damage: no structures broken, no bystanders harmed, nothing burned.',
      'No signature, no seal, and no indication of which of the three wrote it.
"Nothing burned, nothing broken, nobody caught in it. Clean work or no work."',80),
    ('black-hand','No Trace','Complete the quest without leaving any evidence that you were ever there.',
      'A small black and purple draconic figure, no larger than 5 feet, delivers a small note to you. The note, and the dragon, disappear as soon as you finish reading it.
"When you leave, that place should have no reason to think you ever came."',90),
    ('black-hand','The Kindness Nobody Sees','Do something quietly good for someone during the quest without any party member (to your knowledge) noticing you do it.',
      'Ehrendil says this last, quietly, after the real orders are finished. He does not say whose instruction it is, and you do not need to be told.
"Do one decent thing out there and tell nobody. Not even the ones you travel with."',100),

    ('dread-legion','Omens of Destruction','Before initiative is joined on a quest, use your highest level spell slot to do anything that is not a prebuff.',
      'A raven lands on your shoulder, before dissolving into dark mist. You hear a voice from the mist.
"We are renowned for bringing death everywhere we go. Prove that is the only thing we bring."',10),
    ('dread-legion','Power of Darkness','Have the first spell you cast during the quest use your highest available spell slot.',
      'A skeleton rattles its way towards you, before opening its mouth to deliver a message, then collapsing on the ground:
"The Weave is strong here. We need to know what that means. Test it."',20),
    ('dread-legion','Harvest the Fallen','Personally reduce at least three enemies to 0 Hit Points with necrotic, poison, or cold damage, or damage from summons.',
      'A ledger appears in your bags. Three marks are already drawn in the ledger beneath your name, waiting to be filled, alongside a writing:
"Three. Rot, cold, poison, or whatever answers your call. The method is noted; the number is not negotiable."',30),
    ('dread-legion','Nothing Wasted','Ensure no enemy corpse is left behind: destroy, animate, or claim every body before leaving the site.',
      'Several skeletons, carrying many different scrolls, notes, and books, rattle towards you, give you a note, and then leave the same way they came:
"No body left where it fell. Burn it, raise it, claim it. But nothing is left."',40),
    ('dread-legion','Bloom from Rot','Heal or restore a creature to life, undeath, health, or freedom in a place where something died during the quest.',
      'A presence of death surrounds you, as you hear Archlich Belakai''s voice carried by the Weave:
"Something ended there. See that something begins there too. The cycle does not run one way."',50),
    ('dread-legion','Names for the Ledger','Learn the true name of an enemy who dies during the quest, and speak it aloud before leaving.',
      'Belakai''s right hand, Josei, personally comes to you to deliver a page. There is a blank line on it, and it is waiting.
"A name, spoken aloud before you leave. The ledger is not complete otherwise."',60),
    ('dread-legion','Take What Endures','Recover an object from the site that predates its current occupants.',
      'The order comes with a description written by someone who has been dead a very long time.
"Whatsoever doth abide within that place was there ere these present dwellers came to it. Fetch it hence again."',70),
    ('dread-legion','Troops for the Legion','Personally deliver the killing blow to at least one enemy during the quest.',
      'Archlich Belakai returned to Legion''s Spire a few days ago, with some of his legions having gaps in their ranks. He glanced at you watching him from the ramparts, and issued a command:
"We need more bodies for the legions. Make at least one."',80),
    ('dread-legion','What Was Owed','Collect something from an enemy that it took from someone else.',
      'The Legion keeps records of debts older than most of the people who owe them. The archlich has read all of them, and assigns one to you:
"Something was taken from someone. Take it back and see it returned."',90),
    ('dread-legion','Speak With the Dead','Learn something from a corpse, a grave, a ghost, or a record at the quest site.',
      'A skeleton finds its way towards you, and speaks, before returning the same way it came:
"The dead rarely stay silent. See what they have to say."',100),
    ('dread-legion','The Rites Observed','Give proper burial, prayer, or remembrance to the dead at the quest site, whoever they were and however they died.',
      'Some of Guildmaster Belakai''s oldest standing orders are the gentlest. Nobody in the Legion finds this strange. One of them reads:
"Whoever they were. The Legion does not leave the dead unmarked."',110),
    ('dread-legion','Endings Are Not Wasted','Turn a death of someone during the quest into something the party gains from.',
      'Guildmaster Belakai closes the ledger before turning to you:
"Something will die out there. See that it counts for something."',120),

    ('dawnwardens','Do Not Leave Them There','Find someone in genuine trouble who was not part of the objective, and help them.',
      'Oriana catches your hand before you go, and insists:
"There will be someone out there nobody sent you for. Do not leave them there."',10),
    ('dawnwardens','Everyone Comes Home','Ensure every party member is conscious and every rescued person alive at the quest''s end.',
      'You see a flash of light at the corner of your eye. Moments later you hear a voice in your head:
"All of them. Yours and theirs and whoever you find along the way. All of them home."',20),
    ('dawnwardens','The Harder Mercy','You personally must not kill anyone during the quest.',
      'Guildmistress Oriana seeks you out personally as you prepare to leave:
"Not one death by your hand this time. I know what I am asking. That is why I am asking."',30),
    ('dawnwardens','Endure It','Deal no damage to hostile creatures during the first round of any combat with hostile enemies.',
      'In the sanctuary hall, beneath the stained glass, you hear a voice pitched not to carry.
"Take the first round without answering it. There is a kind of strength in that which nothing else teaches."',40),
    ('dawnwardens','The Rites Observed','Give proper burial, prayer, or remembrance to the dead at the quest site, whoever they were and however they died.',
      'A folded note left with your things, in a careful, unhurried hand.
"Whoever they were. Whatever they did. Say the words over them."',50),
    ('dawnwardens','Wrath of the Just','Personally deliver the killing blow to at least one enemy that harmed a civilian or non-combatant.',
      'Guildmistress Oriana rarely sounds like this. You notice it immediately:
"Someone out there has hurt people who could not stop them. End it."',60),
    ('dawnwardens','Lightbringer','Bring literal or magical light into a place that has been in the dark.',
      'Oriana holds a lantern as she approaches you. It is an ordinary lantern.
"Take light somewhere that has been without it. Literally, if you can manage it."',70),
    ('dawnwardens','Speak the Words','Openly declare your faith, your cause, or your conviction to an enemy before fighting them.',
      'From the Keep steps, as you are already leaving, you hear a voice from nowhere:
"Tell them what you stand for before you raise your hand. They deserve to know what is coming."',80),
    ('dawnwardens','Against the Unclean','Personally destroy a hostile undead, fiend, or aberration during the quest.',
      'A message relayed through one of the Keep''s clerics, who repeats it word for word.
"There are things out there that should not walk. See that one of them stops."',90),
    ('dawnwardens','Against the Unholy','Personally destroy a hostile humanoid, undead, or fiend during the quest.',
      'A message relayed through one of the Keep''s clerics, who repeats it word for word.
"There are things out there that should not walk. See that one of them stops."',100),
    ('dawnwardens','Against the Mutant','Personally destroy a hostile humanoid, aberration, or monstrosity during the quest.',
      'A message relayed through one of the Keep''s clerics, who repeats it word for word.
"There are things out there that should not walk. See that one of them stops."',110),
    ('dawnwardens','Hold the Ground','End two consecutive turns in combat in the same location.',
      'An officer from Tranquility Keep stops you for a moment as you leave:
"The guildmistress has a mission for you. Prove you can stand your ground against any odds."',120),
    ('dawnwardens','Dazzling Flash of Light','Have the first spell you cast during the quest use your highest available spell slot.',
      'Your soul itself fills with light, as you feel guildmistress Oriana''s presence around you:
"Open bright. Let whatever is waiting out there know the Wardens came."',130),

    ('verdant-accord','Wild, not War','Before initiative is joined on a quest, use your highest level spell slot to do anything that is not a prebuff.',
      'The nearest patch of moss, grass or leaves speaks with a voice you recognize as Tryza''s:
"We need to see how it reacts when it is not under stress."',10),
    ('verdant-accord','Wild Energies','Have the first spell you cast during the quest use your highest available spell slot.',
      'The nearest patch of moss, grass or leaves speaks with a voice you recognize as Tryza''s:
"Do not restrain yourself. The current is high. Drink deeply while it is."',20),
    ('verdant-accord','Leave No Scar','Do not destroy or deliberately damage any natural terrain, plant life, or non-hostile creature.',
      'You feel a presence observing you, even before it makes direct contact. You then hear guildmaster Tryza''s voice inside your head:
"We will know. We always know. Walk carefully. Defend the land."',30),
    ('verdant-accord','Only What Is Needed','Do not personally kill any creature that you could have bypassed, restrained, frightened off, or otherwise handled non-lethally.',
      'You feel a presence observing you, even before it makes direct contact. You then hear guildmaster Tryza''s voice inside your head:
"A thing that can be turned aside does not need to be ended. Take only what you must."',40),
    ('verdant-accord','Return to the Earth','Before leaving, make sure you bury, compost, or otherwise return at least one slain creature to the natural cycle.',
      'The words arrive with the smell of turned soil, and you are not certain you heard them rather than remembered them:
"What is left above the soil is wasted. Give it back and it becomes something again."',50),
    ('verdant-accord','Shelter the Small','Protect a non-combatant animal, plant, nest, den, grove, or similar vulnerable part of the local ecosystem from harm.',
      'You feel a presence observing you, even before it makes direct contact. You then hear guildmaster Tryza''s voice inside your head:
"The large things can flee. The small things cannot. Stand where they cannot."',60),
    ('verdant-accord','Weather the Storm','Overcome a significant natural hazard without magically bypassing it entirely.',
      'Spores drift across the light in a shape that resolves, briefly, into meaning.
"Do not step around it. Step through it. You will understand it better afterward."',70),
    ('verdant-accord','Sanctuary','Establish a safe place where local wildlife or civilians can shelter from the quest''s threat.',
      'The moss on your doorframe has arranged itself into words. It does this sometimes.
"Somewhere in that place, something will need a place to hide. Make one."',80),
    ('verdant-accord','Rewild It','Leave behind something growing where nothing grew before: plant, seed, or mushroom.',
      'A seed you did not put there has appeared in your palm. Tryza''s voice follows it.
"Leave something behind that will still be there when you are not."',90),
    ('verdant-accord','The Land Provides','Sustain yourself or the party for the duration of the quest using only what the land offers.',
      'You put your hand to the ground to steady yourself, and Tryza is already there, waiting.
"You carry too much. Put it down and let the ground feed you. It is willing."',100),

    ('dragons-den-of-drama','Bring Back the Story','Make a short song, spectacle, or poem about the quest and bring it back to the Poet''s Hoard.',
      'Veylis says this mid-tuning, without stopping the tuning.
"Something written, sung, or performed. Length is irrelevant. Come back with it finished."',10),
    ('dragons-den-of-drama','A Fitting Exit','End a significant encounter with a line, gesture, or flourish.',
      'Guildmaster Veylis stops you at the door, purely so he can say this and then let you go.
"End one fight properly. A line, a gesture, anything. Endings are the part people remember."',20),
    ('dragons-den-of-drama','Prepare for Action','Spend at least one full Action doing nothing, mechanically, while in an active initiative with hostile enemies.',
      'You hear a tune in the air, as you recognize Guildmaster Veylis''s voice coming alongside it:
"Spend an entire action doing nothing whatsoever. Magnificently. Sometimes standing there, menacingly, does more than you think."',30),
    ('dragons-den-of-drama','You Dare Touch Me?!','You cannot target any enemy who hasn''t yet damaged or affected you in any way.',
      'In a dramatic display, Guildmaster Veylis halts you as you leave:
"You are wounded. You are outraged. Nothing else in the room exists until this is settled."',40),
    ('dragons-den-of-drama','Woe Is Me!','At least once during the quest, before rolling an attack, declare that it misses and describe the failure in as tragic and overwrought a manner as you can manage.',
      'A note in violently theatrical handwriting, with three separate underlines.
"Make them see the true meaning of DRAMA!"',50),
    ('dragons-den-of-drama','Apparel Appeal','Describe your character wearing different clothing and/or equipment than the last time you described them.',
      'Veylis looks you up and down, says nothing for a moment, and then continues:
"Nobody wears the same thing twice. It''s not a rule. It''s simply true of anyone worth watching."',60),
    ('dragons-den-of-drama','Slogan to Die For','Repeat a flourish, catchphrase, or gesture at least three times during the quest, in three different situations.',
      'From the gardens, where he is playing something to an audience of one portrait and two ghosts.
"Find your line. Use it three times. By the third, they''ll be waiting for it."',70),

    ('crucible-of-creation','Salvage Rights','Recover materials, components, or intact mechanisms from something broken or destroyed during the quest.',
      'Sayaka shouts this down at you from somewhere above the walkways, already moving out of sight.
"Whatever breaks out there, bring me the pieces. I don''t care how small. Especially if it''s small."',10),
    ('crucible-of-creation','Improvised Solution','Solve a problem or kill an enemy using only materials or terrain found at the quest site.',
      'Sayaka, upside down, adjusting something in the rafters that probably should not be adjusted, speaks to you as you leave the Embervault Crucible.
"No supplies. Nothing from the forge. Just what''s lying around. Prove it can be done."',20),
    ('crucible-of-creation','Field Friend','You are given a construct prototype to test: a Small construct using a Modron Monodrone''s statistics. It follows your commands to the best of its ability. Ensure it survives until the end of the quest.',
      'Ryusei presses something small and whirring into your hands before you have agreed to anything.
"This is a prototype. It will follow you. It will probably try to help. Bring it home in one piece — I have not made another."',30),
    ('crucible-of-creation','Science!','You are given a Wand of Magic Missiles with seven charges. Use it to deliver the killing blow on a hostile enemy before the quest ends and report the result. The wand disappears afterwards.',
      'A wand, a form to sign, and Sayaka already talking before you have even finished reading it.
"Seven charges. One enemy. I want to know exactly what happens at the end. Don''t leave out the part where it stops working."',40),
    ('crucible-of-creation','Dismantle','Dismantle a structure, construction, or creation during the quest using skill rather than force.',
      'Ryusei speaks without looking up, a page settling into his hand as he does.
"Take it apart properly. Anyone can knock a thing down. Knowing where it comes apart is the skill."',50),
    ('crucible-of-creation','I Knew It Would Come In Handy','Make use of an item you normally don''t, during the quest.',
      'A scroll unrolls itself at eye level in front of you. Shiori is nowhere in sight.
"Everything in your pack was made for a reason. Find the reason for the thing you never use."',60),
    ('crucible-of-creation','Deadly Contraption-thing','Reduce a significant enemy to 0 HP using the ability of an item you have equipped.',
      'Ryusei finds you preparing to leave, and speaks:
"Use your own work, not your hands. Let the thing you made be the thing that matters."',70),

    ('the-argent-mark','See It First','Personally detect the quest''s primary threat before it detects the party.',
      'Varek speaks to you from the nearest rampart without turning around:
"See it first. That is the whole of it."',10),
    ('the-argent-mark','Never Surprised','Never be surprised or ambushed during the quest.',
      'A single line, written on the back of your orders in a small, even hand.
"Nothing out there should reach you before you have reached it. Not once."',20),
    ('the-argent-mark','Long Shot','Reduce a significant enemy to 0 Hit Points without it ever coming within 20 feet of you.',
      'He watches the valley while he speaks, and does not look at you once.
"Finish it at distance. If it gets close, you waited too long."',30),
    ('the-argent-mark','The High Ground','Hold an elevated or commanding position for the duration of an encounter.',
      'Varek marks a point on your map with one finger and speaks.
"Choose your ground before the fight chooses it for you. Then keep it."',40),
    ('the-argent-mark','Just As Planned','Successfully surprise or ambush at least one enemy during the quest.',
      'Varek finds you at the gate as you leave, and speaks in a calm, but firm tone.
"Be the one who was already there when they arrived."',50),
    ('the-argent-mark','Prepare for Strike','At least once during the quest, take the Ready action and take no other Action, Bonus Action, or Reaction that turn.',
      'Varek hands you nothing, asks for nothing, and gives you one instruction.
"One turn. Draw, wait, and do nothing else. Most of you have never learned to wait."',60),
    ('the-argent-mark','Keep Your Distance','Reduce a significant enemy to 0 Hit Points while more than 30 feet away from it.',
      'From the training yard, where he has been watching longer than you realised.
"Thirty feet is not a suggestion. It is the most you can ever give them. For if you allow them to get closer, it might be too late."',70),
    ('the-argent-mark','Called Shot','At least twice during the quest, declare your target at the start of your turn (no action required) and hit the target with at least one attack before the end of the current turn.',
      'He runs his thumb along a horn while he considers you, then decides.
"Say what you mean to hit before you hit it. Twice. Anyone can claim a shot afterward."',80),
    ('the-argent-mark','Marked Target','At the start of initiative, declare a target as your quarry. You cannot target other enemies with attacks while your quarry still stands.',
      'Written in the margin of your assignment, underlined once.
"Pick one. Then let nothing else exist until it is down."',90),

    ('the-ashen-veil','Knowledge of the Slayer','Identify a creature''s nature, type, resistances, immunities, or any notable ability before fighting it, using investigation, lore, magic, or firsthand observation of any kind.',
      'Delivered the way your training was: once, without repetition, and with no interest in whether you were ready for it.
"Know what it is before you swing. That is the difference between us and corpses."',10),
    ('the-ashen-veil','Blade of Silver','Defeat a significant enemy using a damage type, weapon, spell, item, or other method specifically chosen because of that creature''s known weakness.',
      'A master of the Veil taps the page twice and waits for you to read it properly.
"Everything has a weakness. Find it, then use it. Not brute force, use the right answer."',20),
    ('the-ashen-veil','For a Price','Before the quest ends, speak with an NPC who has a problem with a creature and agree to resolve it.',
      'The contract is already half filled in when it reaches you. It usually is.
"Someone out there has a problem with a thing. Take the contract properly."',30),
    ('the-ashen-veil','Trophy Taken','Recover a meaningful physical trophy from a defeated creature as proof of your work.',
      'The Ashen Veil operative does not look at you while he says it. He rarely does.
"Bring something back. Claims are worth nothing. Proof is worth the coin."',40),
    ('the-ashen-veil','Preparation for Peril','Successfully use a consumable, tool, potion, poison, oil, trap, or other consumable to counter or nullify a creature''s ability.',
      'A small case is set down in front of you and pushed across the table without comment.
"Oil, poison, trap, potion. Prepared beats strong. Use something you brought on purpose."',50),
    ('the-ashen-veil','The Lesser Evil','Choose between two morally grey (unpleasant) outcomes and deliberately accept the one that causes the lesser harm.',
      'Said in the tone of a man who has had to do it himself, more than once, and remembers each time, the Ashen Veil operative speaks to you:
"Neither answer will be clean. Choose the one that costs less and do not agonise over it."',60),
    ('the-ashen-veil','Pay Me When It''s Done','Complete the quest without receiving payment, loot, or another promised reward until the very end.',
      'A rule of the Veil, recited rather than explained. Nobody explains the rules of the Veil.
"Nothing up front. Nothing partway. You take payment when the work is finished."',70),
    ('the-ashen-veil','Defy Death','Defeat an opponent after it has reduced you to 0 HP.',
      'The one who taught you says this, and does not pretend it is encouragement.
"If it puts you down and you get back up and finish it."',80),
    ('the-ashen-veil','The Butcher''s Work','Reduce a significant monster from full health to 0 HP using only mundane weapons, items, or the environment.',
      'Delivered while he sharpens something, at length, without hurrying and without stopping.
"Steel and wit. Nothing else. Everyone should know they can still do it that way."',90),
    ('the-ashen-veil','Duel the Dealer','Defeat a significant opponent in a 1-on-1 duel without outside assistance (even if they break the 1-on-1).',
      'One line, spoken at the door, with no goodbye attached to it.
"One on one. If they bring others, that is their shame, not your excuse."',100),

    ('wayfarers-respite','A Home to All','Establish an outpost (building one or taking a building) of the Wayfarers Respite.',
      'Potto slides a drink across before you have asked for one, then leans on the bar with both elbows.
"Somewhere out there wants a roof and a fire. Put one up. Doesn''t need to be pretty."',10),
    ('wayfarers-respite','HUIAHDUIGHAUI','Challenge a significant enemy to a drinking contest (by spending an action in initiative). Then beat them in that contest (or beat them up).',
      'After having "a few" drinks, Potto stumbles and mutters:
"Wha??? you can wjha? Next.... BIIG feller you see...... FIGHT ''IM. ...... And don''t lose.... duh."',20),
    ('wayfarers-respite','A Drink With the Lads','Successfully avoid an encounter by befriending the enemies or talking them down.',
      'Potto shouts it after you as you reach the door, along with something considerably less repeatable.
"Not everything with a weapon wants to use it. Find out which, and buy them one."',30),
    ('wayfarers-respite','Make It Fair','Use your guild benefit on an enemy, then beat them in a battle.',
      'Potto says this while polishing a glass he has already polished twice, having forgotten both times.
"Even the odds, then win anyway. Anyone can win a fight they rigged."',40),
    ('wayfarers-respite','Light the Way','Make one encouraging speech that rallies an NPC to your cause.',
      'Someone at the end of the bar says it first. Potto nods along, then repeats it as though it were his own.
"Somebody out there needs telling that it''s worth it. You''ve got the voice for it."',50),
    ('wayfarers-respite','The Bartender','Listen to someone''s struggles and give them good advice.',
      'Potto says this one seriously, which is rare enough that you remember it afterward. For a moment he sounds like someone else entirely.
"Sit with somebody. Listen properly. Say something useful. That''s the job, really. Awfully hard for some, apparently."',60),

    ('eclipsed-choir','Find Your Voice','Use a Performance check to de-escalate a situation.',
      'A conductor from the Choir gives you the note before the instruction, as though you would need it to understand.
"Sing it down before you strike it. The room will follow if you pitch it right."',10),
    ('eclipsed-choir','The First Note','Be the first creature to willingly make a sound during an encounter.',
      'Delivered as a cue rather than a sentence, one hand raised and held until you acknowledge it.
"Be the first sound in that fight. Everything after takes its time from you."',20),
    ('eclipsed-choir','Direct Dissonance','Cause an enemy to suffer a condition or otherwise become impaired within a round of another party member affecting them.',
      'Two beats marked on the table with two fingers, in a rhythm you find yourself keeping for hours afterward.
"Follow someone. Land yours within a round of theirs. Two voices, one chord."',30),
    ('eclipsed-choir','Conduct the Choir','Successfully direct another creature''s action, movement, or ability in a way that directly contributes to overcoming an obstacle.',
      'Said without turning from the score, which is not written in any notation you recognise, and which moves slightly when you are not looking at it.
"Do not act. Make someone else act, correctly, at the right moment."',40),
    ('eclipsed-choir','Encore','Repeat the same successful action, spell, or ability against the same target on two consecutive turns.',
      'The instruction is given twice, identically, in the same breath. That is evidently the point.
"The same thing twice, the same target, back to back. Repetition is not a failure of imagination. It is the mother of success."',50),
    ('eclipsed-choir','The Soloist','Successfully complete a significant part of the quest while acting entirely alone, without assistance from another party member.',
      'The conductor lowers both hands, and every other sound in the hall stops with them.
"There will be a moment where you are alone. Carry it by yourself."',60),
    ('eclipsed-choir','A Voice in the Dark','Communicate with or persuade a creature that cannot understand your language using only sound, rhythm, music, or song.',
      'Hummed at you first and only then explained.
"Something out there shares no language with you. Reach it anyway."',70),
    ('eclipsed-choir','They Shall Sing Your Name','Learn the name of a creature encountered during the quest and use it in conversation with them.',
      'The conductor says your own name first, deliberately, and it sounds different in that voice than it does in yours.
"Learn what it is called. Then use it. Names change a conversation."',80),
    ('eclipsed-choir','Break the Rhythm','Interrupt an enemy''s ongoing action, spell, ritual, or ability.',
      'A sharp gesture cuts the air mid-phrase, and the chanting behind the door stops with it.
"Something out there will be building toward something. Stop it mid-measure."',90),
    ('eclipsed-choir','The Eclipsed Verse','Witness something beautiful, terrible, or otherwise extraordinary during the quest and preserve it through music before leaving.',
      'A blank page of staff paper is handed to you. Nothing more is said until you take it.
"You will see something out there worth keeping. Keep it in music before it fades."',100)
) AS v(guild_slug, title, description, flavor_text, sort_order)
  ON v.guild_slug = g.slug
ON CONFLICT (guild_id, title) DO UPDATE
SET
  description = EXCLUDED.description,
  flavor_text = EXCLUDED.flavor_text,
  sort_order = EXCLUDED.sort_order,
  is_published = EXCLUDED.is_published,
  updated_at = NOW();
