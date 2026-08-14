const {
  LEVEL_ROLE_BRACKETS,
  getDesiredLevelRoleIds,
} = require("../../shared/levelRoles");
const { listAllWestMarchesCharacters } = require("./westMarches");

const LEVEL_ROLE_IDS = new Set(
  LEVEL_ROLE_BRACKETS.map((bracket) => bracket.roleId),
);

function groupCharactersByDiscordUser(characters) {
  const grouped = new Map();
  for (const character of characters) {
    const discordUserId = character?.user?.discordId;
    if (typeof discordUserId !== "string" || !/^\d+$/.test(discordUserId)) {
      continue;
    }
    if (!grouped.has(discordUserId)) {
      grouped.set(discordUserId, []);
    }
    grouped.get(discordUserId).push(character);
  }
  return grouped;
}

async function reconcileMemberLevelRoles(member, characters) {
  const desiredRoleIds = getDesiredLevelRoleIds(characters);
  const currentRoleIds = new Set(
    member.roles.cache
      .filter((_role, roleId) => LEVEL_ROLE_IDS.has(roleId))
      .map((role) => role.id),
  );
  const added = [...desiredRoleIds].filter((roleId) => !currentRoleIds.has(roleId));
  const removed = [...currentRoleIds].filter((roleId) => !desiredRoleIds.has(roleId));
  const result = { added: [], removed: [], failures: 0, neededChanges: added.length + removed.length };

  if (added.length > 0) {
    try {
      await member.roles.add(added, "Synchronizing character level brackets");
      result.added = added;
    } catch (error) {
      result.failures += 1;
      console.error(`Failed to add level roles to ${member.id}:`, error);
    }
  }
  if (removed.length > 0) {
    try {
      await member.roles.remove(removed, "Synchronizing character level brackets");
      result.removed = removed;
    } catch (error) {
      result.failures += 1;
      console.error(`Failed to remove level roles from ${member.id}:`, error);
    }
  }

  return result;
}

async function reconcileAllLevelRoles(guild) {
  const characters = await listAllWestMarchesCharacters();
  const charactersByUser = groupCharactersByDiscordUser(characters);
  const summary = {
    characterOwners: charactersByUser.size,
    membersChecked: 0,
    membersChanged: 0,
    alreadyCorrect: 0,
    membersMissing: 0,
    failures: 0,
    rolesAdded: 0,
    rolesRemoved: 0,
    addedByRole: new Map(),
    removedByRole: new Map(),
  };

  for (const [discordUserId, userCharacters] of charactersByUser) {
    let member;
    try {
      member = await guild.members.fetch(discordUserId);
    } catch (error) {
      if (error?.code === 10007) {
        summary.membersMissing += 1;
      } else {
        summary.failures += 1;
        console.error(`Failed to fetch guild member ${discordUserId}:`, error);
      }
      continue;
    }

    summary.membersChecked += 1;
    try {
      const result = await reconcileMemberLevelRoles(member, userCharacters);
      if (result.neededChanges === 0) {
        summary.alreadyCorrect += 1;
        continue;
      }
      if (result.added.length > 0 || result.removed.length > 0) {
        summary.membersChanged += 1;
      }
      if (result.failures > 0) {
        summary.failures += 1;
      }
      summary.rolesAdded += result.added.length;
      summary.rolesRemoved += result.removed.length;
      for (const roleId of result.added) {
        summary.addedByRole.set(roleId, (summary.addedByRole.get(roleId) || 0) + 1);
      }
      for (const roleId of result.removed) {
        summary.removedByRole.set(roleId, (summary.removedByRole.get(roleId) || 0) + 1);
      }
    } catch (error) {
      summary.failures += 1;
      console.error(`Failed to reconcile level roles for ${discordUserId}:`, error);
    }
  }

  return summary;
}

function formatReconciliationSummary(summary) {
  const roleLines = LEVEL_ROLE_BRACKETS.map((bracket) => {
    const added = summary.addedByRole.get(bracket.roleId) || 0;
    const removed = summary.removedByRole.get(bracket.roleId) || 0;
    return `- ${bracket.name}: +${added} / -${removed}`;
  });
  return [
    "**Level-role reconciliation complete**",
    `Character owners found: **${summary.characterOwners}**`,
    `Server members checked: **${summary.membersChecked}**`,
    `Members changed: **${summary.membersChanged}**`,
    `Already correct: **${summary.alreadyCorrect}**`,
    `Roles added: **${summary.rolesAdded}**`,
    `Roles removed: **${summary.rolesRemoved}**`,
    `No longer in server: **${summary.membersMissing}**`,
    `Failures: **${summary.failures}**`,
    "",
    "**Changes by bracket**",
    ...roleLines,
  ].join("\n");
}

module.exports = {
  formatReconciliationSummary,
  reconcileAllLevelRoles,
  reconcileMemberLevelRoles,
};
