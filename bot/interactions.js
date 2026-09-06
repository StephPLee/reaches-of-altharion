const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js");
const config = require("./config");
const { buildHelpMessages } = require("./commands");
const { hasDmOrRequiredRole, hasRequiredRole } = require("./permissions");
const { getDisplayName } = require("./utils");
const { getOrAssignCampaign } = require("./services/campaigns");
const { resolveCraftConfirmation } = require("./services/craftWatcher");
const {
  buildBossHealthEmbed,
  buildBossLogEmbed,
  buildBossStatusEmbed,
  formatBossHp,
  getActiveBoss,
  listBossLogEntries,
  postOrRefreshBossStatus,
  recordBossHpEntry,
  startBossFight,
} = require("./services/bosses");
const { buildFaqEmbeds, listFaqEntries } = require("./services/faq");
const {
  buildQuestCallCharacterRow,
  buildQuestCallEmbed,
  buildQuestCallMessageComponents,
  closeQuestCall,
  createQuestCall,
  getQuestCall,
  listCallResponses,
  listUserResponseCharacterIds,
  setCharacterResponses,
  setQuestCallMessageId,
} = require("./services/questCalls");
const {
  awardHourlyRewardToCharacter,
  awardScToCharacters,
  approveWestMarchesCharacter,
  buildCharacterListEmbed,
  buildRetireCharacterRow,
  buildScRewardCharacterRow,
  findUnapprovedCharacterForDiscordUser,
  formatCharacterClass,
  formatCharacterName,
  getOwnedActiveWestMarchesCharacter,
  getScRewardCharacterPreference,
  getWestMarchesCharacter,
  grantWestMarchesItem,
  isWestMarchesConfigured,
  listHighestLevelActiveCharactersForDiscordUsers,
  listOwnedActiveWestMarchesCharacters,
  listOwnedCharacterSummaries,
  normalizeCharacterLevel,
  retireWestMarchesCharacter,
  upsertScRewardCharacterPreference,
} = require("./services/westMarches");
const {
  acquireObjectiveForCharacter,
  addRenown,
  buildQuestAcquireCharacterRow,
  buildQuestListCharacterRow,
  buildQuestRedeemCharacterRow,
  buildQuestRedeemObjectivesRow,
  buildQuestRedeemRarityRow,
  buildQuestRedeemTierRow,
  buildQuestRerollCharacterRow,
  buildQuestRerollObjectiveRow,
  formatRenownProgress,
  getAllRenownForCharacter,
  getRandomPublishedGuildId,
  incrementRetrainCredit,
  listActiveObjectivesForCharacter,
  listCharactersWithActiveObjectives,
  listCharactersWithCompletedUnredeemedObjectives,
  listCompletedUnredeemedObjectivesForCharacter,
  listRedeemedObjectivesForCharacter,
  markObjectivesRedeemed,
  parseQuestRerollObjectiveCustomId,
  rerollObjective,
} = require("./services/sideQuests");
const { getRewardRow } = require("../shared/rewardTable");
const {
  DuplicateActiveListingError,
  buildCancelListingRow,
  buildCancelRequestRow,
  buildRequestCharacterRow,
  buildRequestModal,
  buildSellCharacterRow,
  buildSellItemRow,
  buildSellPriceModal,
  cancelListing,
  cancelRequest,
  createListing,
  createRequest,
  findActiveListingByCharacterAndItem,
  formatListingPrice,
  formatRequestPrice,
  getCharacterInventory,
  listActiveListingsForCharacter,
  listActiveListingsForDiscordUser,
  listOpenRequestsForDiscordUser,
} = require("./services/playerMarketplace");
const {
  updatePlayerMarketplaceMessage,
  updatePlayerRequestMessage,
} = require("./services/playerMarketplaceDiscord");
const {
  buildJoinGuildCharacterRow,
  buildJoinGuildGuildRow,
  buildLeaveGuildCharacterRow,
  deleteGuildRosterMembership,
  formatDiscordTimestamp,
  getGuildRosterCooldownUntil,
  getGuildRosterMembership,
  isDiscordUserStillInGuild,
  listGuildRosterMembershipsForDiscordUser,
  listPublishedGuilds,
  parseJoinGuildGuildCustomId,
  updateGuildRosterMessages,
  upsertGuildRosterMembership,
} = require("./services/guildRosters");
const {
  approveHomebrew,
  buildApprovalAnnouncement,
  buildApproveCategoryRow,
  buildApproveDetailRow,
  buildApproveModal,
  categoryNeedsDetail,
  categoryUsesMarkdown,
  getApproveTarget,
  getCategory,
} = require("./services/approval");
const {
  chunkMentionLines,
  collectHomebrewDiscussionParticipants,
} = require("./services/homebrewDiscussion");
const {
  MAGIC_ITEM_RARITIES,
  buildMagicItemRarityRow,
  buildMagicItemResultEmbed,
  getRandomMagicItem,
} = require("./services/magicItems");
const {
  endRpSession,
  formatRpDuration,
  getRpSessionStatus,
  pauseRpSession,
  resumeRpSession,
  startRpSession,
} = require("./services/rpSessions");
const {
  deleteStatRollsByRoller,
  markStatRollSetClaimed,
  rollFiveStatLines,
  saveStatRollSets,
} = require("./services/statRolls");
const {
  postAllStartingGracesToDiscord,
  postWikiSectionsToDiscord,
} = require("./services/discordContent");
const {
  buildStickyModal,
  clearStickyMessage,
  getStickyMessage,
  postSticky,
  setStickyMessage,
} = require("./services/stickyMessages");

const { buildFeedbackModal, saveDiscordFeedback } = require("./services/feedback");
const { buildBookRequestModal, saveDiscordBookRequest } = require("./services/bookRequests");
const {
  formatChangeDetails,
  formatReconciliationPreview,
  formatReconciliationSummary,
  previewAllLevelRoleChanges,
  reconcileAllLevelRoles,
} = require("./services/levelRoles");

const pendingStatRolls = new Map(); // discordUserId → { statLines, timestamp }
const pendingApprovals = new Map(); // discordUserId → { name, url, threadUrl, submissionUrl }

const pendingLevelRoleSyncs = new Map();
const pendingSideQuestRedemptions = new Map(); // discordUserId → { characterId, objectiveIds, tier }

function buildLevelRoleSyncButtons(discordUserId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`level-role-sync-apply:${discordUserId}`)
      .setLabel("Apply all changes")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`level-role-sync-cancel:${discordUserId}`)
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary),
  );
}

function parseSubmissionContent(content, embeds = []) {
  const searchText = [
    content,
    ...embeds.map((e) => [e.description ?? "", ...e.fields.map((f) => `${f.name}: ${f.value}`)].join("\n")),
  ].join("\n");

  const name = searchText.match(/\*{0,2}Name of Homebrew:\*{0,2}\s*(.+)/i)?.[1]?.trim() ?? "";

  function extractUrl(fieldPattern) {
    const line = searchText.match(fieldPattern)?.[1] ?? "";
    return (
      line.match(/\(<?(https?:\/\/[^>)\s]+)>?\)/)?.[1] ??
      line.match(/(https?:\/\/\S+)/)?.[1] ??
      ""
    ).trim();
  }

  const url = extractUrl(/\*{0,2}Link to Homebrew:\*{0,2}(.+)/i);
  const threadUrl = extractUrl(/\*{0,2}Link to Workshop Discussion:\*{0,2}(.+)/i);

  return { name, url, threadUrl };
}

function getBossDamageQuestMultiplier(questLevel) {
  if (questLevel === null || questLevel === undefined) {
    return 1n;
  }

  if (questLevel >= 18 && questLevel <= 20) {
    return 1n;
  }

  if (questLevel >= 14 && questLevel <= 17) {
    return 3n;
  }

  if (questLevel >= 9 && questLevel <= 13) {
    return 5n;
  }

  if (questLevel >= 4 && questLevel <= 8) {
    return 10n;
  }

  return null;
}

function getRpContext(interaction) {
  return {
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    userId: interaction.user.id,
    canManageAny: hasRequiredRole(interaction),
  };
}

function buildRpStatusText(session) {
  if (!session) {
    return "No RP timer is active in this channel or thread.";
  }

  const state =
    session.status === "active"
      ? "active and counting"
      : session.status === "paused"
        ? "paused"
        : "ended";

  return [
    `RP timer is **${state}**.`,
    `Started by <@${session.startedByDiscordUserId}>.`,
    `Active time so far: **${formatRpDuration(session.activeSeconds)}**.`,
  ].join("\n");
}

async function syncMemberGuildRole(member, { addRoleId, removeRoleId } = {}) {
  if (addRoleId && !member.roles.cache.has(addRoleId)) {
    try {
      await member.roles.add(addRoleId);
    } catch (error) {
      console.error(`Failed to add guild role ${addRoleId} to ${member.id}:`, error);
    }
  }

  if (removeRoleId && removeRoleId !== addRoleId && member.roles.cache.has(removeRoleId)) {
    try {
      await member.roles.remove(removeRoleId);
    } catch (error) {
      console.error(`Failed to remove guild role ${removeRoleId} from ${member.id}:`, error);
    }
  }
}

async function ensureMemberRole(guild, discordUserId, roleId) {
  if (!guild || !roleId) {
    return "unavailable";
  }

  try {
    const member = await guild.members.fetch(discordUserId);
    if (member.roles.cache.has(roleId)) {
      return "already-assigned";
    }

    await member.roles.add(roleId, "Character approved");
    return "assigned";
  } catch (error) {
    console.error(
      `Failed to ensure role ${roleId} for Discord user ${discordUserId}:`,
      error,
    );
    return "failed";
  }
}

async function resolveSideQuestRedemption({
  interaction,
  discordUserId,
  characterId,
  objectiveIds,
  tier,
  rarity,
}) {
  try {
    const character = await getOwnedActiveWestMarchesCharacter(
      discordUserId,
      characterId,
    );

    if (!character) {
      await interaction.editReply({
        content:
          "I could not find that active character under your Discord account.",
        components: [],
      });
      return;
    }

    const characterName = formatCharacterName(character);
    const level = normalizeCharacterLevel(character);
    const redeemedRows = await markObjectivesRedeemed(objectiveIds);

    if (redeemedRows.length === 0) {
      await interaction.editReply({
        content: "Those objectives are no longer available to redeem.",
        components: [],
      });
      return;
    }

    const resultLines = [
      `Redeemed ${redeemedRows.length} side-quest objective${redeemedRows.length === 1 ? "" : "s"} for **${characterName}**.`,
    ];

    try {
      if (tier === "hours" || tier === "magicitem_plus_hour") {
        const { experience, gold } = await awardHourlyRewardToCharacter({
          characterId,
          discordUserId,
          hours: 1,
          level,
          reason: "Side-quest redemption",
        });
        resultLines.push(
          `Granted **${experience} XP** and **${gold} Gold**.`,
        );
      }

      if (tier === "magicitem" || tier === "magicitem_plus_hour") {
        const rarityInfo = MAGIC_ITEM_RARITIES.find(
          (entry) => entry.value === rarity,
        );
        const item = await getRandomMagicItem(rarity);

        if (item) {
          await grantWestMarchesItem({
            characterId,
            itemName: item.item_label,
            reason: "Side-quest redemption",
            discordUserId,
          });
          resultLines.push(
            `Rolled and granted a **${rarityInfo?.label ?? rarity}** item: **${item.item_label}**.`,
          );
        } else {
          resultLines.push(
            `No published magic items were available for **${rarityInfo?.label ?? rarity}**, so no item was granted.`,
          );
        }
      }

      if (tier === "retrain") {
        await incrementRetrainCredit({ characterId, characterName });
        resultLines.push("Banked 1 free retrain credit.");
      }
    } catch (rewardError) {
      console.error(
        "Side-quest objectives were marked redeemed but granting the reward failed:",
        rewardError,
      );
      resultLines.push(
        "The objectives were marked redeemed, but granting the reward failed — please contact a developer.",
      );
    }

    try {
      const membership = await getGuildRosterMembership({
        characterId,
        characterName,
        discordUserId,
      });
      const rewardRow = getRewardRow(level);
      const renownPerObjective = Math.round(0.05 * rewardRow.xpPerHour);

      const countByGuildId = new Map();
      for (const row of redeemedRows) {
        countByGuildId.set(row.guildId, (countByGuildId.get(row.guildId) || 0) + 1);
      }

      for (const [guildId, count] of countByGuildId.entries()) {
        if (membership?.guildId === guildId) {
          await addRenown({
            characterId,
            characterName,
            guildId,
            amount: renownPerObjective * count,
          });
        }
      }
    } catch (renownError) {
      console.error(
        "Side-quest reward granted but updating renown failed:",
        renownError,
      );
    }

    await interaction.editReply({
      content: resultLines.join("\n"),
      components: [],
    });
  } finally {
    pendingSideQuestRedemptions.delete(discordUserId);
  }
}

async function handleInteraction(interaction) {
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId.startsWith("rollstats-pick:")) {
      const ownerId = interaction.customId.slice("rollstats-pick:".length);
      if (ownerId !== interaction.user.id) {
        await interaction.reply({
          content: "This stat roll selection belongs to someone else.",
          ephemeral: true,
        });
        return;
      }

      const pending = pendingStatRolls.get(interaction.user.id);
      if (!pending) {
        await interaction.reply({
          content: "Your stat roll session has expired. You can still claim a set from the site within 12 hours.",
          ephemeral: true,
        });
        return;
      }
      pendingStatRolls.delete(interaction.user.id);

      await interaction.deferUpdate();

      const choiceValue = interaction.values[0];
      const claimedIndex = choiceValue === "none" ? -1 : parseInt(choiceValue, 10);

      if (claimedIndex >= 0) {
        const displayName =
          interaction.member?.displayName ||
          interaction.user.globalName ||
          interaction.user.username;

        await markStatRollSetClaimed(
          pending.rowIds[claimedIndex],
          interaction.user.id,
          interaction.user.id,
        );

        const lockTimestamp = Math.floor(pending.lockedUntil.getTime() / 1000);
        const lines = pending.statLines.map((stats, i) => {
          const total = stats.reduce((a, b) => a + b, 0);
          const base = `**Set ${i + 1}** — ${stats.join(", ")} *(total: ${total})*`;
          return i === claimedIndex ? `${base} — Claimed by ${displayName}` : base;
        });
        const updatedContent = [
          "## Stat Rolls",
          "",
          ...lines,
          "",
          `Rolled by ${interaction.user} · Open to all <t:${lockTimestamp}:R>`,
        ].join("\n");

        try {
          const channel = await interaction.client.channels.fetch(pending.channelId);
          const msg = await channel.messages.fetch(pending.messageId);
          await msg.edit(updatedContent);
        } catch {
          // best effort
        }

        await interaction.editReply({
          content: `Set ${claimedIndex + 1} has been reserved for you. The remaining sets become available to everyone after 12 hours.`,
          components: [],
        });
      } else {
        await interaction.editReply({
          content: "No set reserved. All sets become available to everyone after 12 hours.",
          components: [],
        });
      }
      return;
    }

    if (interaction.customId.startsWith("quest-call-character-pick:")) {
      const questCallId = Number(
        interaction.customId.slice("quest-call-character-pick:".length),
      );

      await interaction.deferUpdate();
      try {
        const call = await getQuestCall(questCallId);
        if (!call || call.closedAt) {
          await interaction.followUp({
            content: "This quest call has ended.",
            ephemeral: true,
          });
          return;
        }

        if (new Date(call.expiresAt) <= new Date()) {
          await closeQuestCall(questCallId, "expired");
          await interaction.followUp({
            content: "This quest call just expired.",
            ephemeral: true,
          });
          return;
        }

        const selectedCharacterIds = interaction.values;
        const ownedCharacters = await listOwnedActiveWestMarchesCharacters(
          interaction.user.id,
        );
        const normalizedCharacters = ownedCharacters.map((character) => ({
          id: character.id,
          name: formatCharacterName(character),
          className: formatCharacterClass(character),
          level: normalizeCharacterLevel(character),
        }));
        const selectedCharacters = normalizedCharacters.filter((character) =>
          selectedCharacterIds.includes(character.id),
        );

        await setCharacterResponses(questCallId, interaction.user.id, selectedCharacters);

        const responses = await listCallResponses(questCallId);
        const publicChannel = await interaction.client.channels.fetch(call.channelId);
        if (publicChannel?.messages && call.messageId) {
          const publicMessage = await publicChannel.messages.fetch(call.messageId);
          await publicMessage.edit({
            embeds: [buildQuestCallEmbed(call, responses)],
            allowedMentions: { parse: [] },
          });
        }

        await interaction.editReply({
          content: selectedCharacters.length
            ? `You're offering **${selectedCharacters.map((c) => `${c.name} (Lvl ${c.level || "?"})`).join(", ")}** for this quest call.`
            : "Your response has been cleared.",
          components: [
            buildQuestCallCharacterRow(questCallId, normalizedCharacters, selectedCharacterIds),
          ],
        });
      } catch (error) {
        console.error("Failed to update quest call response:", error);
        await interaction.followUp({
          content: "Something went wrong updating your response. Please try again.",
          ephemeral: true,
        });
      }
      return;
    }

    if (interaction.customId.startsWith("approve-category:")) {
      const ownerId = interaction.customId.slice("approve-category:".length);
      if (ownerId !== interaction.user.id) {
        await interaction.reply({
          content:
            "Use your own `/approve` command so the menu belongs to you.",
          ephemeral: true,
        });
        return;
      }

      if (!hasRequiredRole(interaction)) {
        await interaction.reply({
          content: "You do not have the required role to approve homebrew.",
          ephemeral: true,
        });
        return;
      }

      const category = interaction.values[0];
      const categoryConfig = getCategory(category);

      if (!categoryConfig) {
        await interaction.reply({
          content: "That homebrew type is not supported.",
          ephemeral: true,
        });
        return;
      }

      if (categoryNeedsDetail(category)) {
        await interaction.update({
          content:
            category === "spells"
              ? "Choose the spell level."
              : category === "subclasses"
                ? "Choose the class this subclass belongs to."
                : "Choose the item rarity.",
          components: [buildApproveDetailRow(interaction.user.id, category)],
        });
        return;
      }

      const prefill = pendingApprovals.get(interaction.user.id) ?? {};
      pendingApprovals.delete(interaction.user.id);
      await interaction.showModal(
        buildApproveModal(interaction.user.id, category, "none", prefill),
      );
      return;
    }

    if (interaction.customId.startsWith("approve-detail:")) {
      const [, ownerId, category] = interaction.customId.split(":");
      if (ownerId !== interaction.user.id) {
        await interaction.reply({
          content:
            "Use your own `/approve` command so the menu belongs to you.",
          ephemeral: true,
        });
        return;
      }

      if (!hasRequiredRole(interaction)) {
        await interaction.reply({
          content: "You do not have the required role to approve homebrew.",
          ephemeral: true,
        });
        return;
      }

      const detailValue = interaction.values[0];
      if (!getApproveTarget(category, detailValue)) {
        await interaction.reply({
          content: "That approval option is not supported.",
          ephemeral: true,
        });
        return;
      }

      const prefill = pendingApprovals.get(interaction.user.id) ?? {};
      pendingApprovals.delete(interaction.user.id);
      await interaction.showModal(
        buildApproveModal(interaction.user.id, category, detailValue, prefill),
      );
      return;
    }

    if (interaction.customId.startsWith("sc-character:")) {
      const ownerId = interaction.customId.slice("sc-character:".length);
      if (ownerId !== interaction.user.id) {
        await interaction.reply({
          content:
            "Use your own `/sc-character` command so the menu belongs to you.",
          ephemeral: true,
        });
        return;
      }

      if (!isWestMarchesConfigured()) {
        await interaction.reply({
          content:
            "West Marches API access is not configured, so I cannot set your SC character yet.",
          ephemeral: true,
        });
        return;
      }

      try {
        await interaction.deferUpdate();

        const characterId = interaction.values[0];
        const character = await getOwnedActiveWestMarchesCharacter(
          interaction.user.id,
          characterId,
        );

        if (!character) {
          await interaction.editReply({
            content:
              "I could not find that active character under your Discord account.",
            components: [],
          });
          return;
        }

        const characterName = formatCharacterName(character);
        await upsertScRewardCharacterPreference({
          discordUserId: interaction.user.id,
          characterId: character.id,
          characterName,
        });

        await interaction.editReply({
          content: `Set **${characterName}** as your default character for automatic SC-only rewards.`,
          components: [],
        });
      } catch (error) {
        console.error("Failed to process /sc-character select:", error);
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content:
              "Something went wrong while setting your SC character. Please try again.",
            components: [],
          });
        } else {
          await interaction.reply({
            content:
              "Something went wrong while setting your SC character. Please try again.",
            ephemeral: true,
          });
        }
      }

      return;
    }

    if (interaction.customId.startsWith("retire-character:")) {
      const ownerId = interaction.customId.slice("retire-character:".length);
      if (ownerId !== interaction.user.id) {
        await interaction.reply({
          content: "Use your own `/retire` command so the menu belongs to you.",
          ephemeral: true,
        });
        return;
      }

      if (!isWestMarchesConfigured()) {
        await interaction.reply({
          content:
            "West Marches API access is not configured, so I cannot retire your character yet.",
          ephemeral: true,
        });
        return;
      }

      try {
        await interaction.deferUpdate();

        const characterId = interaction.values[0];
        const character = await getOwnedActiveWestMarchesCharacter(
          interaction.user.id,
          characterId,
        );

        if (!character) {
          await interaction.editReply({
            content:
              "I could not find that active character under your Discord account.",
            components: [],
          });
          return;
        }

        const characterName = formatCharacterName(character);
        await retireWestMarchesCharacter(
          character.id,
          `Retired via /retire by ${interaction.user.username} on Discord.`,
          interaction.user.id,
        );

        await interaction.editReply({
          content: `**${characterName}** has been retired.`,
          components: [],
        });

        if (interaction.channel?.send) {
          await interaction.channel.send({
            content: `**${characterName}** has retired!`,
            allowedMentions: { parse: [] },
          });
        }
      } catch (error) {
        console.error("Failed to process /retire select:", error);
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content:
              "Something went wrong while retiring your character. Please try again.",
            components: [],
          });
        } else {
          await interaction.reply({
            content:
              "Something went wrong while retiring your character. Please try again.",
            ephemeral: true,
          });
        }
      }

      return;
    }

    if (interaction.customId.startsWith("join-guild-character:")) {
      const ownerId = interaction.customId.slice(
        "join-guild-character:".length,
      );
      if (ownerId !== interaction.user.id) {
        await interaction.reply({
          content:
            "Use your own `/join-guild` command so the menu belongs to you.",
          ephemeral: true,
        });
        return;
      }

      try {
        await interaction.deferUpdate();

        const characterId = interaction.values[0];
        const character = await getOwnedActiveWestMarchesCharacter(
          interaction.user.id,
          characterId,
        );

        if (!character) {
          await interaction.editReply({
            content:
              "I could not find that active character under your Discord account.",
            components: [],
          });
          return;
        }

        const guilds = await listPublishedGuilds();
        if (guilds.length === 0) {
          await interaction.editReply({
            content: "No published guilds are available yet.",
            components: [],
          });
          return;
        }

        const characterName = formatCharacterName(character);
        const membership = await getGuildRosterMembership({
          characterId: character.id,
          characterName,
          discordUserId: interaction.user.id,
        });
        const cooldownUntil = getGuildRosterCooldownUntil(membership);

        if (cooldownUntil) {
          await interaction.editReply({
            content:
              `**${characterName}** is currently in **${membership.guildName}**. ` +
              `They can change guild again ${formatDiscordTimestamp(cooldownUntil)}.`,
            components: [],
          });
          return;
        }

        await interaction.editReply({
          content: membership
            ? `**${characterName}** is currently in **${membership.guildName}**. Choose a different guild if you want to move them.`
            : `Choose the guild **${characterName}** should join.`,
          components: [
            buildJoinGuildGuildRow(
              interaction.user.id,
              character.id,
              guilds,
              membership?.guildId ?? null,
            ),
          ],
        });
      } catch (error) {
        console.error("Failed to process /join-guild character select:", error);
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content:
              "Something went wrong while loading guild choices. Please try again.",
            components: [],
          });
        } else {
          await interaction.reply({
            content:
              "Something went wrong while loading guild choices. Please try again.",
            ephemeral: true,
          });
        }
      }

      return;
    }

    if (interaction.customId.startsWith("join-guild-guild:")) {
      const parsedCustomId = parseJoinGuildGuildCustomId(interaction.customId);
      if (!parsedCustomId || parsedCustomId.ownerId !== interaction.user.id) {
        await interaction.reply({
          content:
            "Use your own `/join-guild` command so the menu belongs to you.",
          ephemeral: true,
        });
        return;
      }

      try {
        await interaction.deferUpdate();

        const guildId = Number(interaction.values[0]);
        if (!Number.isInteger(guildId) || guildId <= 0) {
          await interaction.editReply({
            content: "That guild selection is not valid.",
            components: [],
          });
          return;
        }

        const character = await getOwnedActiveWestMarchesCharacter(
          interaction.user.id,
          parsedCustomId.characterId,
        );

        if (!character) {
          await interaction.editReply({
            content:
              "I could not find that active character under your Discord account.",
            components: [],
          });
          return;
        }

        const characterName = formatCharacterName(character);
        const result = await upsertGuildRosterMembership({
          guildId,
          characterId: character.id,
          characterName,
          discordUserId: interaction.user.id,
        });

        if (!result) {
          await interaction.editReply({
            content: "That guild is not available.",
            components: [],
          });
          return;
        }

        const { membership, previousMembership, cooldownUntil } = result;

        if (cooldownUntil) {
          await interaction.editReply({
            content:
              `**${characterName}** changed guild recently. ` +
              `They can change guild again ${formatDiscordTimestamp(cooldownUntil)}.`,
            components: [],
          });
          return;
        }

        if (previousMembership?.guildId === membership.guildId) {
          await syncMemberGuildRole(interaction.member, {
            addRoleId: membership.discordRoleId,
          });
          await interaction.editReply({
            content: `**${characterName}** is already in **${membership.guildName}**.`,
            components: [],
          });
          return;
        }

        await updateGuildRosterMessages(
          interaction,
          [previousMembership?.guildId, membership.guildId].filter(Boolean),
        );

        const stillInOldGuild = previousMembership
          ? await isDiscordUserStillInGuild(
              interaction.user.id,
              previousMembership.guildId,
            )
          : false;
        await syncMemberGuildRole(interaction.member, {
          addRoleId: membership.discordRoleId,
          removeRoleId:
            previousMembership && !stillInOldGuild
              ? previousMembership.discordRoleId
              : null,
        });

        await interaction.editReply({
          content: previousMembership
            ? `Moved **${characterName}** from **${previousMembership.guildName}** to **${membership.guildName}**.`
            : `Added **${characterName}** to **${membership.guildName}**.`,
          components: [],
        });

        if (interaction.channel?.send) {
          await interaction.channel.send({
            content: previousMembership
              ? `**${characterName}** has moved from **${previousMembership.guildName}** to **${membership.guildName}**.`
              : `**${characterName}** has joined **${membership.guildName}**.`,
            allowedMentions: { parse: [] },
          });
        }
      } catch (error) {
        console.error("Failed to process /join-guild guild select:", error);
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content:
              "Something went wrong while updating the guild roster. Please try again.",
            components: [],
          });
        } else {
          await interaction.reply({
            content:
              "Something went wrong while updating the guild roster. Please try again.",
            ephemeral: true,
          });
        }
      }

      return;
    }

    if (interaction.customId.startsWith("leave-guild-character:")) {
      const ownerId = interaction.customId.slice(
        "leave-guild-character:".length,
      );
      if (ownerId !== interaction.user.id) {
        await interaction.reply({
          content:
            "Use your own `/leave-guild` command so the menu belongs to you.",
          ephemeral: true,
        });
        return;
      }

      try {
        await interaction.deferUpdate();

        const characterId = interaction.values[0];
        const character = await getOwnedActiveWestMarchesCharacter(
          interaction.user.id,
          characterId,
        );

        if (!character) {
          await interaction.editReply({
            content:
              "I could not find that active character under your Discord account.",
            components: [],
          });
          return;
        }

        const deleteResult = await deleteGuildRosterMembership({
          characterId: character.id,
          characterName: formatCharacterName(character),
          discordUserId: interaction.user.id,
        });
        const { membership, cooldownUntil } = deleteResult;

        if (!membership) {
          await interaction.editReply({
            content: `**${formatCharacterName(character)}** is not currently in a guild roster.`,
            components: [],
          });
          return;
        }

        if (cooldownUntil) {
          await interaction.editReply({
            content:
              `**${membership.characterName}** changed guild recently. ` +
              `They can leave or change guild again ${formatDiscordTimestamp(cooldownUntil)}.`,
            components: [],
          });
          return;
        }

        await updateGuildRosterMessages(interaction, [membership.guildId]);

        const stillInGuild = await isDiscordUserStillInGuild(
          interaction.user.id,
          membership.guildId,
        );
        if (!stillInGuild) {
          await syncMemberGuildRole(interaction.member, {
            removeRoleId: membership.discordRoleId,
          });
        }

        await interaction.editReply({
          content: `Removed **${membership.characterName}** from **${membership.guildName}**.`,
          components: [],
        });

        if (interaction.channel?.send) {
          await interaction.channel.send({
            content: `**${membership.characterName}** has left **${membership.guildName}**.`,
            allowedMentions: { parse: [] },
          });
        }
      } catch (error) {
        console.error(
          "Failed to process /leave-guild character select:",
          error,
        );
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content:
              "Something went wrong while updating the guild roster. Please try again.",
            components: [],
          });
        } else {
          await interaction.reply({
            content:
              "Something went wrong while updating the guild roster. Please try again.",
            ephemeral: true,
          });
        }
      }

      return;
    }

    if (interaction.customId.startsWith("sell-character-pick:")) {
      const ownerId = interaction.customId.slice("sell-character-pick:".length);
      if (ownerId !== interaction.user.id) {
        await interaction.reply({
          content: "Use your own `/sell` command so the menu belongs to you.",
          ephemeral: true,
        });
        return;
      }

      try {
        await interaction.deferUpdate();

        const characterId = interaction.values[0];
        const character = await getWestMarchesCharacter(characterId);
        if (!character) {
          await interaction.editReply({
            content: "I could not load that character's inventory.",
            components: [],
          });
          return;
        }

        const activeListings = await listActiveListingsForCharacter(characterId);
        const listedItemIds = new Set(activeListings.map((listing) => listing.itemId));
        const availableItems = getCharacterInventory(character).filter(
          (item) => !listedItemIds.has(item.id),
        );

        if (availableItems.length === 0) {
          await interaction.editReply({
            content: `**${formatCharacterName(character)}** has no unlisted items to sell.`,
            components: [],
          });
          return;
        }

        await interaction.editReply({
          content: `Choose an item from **${formatCharacterName(character)}** to list for sale.`,
          components: [buildSellItemRow(interaction.user.id, characterId, availableItems)],
        });
      } catch (error) {
        console.error("Failed to process /sell character select:", error);
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content: "Something went wrong while loading that character's inventory. Please try again.",
            components: [],
          });
        } else {
          await interaction.reply({
            content: "Something went wrong while loading that character's inventory. Please try again.",
            ephemeral: true,
          });
        }
      }

      return;
    }

    if (interaction.customId.startsWith("sell-item-pick:")) {
      const [, ownerId, characterId] = interaction.customId.split(":");
      if (ownerId !== interaction.user.id) {
        await interaction.reply({
          content: "Use your own `/sell` command so the menu belongs to you.",
          ephemeral: true,
        });
        return;
      }

      try {
        const itemId = interaction.values[0];
        const character = await getWestMarchesCharacter(characterId);
        const item = getCharacterInventory(character).find((entry) => entry.id === itemId);
        const itemName = item?.name || "item";

        await interaction.showModal(
          buildSellPriceModal(interaction.user.id, characterId, itemId, itemName),
        );
      } catch (error) {
        console.error("Failed to process /sell item select:", error);
        await interaction.reply({
          content: "Something went wrong while starting the listing. Please try again.",
          ephemeral: true,
        });
      }

      return;
    }

    if (interaction.customId.startsWith("sell-cancel-pick:")) {
      const ownerId = interaction.customId.slice("sell-cancel-pick:".length);
      if (ownerId !== interaction.user.id) {
        await interaction.reply({
          content: "Use your own `/sell cancel` command so the menu belongs to you.",
          ephemeral: true,
        });
        return;
      }

      try {
        await interaction.deferUpdate();

        const listingId = Number(interaction.values[0]);
        const cancelled = await cancelListing({
          listingId,
          requestingDiscordUserId: interaction.user.id,
        });

        if (!cancelled) {
          await interaction.editReply({
            content: "That listing is no longer active.",
            components: [],
          });
          return;
        }

        await interaction.editReply({
          content: `Cancelled your listing for **${cancelled.itemName}**.`,
          components: [],
        });
        updatePlayerMarketplaceMessage(interaction.client).catch((syncError) => {
          console.error("Failed to update player marketplace display after cancellation:", syncError);
        });
      } catch (error) {
        console.error("Failed to process /sell cancel select:", error);
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content: "Something went wrong while cancelling that listing. Please try again.",
            components: [],
          });
        } else {
          await interaction.reply({
            content: "Something went wrong while cancelling that listing. Please try again.",
            ephemeral: true,
          });
        }
      }

      return;
    }

    if (interaction.customId.startsWith("request-character-pick:")) {
      const ownerId = interaction.customId.slice("request-character-pick:".length);
      if (ownerId !== interaction.user.id) {
        await interaction.reply({
          content: "Use your own `/request` command so the menu belongs to you.",
          ephemeral: true,
        });
        return;
      }

      const characterId = interaction.values[0];
      await interaction.showModal(buildRequestModal(interaction.user.id, characterId));
      return;
    }

    if (interaction.customId.startsWith("request-cancel-pick:")) {
      const ownerId = interaction.customId.slice("request-cancel-pick:".length);
      if (ownerId !== interaction.user.id) {
        await interaction.reply({
          content: "Use your own `/request cancel` command so the menu belongs to you.",
          ephemeral: true,
        });
        return;
      }

      try {
        await interaction.deferUpdate();

        const requestId = Number(interaction.values[0]);
        const cancelled = await cancelRequest({
          requestId,
          requestingDiscordUserId: interaction.user.id,
        });

        if (!cancelled) {
          await interaction.editReply({
            content: "That request is no longer open.",
            components: [],
          });
          return;
        }

        await interaction.editReply({
          content: `Cancelled your request for **${cancelled.itemName}**.`,
          components: [],
        });
        updatePlayerRequestMessage(interaction.client).catch((syncError) => {
          console.error("Failed to update player request display after cancellation:", syncError);
        });
      } catch (error) {
        console.error("Failed to process /request cancel select:", error);
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content: "Something went wrong while cancelling that request. Please try again.",
            components: [],
          });
        } else {
          await interaction.reply({
            content: "Something went wrong while cancelling that request. Please try again.",
            ephemeral: true,
          });
        }
      }

      return;
    }

    if (interaction.customId.startsWith("quest-acquire-character:")) {
      const ownerId = interaction.customId.slice(
        "quest-acquire-character:".length,
      );
      if (ownerId !== interaction.user.id) {
        await interaction.reply({
          content: "Use your own `/quest acquire` command so the menu belongs to you.",
          ephemeral: true,
        });
        return;
      }

      try {
        await interaction.deferUpdate();

        const characterId = interaction.values[0];
        const character = await getOwnedActiveWestMarchesCharacter(
          interaction.user.id,
          characterId,
        );

        if (!character) {
          await interaction.editReply({
            content: "I could not find that active character under your Discord account.",
            components: [],
          });
          return;
        }

        const characterName = formatCharacterName(character);
        const membership = await getGuildRosterMembership({
          characterId: character.id,
          characterName,
          discordUserId: interaction.user.id,
        });
        const guildId = membership?.guildId ?? (await getRandomPublishedGuildId());

        if (!guildId) {
          await interaction.editReply({
            content: "No published guilds are available to draw an objective from yet.",
            components: [],
          });
          return;
        }

        const result = await acquireObjectiveForCharacter({
          characterId: character.id,
          characterName,
          discordUserId: interaction.user.id,
          guildId,
        });

        if (result.status === "cap_reached") {
          await interaction.editReply({
            content: `**${characterName}** already has 3 active side-quest objectives. Complete or redeem one before acquiring another.`,
            components: [],
          });
          return;
        }

        if (result.status === "pool_exhausted") {
          await interaction.editReply({
            content: `There are no unclaimed side-quest objectives left for **${characterName}**'s guild right now.`,
            components: [],
          });
          return;
        }

        await interaction.editReply({
          content: [
            `**${characterName}** acquired a new side-quest objective from **${result.objective.guildName}**:`,
            `**${result.objective.title}**`,
            result.objective.description,
          ].join("\n"),
          components: [],
        });
      } catch (error) {
        console.error("Failed to process /quest acquire select:", error);
        const errorContent = {
          content: "Something went wrong while acquiring a side-quest objective. Please try again.",
          components: [],
        };
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(errorContent);
        } else {
          await interaction.reply({ ...errorContent, ephemeral: true });
        }
      }

      return;
    }

    if (interaction.customId.startsWith("quest-reroll-character:")) {
      const ownerId = interaction.customId.slice(
        "quest-reroll-character:".length,
      );
      if (ownerId !== interaction.user.id) {
        await interaction.reply({
          content: "Use your own `/quest reroll` command so the menu belongs to you.",
          ephemeral: true,
        });
        return;
      }

      try {
        await interaction.deferUpdate();

        const characterId = interaction.values[0];
        const objectives = await listActiveObjectivesForCharacter(characterId);

        if (objectives.length === 0) {
          await interaction.editReply({
            content: "That character no longer has any active side-quest objectives.",
            components: [],
          });
          return;
        }

        await interaction.editReply({
          content: `Choose the objective to reroll for **${objectives[0].characterName}**.`,
          components: [
            buildQuestRerollObjectiveRow(interaction.user.id, characterId, objectives),
          ],
        });
      } catch (error) {
        console.error("Failed to process /quest reroll character select:", error);
        const errorContent = {
          content: "Something went wrong while loading that character's objectives. Please try again.",
          components: [],
        };
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(errorContent);
        } else {
          await interaction.reply({ ...errorContent, ephemeral: true });
        }
      }

      return;
    }

    if (interaction.customId.startsWith("quest-reroll-objective:")) {
      const parsedCustomId = parseQuestRerollObjectiveCustomId(interaction.customId);
      if (!parsedCustomId || parsedCustomId.ownerId !== interaction.user.id) {
        await interaction.reply({
          content: "Use your own `/quest reroll` command so the menu belongs to you.",
          ephemeral: true,
        });
        return;
      }

      try {
        await interaction.deferUpdate();

        const characterSideQuestId = Number(interaction.values[0]);
        const result = await rerollObjective(characterSideQuestId);

        if (result.status === "not_found") {
          await interaction.editReply({
            content: "That objective is no longer active.",
            components: [],
          });
          return;
        }

        if (result.status === "pool_exhausted") {
          await interaction.editReply({
            content: "There are no other unclaimed objectives left for that guild right now.",
            components: [],
          });
          return;
        }

        await interaction.editReply({
          content: [
            `Rerolled to a new objective from **${result.objective.guildName}**:`,
            `**${result.objective.title}**`,
            result.objective.description,
          ].join("\n"),
          components: [],
        });
      } catch (error) {
        console.error("Failed to process /quest reroll objective select:", error);
        const errorContent = {
          content: "Something went wrong while rerolling that objective. Please try again.",
          components: [],
        };
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(errorContent);
        } else {
          await interaction.reply({ ...errorContent, ephemeral: true });
        }
      }

      return;
    }

    if (interaction.customId.startsWith("quest-redeem-character:")) {
      const ownerId = interaction.customId.slice(
        "quest-redeem-character:".length,
      );
      if (ownerId !== interaction.user.id) {
        await interaction.reply({
          content: "Use your own `/quest redeem` command so the menu belongs to you.",
          ephemeral: true,
        });
        return;
      }

      try {
        await interaction.deferUpdate();

        const characterId = interaction.values[0];
        const objectives = await listCompletedUnredeemedObjectivesForCharacter(characterId);

        if (objectives.length === 0) {
          await interaction.editReply({
            content: "That character has no completed objectives ready to redeem.",
            components: [],
          });
          return;
        }

        pendingSideQuestRedemptions.set(interaction.user.id, { characterId });

        await interaction.editReply({
          content: "Choose 1-3 completed objectives to redeem together.",
          components: [buildQuestRedeemObjectivesRow(interaction.user.id, objectives)],
        });
      } catch (error) {
        console.error("Failed to process /quest redeem character select:", error);
        const errorContent = {
          content: "Something went wrong while loading that character's completed objectives. Please try again.",
          components: [],
        };
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(errorContent);
        } else {
          await interaction.reply({ ...errorContent, ephemeral: true });
        }
      }

      return;
    }

    if (interaction.customId.startsWith("quest-redeem-objectives:")) {
      const ownerId = interaction.customId.slice(
        "quest-redeem-objectives:".length,
      );
      if (ownerId !== interaction.user.id) {
        await interaction.reply({
          content: "Use your own `/quest redeem` command so the menu belongs to you.",
          ephemeral: true,
        });
        return;
      }

      try {
        await interaction.deferUpdate();

        const pending = pendingSideQuestRedemptions.get(interaction.user.id);
        if (!pending?.characterId) {
          await interaction.editReply({
            content: "This redemption session expired. Run `/quest redeem` again.",
            components: [],
          });
          return;
        }

        const objectiveIds = interaction.values.map(Number);
        pendingSideQuestRedemptions.set(interaction.user.id, {
          ...pending,
          objectiveIds,
        });

        if (objectiveIds.length === 1) {
          await resolveSideQuestRedemption({
            interaction,
            discordUserId: interaction.user.id,
            characterId: pending.characterId,
            objectiveIds,
            tier: "hours",
          });
          return;
        }

        await interaction.editReply({
          content: `Choose your reward for redeeming ${objectiveIds.length} objectives.`,
          components: [
            buildQuestRedeemTierRow(interaction.user.id, objectiveIds.length),
          ],
        });
      } catch (error) {
        console.error("Failed to process /quest redeem objectives select:", error);
        pendingSideQuestRedemptions.delete(interaction.user.id);
        const errorContent = {
          content: "Something went wrong while selecting objectives to redeem. Please try again.",
          components: [],
        };
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(errorContent);
        } else {
          await interaction.reply({ ...errorContent, ephemeral: true });
        }
      }

      return;
    }

    if (interaction.customId.startsWith("quest-redeem-tier:")) {
      const ownerId = interaction.customId.slice("quest-redeem-tier:".length);
      if (ownerId !== interaction.user.id) {
        await interaction.reply({
          content: "Use your own `/quest redeem` command so the menu belongs to you.",
          ephemeral: true,
        });
        return;
      }

      try {
        await interaction.deferUpdate();

        const pending = pendingSideQuestRedemptions.get(interaction.user.id);
        if (!pending?.characterId || !pending?.objectiveIds) {
          await interaction.editReply({
            content: "This redemption session expired. Run `/quest redeem` again.",
            components: [],
          });
          return;
        }

        const tier = interaction.values[0];

        if (tier === "magicitem" || tier === "magicitem_plus_hour") {
          const character = await getOwnedActiveWestMarchesCharacter(
            interaction.user.id,
            pending.characterId,
          );

          if (!character) {
            await interaction.editReply({
              content: "I could not find that active character under your Discord account.",
              components: [],
            });
            return;
          }

          const level = normalizeCharacterLevel(character);
          pendingSideQuestRedemptions.set(interaction.user.id, { ...pending, tier });
          await interaction.editReply({
            content: "Choose the rarity for your magic item roll.",
            components: [buildQuestRedeemRarityRow(interaction.user.id, level)],
          });
          return;
        }

        await resolveSideQuestRedemption({
          interaction,
          discordUserId: interaction.user.id,
          characterId: pending.characterId,
          objectiveIds: pending.objectiveIds,
          tier,
        });
      } catch (error) {
        console.error("Failed to process /quest redeem tier select:", error);
        pendingSideQuestRedemptions.delete(interaction.user.id);
        const errorContent = {
          content: "Something went wrong while choosing your reward. Please try again.",
          components: [],
        };
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(errorContent);
        } else {
          await interaction.reply({ ...errorContent, ephemeral: true });
        }
      }

      return;
    }

    if (interaction.customId.startsWith("quest-redeem-rarity:")) {
      const ownerId = interaction.customId.slice("quest-redeem-rarity:".length);
      if (ownerId !== interaction.user.id) {
        await interaction.reply({
          content: "Use your own `/quest redeem` command so the menu belongs to you.",
          ephemeral: true,
        });
        return;
      }

      try {
        await interaction.deferUpdate();

        const pending = pendingSideQuestRedemptions.get(interaction.user.id);
        if (!pending?.characterId || !pending?.objectiveIds || !pending?.tier) {
          await interaction.editReply({
            content: "This redemption session expired. Run `/quest redeem` again.",
            components: [],
          });
          return;
        }

        const selectedRarity = interaction.values[0];
        const rarity = MAGIC_ITEM_RARITIES.find((entry) => entry.value === selectedRarity);

        if (!rarity) {
          await interaction.editReply({
            content: "That rarity is not supported.",
            components: [],
          });
          return;
        }

        const character = await getOwnedActiveWestMarchesCharacter(
          interaction.user.id,
          pending.characterId,
        );

        if (!character) {
          await interaction.editReply({
            content: "I could not find that active character under your Discord account.",
            components: [],
          });
          return;
        }

        const level = normalizeCharacterLevel(character);
        if (level < rarity.minLevel) {
          await interaction.editReply({
            content: `**${formatCharacterName(character)}** must be at least level ${rarity.minLevel} to roll a **${rarity.label}** item. Your completed objectives are still waiting to be redeemed — run \`/quest redeem\` again.`,
            components: [],
          });
          return;
        }

        await resolveSideQuestRedemption({
          interaction,
          discordUserId: interaction.user.id,
          characterId: pending.characterId,
          objectiveIds: pending.objectiveIds,
          tier: pending.tier,
          rarity: selectedRarity,
        });
      } catch (error) {
        console.error("Failed to process /quest redeem rarity select:", error);
        pendingSideQuestRedemptions.delete(interaction.user.id);
        const errorContent = {
          content: "Something went wrong while rolling your magic item. Please try again.",
          components: [],
        };
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(errorContent);
        } else {
          await interaction.reply({ ...errorContent, ephemeral: true });
        }
      }

      return;
    }

    if (interaction.customId.startsWith("quest-list-character:")) {
      const ownerId = interaction.customId.slice("quest-list-character:".length);
      if (ownerId !== interaction.user.id) {
        await interaction.reply({
          content: "Use your own `/quest list` command so the menu belongs to you.",
          ephemeral: true,
        });
        return;
      }

      try {
        await interaction.deferUpdate();

        const characterId = interaction.values[0];
        const character = await getOwnedActiveWestMarchesCharacter(
          interaction.user.id,
          characterId,
        );

        if (!character) {
          await interaction.editReply({
            content: "I could not find that active character under your Discord account.",
            components: [],
          });
          return;
        }

        const characterName = formatCharacterName(character);
        const [active, completed, redeemed, renownRows] = await Promise.all([
          listActiveObjectivesForCharacter(characterId),
          listCompletedUnredeemedObjectivesForCharacter(characterId),
          listRedeemedObjectivesForCharacter(characterId),
          getAllRenownForCharacter(characterId),
        ]);

        const lines = [`**${characterName}**'s side quests:`];
        lines.push(
          active.length
            ? `Active (${active.length}/3):\n${active.map((o) => `- ${o.title} (${o.guildName})`).join("\n")}`
            : "Active: none",
        );
        lines.push(
          completed.length
            ? `Completed, awaiting redemption:\n${completed.map((o) => `- ${o.title} (${o.guildName})`).join("\n")}`
            : "Completed, awaiting redemption: none",
        );
        lines.push(
          redeemed.length
            ? `Recently redeemed:\n${redeemed.map((o) => `- ${o.title} (${o.guildName})`).join("\n")}`
            : "Recently redeemed: none",
        );

        if (renownRows.length > 0) {
          lines.push("Guild renown:");
          for (const row of renownRows) {
            lines.push(`- ${row.guildName}: ${formatRenownProgress(row.renown)} renown`);
          }
        } else {
          lines.push("Guild renown: none yet.");
        }

        await interaction.editReply({
          content: lines.join("\n"),
          components: [],
        });
      } catch (error) {
        console.error("Failed to process /quest list character select:", error);
        const errorContent = {
          content: "Something went wrong while loading that character's side quests. Please try again.",
          components: [],
        };
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(errorContent);
        } else {
          await interaction.reply({ ...errorContent, ephemeral: true });
        }
      }

      return;
    }

    if (!interaction.customId.startsWith("magicitem:")) {
      return;
    }

    const ownerId = interaction.customId.slice("magicitem:".length);
    if (ownerId !== interaction.user.id) {
      await interaction.reply({
        content:
          "Use your own `/magicitem` command so the menu belongs to you.",
        ephemeral: true,
      });
      return;
    }

    try {
      const selectedRarity = interaction.values[0];
      const rarity = MAGIC_ITEM_RARITIES.find(
        (entry) => entry.value === selectedRarity,
      );

      if (!rarity) {
        await interaction.reply({
          content: "That rarity is not supported.",
          ephemeral: true,
        });
        return;
      }

      const item = await getRandomMagicItem(selectedRarity);
      if (!item) {
        await interaction.update({
          content: `No published magic items are available for **${rarity.label}** yet.`,
          components: [
            buildMagicItemRarityRow(interaction.user.id, selectedRarity),
          ],
        });
        return;
      }

      await interaction.update({
        content: `**${rarity.label} Magic Item:** ${item.item_label}\nUse the menu to roll again.`,
        components: [
          buildMagicItemRarityRow(interaction.user.id, selectedRarity),
        ],
      });

      try {
        const displayName = getDisplayName(interaction);
        await interaction.followUp({
          content: `${interaction.user}`,
          embeds: [
            buildMagicItemResultEmbed({
              displayName,
              userMention: interaction.user.toString(),
              userAvatarUrl: interaction.user.displayAvatarURL(),
              rarity,
              rollNumber: item.roll_number,
              totalCount: item.total_count,
              itemName: item.item_label,
            }),
          ],
          ephemeral: false,
          allowedMentions: {
            parse: [],
            users: [interaction.user.id],
          },
        });
      } catch (postError) {
        console.error("Failed to post public magic item result:", postError);
      }
    } catch (error) {
      console.error("Failed to process magic item select menu:", error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "Something went wrong while rolling your magic item. Please try again.",
        );
      } else {
        await interaction.reply({
          content:
            "Something went wrong while rolling your magic item. Please try again.",
          ephemeral: true,
        });
      }
    }

    return;
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith("feedback-modal:")) {
      const anonymous = interaction.customId.slice("feedback-modal:".length) === "anonymous";
      const feedback = interaction.fields.getTextInputValue("feedback");
      await interaction.deferReply({ ephemeral: true });
      try {
        const { sheetSync } = await saveDiscordFeedback(interaction, { anonymous, feedback });
        await interaction.editReply(
          sheetSync.configured && !sheetSync.synced
            ? "Your feedback was saved. The staff spreadsheet copy is temporarily delayed."
            : "Thank you—your feedback has been submitted.",
        );
      } catch (error) {
        console.error("Failed to submit Discord feedback:", error);
        await interaction.editReply(error instanceof Error && error.statusCode === 400
          ? error.message
          : "I couldn't save your feedback. Please try again shortly.");
      }
      return;
    }
    if (interaction.customId === "book-request-modal") {
      const title = interaction.fields.getTextInputValue("title");
      const notes = interaction.fields.getTextInputValue("notes");
      await interaction.deferReply({ ephemeral: true });
      try {
        await saveDiscordBookRequest(interaction, { title, notes });
        await interaction.editReply("Thanks! Your book request has been submitted.");
      } catch (error) {
        console.error("Failed to submit Discord book request:", error);
        await interaction.editReply(error instanceof Error && error.statusCode === 400
          ? error.message
          : "I couldn't save your book request. Please try again shortly.");
      }
      return;
    }
    if (interaction.customId.startsWith("sticky-modal:")) {
      const channelId = interaction.customId.slice("sticky-modal:".length);

      if (!hasRequiredRole(interaction)) {
        await interaction.reply({
          content: "You do not have the required role to manage sticky messages.",
          ephemeral: true,
        });
        return;
      }

      try {
        await interaction.deferReply({ ephemeral: true });

        const message = interaction.fields.getTextInputValue("sticky-content").trim();
        if (!message) {
          await interaction.editReply("The sticky message cannot be empty.");
          return;
        }

        const sticky = await setStickyMessage({
          channelId,
          content: message,
          createdByDiscordUserId: interaction.user.id,
        });

        const channel = await interaction.client.channels.fetch(channelId);
        await postSticky(channel, sticky);
        await interaction.editReply("Sticky message set for this channel.");
      } catch (error) {
        console.error("Failed to process /sticky modal:", error);
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(
            "Something went wrong while setting the sticky message. Please try again.",
          );
        } else {
          await interaction.reply({
            content:
              "Something went wrong while setting the sticky message. Please try again.",
            ephemeral: true,
          });
        }
      }

      return;
    }

    if (interaction.customId.startsWith("sell-price-modal:")) {
      const [, ownerId, characterId, itemId] = interaction.customId.split(":");
      if (ownerId !== interaction.user.id) {
        await interaction.reply({
          content: "Use your own `/sell` command so this form belongs to you.",
          ephemeral: true,
        });
        return;
      }

      function parseOptionalPrice(rawValue) {
        const trimmed = rawValue.trim();
        if (!trimmed) return { ok: true, value: null };
        const parsed = Number.parseInt(trimmed, 10);
        if (!Number.isInteger(parsed) || parsed <= 0 || String(parsed) !== trimmed) {
          return { ok: false, value: null };
        }
        return { ok: true, value: parsed };
      }

      try {
        await interaction.deferReply({ ephemeral: true });

        const rawQuantity = interaction.fields.getTextInputValue("sell-quantity").trim();
        const quantity = rawQuantity ? Number.parseInt(rawQuantity, 10) : 1;
        if (!Number.isInteger(quantity) || quantity <= 0 || String(quantity) !== (rawQuantity || "1")) {
          await interaction.editReply("Quantity must be a positive whole number.");
          return;
        }

        const goldResult = parseOptionalPrice(
          interaction.fields.getTextInputValue("sell-price-gold"),
        );
        const scResult = parseOptionalPrice(
          interaction.fields.getTextInputValue("sell-price-sc"),
        );

        if (!goldResult.ok || !scResult.ok) {
          await interaction.editReply("Prices must be positive whole numbers.");
          return;
        }
        if (goldResult.value === null && scResult.value === null) {
          await interaction.editReply("Enter a price in Gold, SC, or both.");
          return;
        }

        const character = await getWestMarchesCharacter(characterId);
        if (!character) {
          await interaction.editReply("I could not find that character anymore.");
          return;
        }

        const item = getCharacterInventory(character).find((entry) => entry.id === itemId);
        if (!item) {
          await interaction.editReply("That item is no longer in the character's inventory.");
          return;
        }

        const availableQuantity = item.remainingQty ?? item.quantity ?? 1;
        if (quantity > availableQuantity) {
          await interaction.editReply(
            `You only have ${availableQuantity} of **${item.name}** available.`,
          );
          return;
        }

        const existingListing = await findActiveListingByCharacterAndItem(characterId, itemId);
        if (existingListing) {
          await interaction.editReply("That item already has an active listing.");
          return;
        }

        let listing;
        try {
          listing = await createListing({
            sellerDiscordUserId: interaction.user.id,
            sellerCharacterId: characterId,
            sellerCharacterName: formatCharacterName(character),
            itemId,
            itemName: item.name,
            itemDescription: item.description || null,
            quantity,
            priceGold: goldResult.value,
            priceSc: scResult.value,
          });
        } catch (createError) {
          if (createError instanceof DuplicateActiveListingError) {
            await interaction.editReply("That item already has an active listing.");
            return;
          }
          throw createError;
        }

        const quantityText = quantity > 1 ? `${quantity}x ` : "";
        await interaction.editReply(
          `Listed ${quantityText}**${item.name}** for **${formatListingPrice(listing)}**${quantity > 1 ? " each" : ""} on the player marketplace.`,
        );
        updatePlayerMarketplaceMessage(interaction.client).catch((syncError) => {
          console.error("Failed to update player marketplace display after listing:", syncError);
        });
      } catch (error) {
        console.error("Failed to process /sell price modal:", error);
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply("Something went wrong while creating that listing. Please try again.");
        } else {
          await interaction.reply({
            content: "Something went wrong while creating that listing. Please try again.",
            ephemeral: true,
          });
        }
      }

      return;
    }

    if (interaction.customId.startsWith("request-modal:")) {
      const [, ownerId, characterId] = interaction.customId.split(":");
      if (ownerId !== interaction.user.id) {
        await interaction.reply({
          content: "Use your own `/request` command so this form belongs to you.",
          ephemeral: true,
        });
        return;
      }

      function parseOptionalPrice(rawValue) {
        const trimmed = rawValue.trim();
        if (!trimmed) return { ok: true, value: null };
        const parsed = Number.parseInt(trimmed, 10);
        if (!Number.isInteger(parsed) || parsed <= 0 || String(parsed) !== trimmed) {
          return { ok: false, value: null };
        }
        return { ok: true, value: parsed };
      }

      try {
        await interaction.deferReply({ ephemeral: true });

        const itemName = interaction.fields.getTextInputValue("request-item-name").trim();
        if (!itemName) {
          await interaction.editReply("Item name cannot be empty.");
          return;
        }

        const rawQuantity = interaction.fields.getTextInputValue("request-quantity").trim();
        const quantity = rawQuantity ? Number.parseInt(rawQuantity, 10) : 1;
        if (!Number.isInteger(quantity) || quantity <= 0 || String(quantity) !== (rawQuantity || "1")) {
          await interaction.editReply("Quantity must be a positive whole number.");
          return;
        }

        const goldResult = parseOptionalPrice(
          interaction.fields.getTextInputValue("request-price-gold"),
        );
        const scResult = parseOptionalPrice(
          interaction.fields.getTextInputValue("request-price-sc"),
        );

        if (!goldResult.ok || !scResult.ok) {
          await interaction.editReply("Prices must be positive whole numbers.");
          return;
        }
        if (goldResult.value === null && scResult.value === null) {
          await interaction.editReply("Enter an offer in Gold, SC, or both.");
          return;
        }

        const character = await getWestMarchesCharacter(characterId);
        if (!character) {
          await interaction.editReply("I could not find that character anymore.");
          return;
        }

        const request = await createRequest({
          requesterDiscordUserId: interaction.user.id,
          requesterCharacterId: characterId,
          requesterCharacterName: formatCharacterName(character),
          itemName,
          quantity,
          offerPriceGold: goldResult.value,
          offerPriceSc: scResult.value,
        });

        const quantityText = quantity > 1 ? `${quantity}x ` : "";
        await interaction.editReply(
          `Requested ${quantityText}**${itemName}** for **${formatRequestPrice(request)}**${quantity > 1 ? " each" : ""} on the player marketplace.`,
        );
        updatePlayerRequestMessage(interaction.client).catch((syncError) => {
          console.error("Failed to update player request display after creation:", syncError);
        });
      } catch (error) {
        console.error("Failed to process /request modal:", error);
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply("Something went wrong while creating that request. Please try again.");
        } else {
          await interaction.reply({
            content: "Something went wrong while creating that request. Please try again.",
            ephemeral: true,
          });
        }
      }

      return;
    }

    if (!interaction.customId.startsWith("approve-modal:")) {
      return;
    }

    const [, ownerId, category, detailValue] = interaction.customId.split(":");
    if (ownerId !== interaction.user.id) {
      await interaction.reply({
        content: "Use your own `/approve` command so the form belongs to you.",
        ephemeral: true,
      });
      return;
    }

    if (!hasRequiredRole(interaction)) {
      await interaction.reply({
        content: "You do not have the required role to approve homebrew.",
        ephemeral: true,
      });
      return;
    }

    try {
      await interaction.deferReply({ ephemeral: true });

      const name = interaction.fields.getTextInputValue("homebrew-name");
      const usesMarkdown = categoryUsesMarkdown(category);
      const url = usesMarkdown
        ? null
        : interaction.fields.getTextInputValue("homebrew-url");
      const contentMarkdown = usesMarkdown
        ? interaction.fields.getTextInputValue("homebrew-markdown")
        : null;
      const threadUrl = interaction.fields.getTextInputValue("discussion-thread").trim();
      const messageUrl = interaction.fields.getTextInputValue("discussion-message").trim();

      const approval = await approveHomebrew({
        category,
        detailValue: detailValue === "none" ? "" : detailValue,
        name,
        url,
        contentMarkdown,
      });

      const approvalText = usesMarkdown
        ? approval.created
          ? `Approved **${approval.label}** under **${approval.categoryLabel}**.\n${approval.sitePath}`
          : `Updated existing **${approval.label}** under **${approval.categoryLabel}**.\n${approval.sitePath}`
        : approval.created
          ? `Approved **${approval.label}** under **${approval.title}**.\n${approval.href}`
          : `That homebrew was already listed under **${approval.title}** as **${approval.label}**.\n${approval.href}`;

      if (approval.created && interaction.channel?.send) {
        try {
          await interaction.channel.send(
            buildApprovalAnnouncement(approval, interaction.user.toString()),
          );
        } catch (postError) {
          console.error("Failed to post /approve announcement:", postError);
          await interaction.followUp({
            content:
              "The homebrew was approved, but I could not post the public channel announcement.",
            ephemeral: true,
          });
        }
      }

      if (!threadUrl && !messageUrl) {
        await interaction.editReply(approvalText);
        return;
      }

      if (!threadUrl || !messageUrl) {
        await interaction.editReply(
          `${approvalText}\n\nDiscussion rewards were skipped: both a thread link and a submission message link are required.`,
        );
        return;
      }

      if (!isWestMarchesConfigured()) {
        await interaction.editReply(
          `${approvalText}\n\nDiscussion rewards were not awarded because West Marches API access is not configured.`,
        );
        return;
      }

      const isSubclass = category === "subclasses";
      const scReward = isSubclass ? 5 : 2;

      try {
        const result = await collectHomebrewDiscussionParticipants({
          client: interaction.client,
          threadInput: threadUrl,
          messageInput: messageUrl,
          fallbackChannel: interaction.channel,
        });

        let matchedCharacters = [];
        let missingUserIds = result.participantIds;

        if (result.participantIds.length > 0) {
          const characterResult = await listHighestLevelActiveCharactersForDiscordUsers(
            result.participantIds,
          );
          matchedCharacters = characterResult.matched;
          missingUserIds = characterResult.missingUserIds;

          if (matchedCharacters.length > 0) {
            await awardScToCharacters({
              awards: matchedCharacters,
              amount: scReward,
              reason: `Homebrew discussion reward: ${result.thread.name}`.slice(0, 500),
            });
          }
        }

        await interaction.editReply(
          `${approvalText}\n\nDiscussion: ${result.participantIds.length} participant(s), **${scReward} SC** awarded to ${matchedCharacters.length} character(s). Posting public receipt now.`,
        );

        if (result.participantIds.length === 0) {
          await interaction.channel.send({
            content: `No non-bot participants were found for **${result.thread.name}**.`,
            allowedMentions: { parse: [] },
          });
        }

        if (matchedCharacters.length > 0) {
          const awardedLines = matchedCharacters.map((award) => ({
            userId: award.discordUserId,
            text: `<@${award.discordUserId}> -> **${award.characterName}**`,
          }));
          const awardedMessages = [];
          let current = `Awarded **${scReward} SC** to:\n`;
          let currentUserIds = [];

          for (const line of awardedLines) {
            const next = `${current}${current.endsWith("\n") ? "" : "\n"}${line.text}`;
            if (next.length > 1900 || currentUserIds.length >= 100) {
              awardedMessages.push({ content: current, userIds: currentUserIds });
              current = `Awarded **${scReward} SC** to:\n${line.text}`;
              currentUserIds = [line.userId];
            } else {
              current = next;
              currentUserIds.push(line.userId);
            }
          }
          awardedMessages.push({ content: current, userIds: currentUserIds });

          for (const msg of awardedMessages) {
            await interaction.channel.send({
              content: msg.content,
              allowedMentions: { parse: [], users: msg.userIds },
            });
          }
        }

        if (missingUserIds.length > 0) {
          const missingMessages = chunkMentionLines(missingUserIds, {
            header: "I could not find an active WestMarches.games character for:",
            emptyText: "",
          });
          for (const msg of missingMessages) {
            await interaction.channel.send({
              content: msg.content,
              allowedMentions: { parse: [], users: msg.userIds },
            });
          }
        }
      } catch (discussionError) {
        console.error("Failed to process discussion rewards in /approve:", discussionError);
        const discussionErrorMsg =
          discussionError.message === "invalid_thread"
            ? "I could not find a thread ID in the thread link."
            : discussionError.message === "not_thread"
              ? "The thread link did not resolve to a Discord thread."
              : discussionError.message === "invalid_message"
                ? "I could not find a message ID in the submission message link."
                : discussionError.message === "missing_message_channel"
                  ? "Use a Discord message link, or run the command in the same channel as the submission message."
                  : discussionError.message === "message_channel_unavailable"
                    ? "I could not access the submission message channel."
                    : discussionError.message === "missing_sc_currency_id"
                      ? "WEST_MARCHES_SC_CURRENCY_ID is not configured."
                      : "Something went wrong while gathering homebrew discussion participants.";

        await interaction.editReply(
          `${approvalText}\n\nDiscussion rewards failed: ${discussionErrorMsg}`,
        );
      }
    } catch (error) {
      console.error("Failed to process /approve modal:", error);
      const message =
        error instanceof TypeError
          ? "That URL is not valid. Please run `/approve` again with a full URL."
          : error.message === "invalid_markdown_homebrew"
            ? "The name and markdown text are required. Please run `/approve` again with both fields filled in."
            : "Something went wrong while approving that homebrew. Please try again.";

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(message);
      } else {
        await interaction.reply({ content: message, ephemeral: true });
      }
    }

    return;
  }

  if (interaction.isButton()) {
    if (interaction.customId.startsWith("level-role-sync-")) {
      const [action, ownerId] = interaction.customId
        .slice("level-role-sync-".length)
        .split(":");
      if (ownerId !== interaction.user.id) {
        await interaction.reply({
          content: "This reconciliation preview belongs to someone else.",
          ephemeral: true,
        });
        return;
      }
      if (!hasRequiredRole(interaction)) {
        await interaction.reply({
          content: "You no longer have permission to synchronize level roles.",
          ephemeral: true,
        });
        return;
      }

      const expiresAt = pendingLevelRoleSyncs.get(ownerId);
      if (!expiresAt || expiresAt < Date.now()) {
        pendingLevelRoleSyncs.delete(ownerId);
        await interaction.update({
          content: "This preview has expired. Run `/sync-level-roles` again for fresh data.",
          components: [],
          attachments: [],
        });
        return;
      }

      pendingLevelRoleSyncs.delete(ownerId);
      if (action === "cancel") {
        await interaction.update({
          content: "Level-role reconciliation cancelled. No roles were changed.",
          components: [],
          attachments: [],
        });
        return;
      }

      await interaction.deferUpdate();
      try {
        const summary = await reconcileAllLevelRoles(interaction.guild);
        await interaction.editReply({
          content: formatReconciliationSummary(summary),
          components: [],
          attachments: [],
          files: summary.changeDetails.length > 0
            ? [{
                attachment: Buffer.from(
                  formatChangeDetails(
                    summary.changeDetails,
                    "Applied level-role reconciliation changes",
                  ),
                  "utf8",
                ),
                name: "level-role-sync-results.txt",
              }]
            : [],
        });
      } catch (error) {
        console.error("Failed to apply character level roles:", error);
        await interaction.editReply({
          content: "The reconciliation failed before it completed. Check the bot logs for details.",
          components: [],
        });
      }
      return;
    }

    if (interaction.customId.startsWith("quest-call-respond:")) {
      const questCallId = Number(interaction.customId.slice("quest-call-respond:".length));

      if (!isWestMarchesConfigured()) {
        await interaction.reply({
          content:
            "West Marches API access is not configured, so I cannot load your characters yet.",
          ephemeral: true,
        });
        return;
      }

      try {
        const call = await getQuestCall(questCallId);
        if (!call || call.closedAt || new Date(call.expiresAt) <= new Date()) {
          await interaction.reply({
            content: "This quest call has ended.",
            ephemeral: true,
          });
          return;
        }

        await interaction.deferReply({ ephemeral: true });

        const characters = await listOwnedActiveWestMarchesCharacters(interaction.user.id);
        if (characters.length === 0) {
          await interaction.editReply(
            "I could not find any active WestMarches.games characters linked to your Discord account.",
          );
          return;
        }

        const selectedCharacterIds = await listUserResponseCharacterIds(
          questCallId,
          interaction.user.id,
        );
        const normalizedCharacters = characters.map((character) => ({
          id: character.id,
          name: formatCharacterName(character),
          className: formatCharacterClass(character),
          level: normalizeCharacterLevel(character),
        }));
        const visibleCharacters = normalizedCharacters.slice(0, 25);
        const overflowText =
          normalizedCharacters.length > visibleCharacters.length
            ? `\n\nI found ${normalizedCharacters.length} active characters. Discord menus can only show 25 options, so only the first 25 by name are listed.`
            : "";

        await interaction.editReply({
          content: `Choose the character(s) you'd like to bring to this quest.${overflowText}`,
          components: [
            buildQuestCallCharacterRow(questCallId, visibleCharacters, selectedCharacterIds),
          ],
        });
      } catch (error) {
        console.error("Failed to open quest call character picker:", error);
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(
            "Something went wrong while loading your characters. Please try again.",
          );
        } else {
          await interaction.reply({
            content: "Something went wrong while loading your characters. Please try again.",
            ephemeral: true,
          });
        }
      }
      return;
    }

    if (interaction.customId.startsWith("quest-call-close:")) {
      const questCallId = Number(interaction.customId.slice("quest-call-close:".length));

      try {
        const call = await getQuestCall(questCallId);
        if (!call) {
          await interaction.reply({
            content: "I couldn't find that quest call anymore.",
            ephemeral: true,
          });
          return;
        }
        if (call.dmDiscordUserId !== interaction.user.id) {
          await interaction.reply({
            content: "Only the DM who posted this call can close it.",
            ephemeral: true,
          });
          return;
        }
        if (call.closedAt) {
          await interaction.reply({
            content: "This quest call is already closed.",
            ephemeral: true,
          });
          return;
        }

        await interaction.deferUpdate();
        const closed = await closeQuestCall(questCallId, "manual");
        const rows = await listCallResponses(questCallId);
        const embed = buildQuestCallEmbed(closed, rows);
        await interaction.editReply({ embeds: [embed], components: [] });
      } catch (error) {
        console.error("Failed to close quest call:", error);
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content: "Something went wrong. Please try again.",
            components: [],
          });
        } else {
          await interaction.reply({
            content: "Something went wrong. Please try again.",
            ephemeral: true,
          });
        }
      }
      return;
    }

    if (!interaction.customId.startsWith("craft-confirm:")) {
      return;
    }

    const [, auditIdRaw, ownerId, decision] = interaction.customId.split(":");
    if (ownerId !== interaction.user.id) {
      await interaction.reply({
        content: "This isn't your craft to confirm.",
        ephemeral: true,
      });
      return;
    }

    try {
      await interaction.deferReply({ ephemeral: true });

      const auditId = Number(auditIdRaw);
      const result = await resolveCraftConfirmation({ auditId, decision });

      if (result.status === "not_found") {
        await interaction.editReply("I couldn't find that craft confirmation anymore.");
        return;
      }

      if (result.status === "already_resolved") {
        await interaction.editReply("This craft confirmation has already been resolved.");
        return;
      }

      if (result.status === "declined") {
        await interaction.editReply("Okay, not added to your inventory.");
        await interaction.message
          .edit({
            content: `${interaction.message.content}\n\n❌ **Declined** — not added to inventory.`,
            components: [],
          })
          .catch(() => {});
        return;
      }

      if (result.status === "confirmed") {
        await interaction.editReply(
          `Added **${result.event.raw_item_name}** to **${result.event.matched_character_name}**'s inventory!`,
        );
        await interaction.message
          .edit({
            content: `${interaction.message.content}\n\n✅ **Added to inventory.**`,
            components: [],
          })
          .catch(() => {});
        return;
      }

      await interaction.editReply("Something went wrong while adding that item. Please try again.");
    } catch (error) {
      console.error("Failed to process craft confirmation button:", error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply("Something went wrong. Please try again.");
      } else {
        await interaction.reply({
          content: "Something went wrong. Please try again.",
          ephemeral: true,
        });
      }
    }

    return;
  }

  if (!interaction.isChatInputCommand()) {
    return;
  }

  if (!interaction.inGuild() || interaction.guildId !== config.guildId) {
    await interaction.reply({
      content: "Use this command inside the server.",
      ephemeral: true,
    });
    return;
  }

  if (interaction.commandName === "feedback") {
    const anonymous = interaction.options.getBoolean("anonymous", true);
    await interaction.showModal(buildFeedbackModal({ anonymous }));
    return;
  }
  if (interaction.commandName === "book-request") {
    await interaction.showModal(buildBookRequestModal());
    return;
  }
  if (interaction.commandName === "magicitem") {
    await interaction.reply({
      content: "Choose a rarity to roll a random magic item.",
      components: [buildMagicItemRarityRow(interaction.user.id)],
      ephemeral: true,
    });
    return;
  }

  if (interaction.commandName === "help") {
    const helpMessages = buildHelpMessages(interaction);
    await interaction.reply({
      content: helpMessages[0],
      ephemeral: true,
    });
    for (const content of helpMessages.slice(1)) {
      await interaction.followUp({
        content,
        ephemeral: true,
      });
    }
    return;
  }
  if (interaction.commandName === "sc-character") {
    if (!isWestMarchesConfigured()) {
      await interaction.reply({
        content:
          "West Marches API access is not configured, so I cannot load your characters yet.",
        ephemeral: true,
      });
      return;
    }

    try {
      await interaction.deferReply({ ephemeral: true });

      const [characters, preference] = await Promise.all([
        listOwnedActiveWestMarchesCharacters(interaction.user.id),
        getScRewardCharacterPreference(interaction.user.id),
      ]);

      if (characters.length === 0) {
        await interaction.editReply(
          "I could not find any active WestMarches.games characters linked to your Discord account.",
        );
        return;
      }

      const visibleCharacters = characters.slice(0, 25);
      const currentCharacter = preference
        ? characters.find(
            (character) => character.id === preference.characterId,
          )
        : null;
      const overflowText =
        characters.length > visibleCharacters.length
          ? `\n\nI found ${characters.length} active characters. Discord menus can only show 25 options, so only the first 25 by name are listed.`
          : "";
      const currentText = currentCharacter
        ? ` Your current default is **${formatCharacterName(currentCharacter)}**.`
        : "";

      await interaction.editReply({
        content: `Choose the character that should receive automatic SC-only rewards.${currentText}${overflowText}`,
        components: [
          buildScRewardCharacterRow(
            interaction.user.id,
            visibleCharacters,
            preference?.characterId || null,
          ),
        ],
      });
    } catch (error) {
      console.error("Failed to process /sc-character:", error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "Something went wrong while loading your characters. Please try again.",
        );
      } else {
        await interaction.reply({
          content:
            "Something went wrong while loading your characters. Please try again.",
          ephemeral: true,
        });
      }
    }

    return;
  }

  if (interaction.commandName === "retire") {
    if (!isWestMarchesConfigured()) {
      await interaction.reply({
        content:
          "West Marches API access is not configured, so I cannot load your characters yet.",
        ephemeral: true,
      });
      return;
    }

    try {
      await interaction.deferReply({ ephemeral: true });

      const characters = await listOwnedActiveWestMarchesCharacters(
        interaction.user.id,
      );

      if (characters.length === 0) {
        await interaction.editReply(
          "I could not find any active WestMarches.games characters linked to your Discord account.",
        );
        return;
      }

      const visibleCharacters = characters.slice(0, 25);
      const overflowText =
        characters.length > visibleCharacters.length
          ? `\n\nI found ${characters.length} active characters. Discord menus can only show 25 options, so only the first 25 by name are listed.`
          : "";

      await interaction.editReply({
        content: `Choose the character you want to retire.${overflowText}`,
        components: [
          buildRetireCharacterRow(interaction.user.id, visibleCharacters),
        ],
      });
    } catch (error) {
      console.error("Failed to process /retire:", error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "Something went wrong while loading your characters. Please try again.",
        );
      } else {
        await interaction.reply({
          content:
            "Something went wrong while loading your characters. Please try again.",
          ephemeral: true,
        });
      }
    }

    return;
  }

  if (interaction.commandName === "characters") {
    if (!isWestMarchesConfigured()) {
      await interaction.reply({
        content:
          "West Marches API access is not configured, so I cannot load your characters yet.",
        ephemeral: true,
      });
      return;
    }

    const visibility =
      interaction.options.getString("visibility") === "public"
        ? "public"
        : "private";
    const isPublic = visibility === "public";

    try {
      await interaction.deferReply({ ephemeral: !isPublic });
      const characters = await listOwnedCharacterSummaries(interaction.user.id);
      await interaction.editReply({
        embeds: [
          buildCharacterListEmbed({
            displayName: getDisplayName(interaction),
            characters,
          }),
        ],
      });
    } catch (error) {
      console.error("Failed to process /characters:", error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "Something went wrong while loading your characters. Please try again.",
        );
      } else {
        await interaction.reply({
          content:
            "Something went wrong while loading your characters. Please try again.",
          ephemeral: true,
        });
      }
    }

    return;
  }

  if (interaction.commandName === "faq") {
    try {
      await interaction.deferReply({ ephemeral: true });
      const categories = await listFaqEntries();
      await interaction.editReply({
        embeds: buildFaqEmbeds(categories),
      });
    } catch (error) {
      console.error("Failed to process /faq:", error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "Something went wrong while loading the FAQ. Please try again.",
        );
      } else {
        await interaction.reply({
          content:
            "Something went wrong while loading the FAQ. Please try again.",
          ephemeral: true,
        });
      }
    }

    return;
  }

  if (interaction.commandName === "join-guild") {
    if (!isWestMarchesConfigured()) {
      await interaction.reply({
        content:
          "West Marches API access is not configured, so I cannot load your characters yet.",
        ephemeral: true,
      });
      return;
    }

    try {
      await interaction.deferReply({ ephemeral: true });

      const characters = await listOwnedActiveWestMarchesCharacters(
        interaction.user.id,
      );

      if (characters.length === 0) {
        await interaction.editReply(
          "I could not find any active WestMarches.games characters linked to your Discord account.",
        );
        return;
      }

      const visibleCharacters = characters.slice(0, 25);
      const overflowText =
        characters.length > visibleCharacters.length
          ? `\n\nI found ${characters.length} active characters. Discord menus can only show 25 options, so only the first 25 by name are listed.`
          : "";

      await interaction.editReply({
        content: `Choose the character you want to add to a guild.${overflowText}`,
        components: [
          buildJoinGuildCharacterRow(interaction.user.id, visibleCharacters),
        ],
      });
    } catch (error) {
      console.error("Failed to process /join-guild:", error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "Something went wrong while loading your characters. Please try again.",
        );
      } else {
        await interaction.reply({
          content:
            "Something went wrong while loading your characters. Please try again.",
          ephemeral: true,
        });
      }
    }

    return;
  }

  if (interaction.commandName === "leave-guild") {
    if (!isWestMarchesConfigured()) {
      await interaction.reply({
        content:
          "West Marches API access is not configured, so I cannot verify your characters yet.",
        ephemeral: true,
      });
      return;
    }

    try {
      await interaction.deferReply({ ephemeral: true });

      const [characters, memberships] = await Promise.all([
        listOwnedActiveWestMarchesCharacters(interaction.user.id),
        listGuildRosterMembershipsForDiscordUser(interaction.user.id),
      ]);
      const ownedCharacterIds = new Set(
        characters.map((character) => character.id),
      );
      const leaveOptions = memberships.filter((membership) =>
        ownedCharacterIds.has(membership.westMarchesCharacterId),
      );

      if (leaveOptions.length === 0) {
        await interaction.editReply(
          "I could not find any of your active characters in a guild roster.",
        );
        return;
      }

      const visibleMemberships = leaveOptions.slice(0, 25);
      const overflowText =
        leaveOptions.length > visibleMemberships.length
          ? `\n\nI found ${leaveOptions.length} rostered active characters. Discord menus can only show 25 options, so only the first 25 by name are listed.`
          : "";

      await interaction.editReply({
        content: `Choose the character you want to remove from their guild.${overflowText}`,
        components: [
          buildLeaveGuildCharacterRow(interaction.user.id, visibleMemberships),
        ],
      });
    } catch (error) {
      console.error("Failed to process /leave-guild:", error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "Something went wrong while loading your guild roster entries. Please try again.",
        );
      } else {
        await interaction.reply({
          content:
            "Something went wrong while loading your guild roster entries. Please try again.",
          ephemeral: true,
        });
      }
    }

    return;
  }

  if (interaction.commandName === "post-guild-rosters") {
    if (!hasRequiredRole(interaction)) {
      await interaction.reply({
        content: "You do not have the required role to post guild rosters.",
        ephemeral: true,
      });
      return;
    }

    try {
      await interaction.deferReply({ ephemeral: true });
      const updatedGuilds = await updateGuildRosterMessages(interaction);
      await interaction.editReply(
        updatedGuilds.length
          ? `Posted or refreshed ${updatedGuilds.length} guild roster messages.`
          : "No published guild rosters were found to post.",
      );
    } catch (error) {
      console.error("Failed to process /post-guild-rosters:", error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "Something went wrong while posting the guild rosters. Please try again.",
        );
      } else {
        await interaction.reply({
          content:
            "Something went wrong while posting the guild rosters. Please try again.",
          ephemeral: true,
        });
      }
    }

    return;
  }

  if (interaction.commandName === "sticky") {
    if (!hasRequiredRole(interaction)) {
      await interaction.reply({
        content: "You do not have the required role to manage sticky messages.",
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "set") {
      const existing = await getStickyMessage(interaction.channelId);
      await interaction.showModal(
        buildStickyModal(interaction.channelId, existing?.content ?? ""),
      );
      return;
    }

    try {
      await interaction.deferReply({ ephemeral: true });

      const sticky = await getStickyMessage(interaction.channelId);
      if (!sticky) {
        await interaction.editReply("There is no sticky message in this channel.");
        return;
      }

      await clearStickyMessage(interaction.channelId);

      if (sticky.discord_message_id) {
        try {
          await interaction.channel.messages.delete(sticky.discord_message_id);
        } catch {
          // Already deleted or inaccessible; nothing to clean up.
        }
      }

      await interaction.editReply("Sticky message removed from this channel.");
    } catch (error) {
      console.error("Failed to process /sticky:", error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "Something went wrong while managing the sticky message. Please try again.",
        );
      } else {
        await interaction.reply({
          content:
            "Something went wrong while managing the sticky message. Please try again.",
          ephemeral: true,
        });
      }
    }

    return;
  }

  if (interaction.commandName === "sell") {
    const subcommand = interaction.options.getSubcommand();

    if (!isWestMarchesConfigured()) {
      await interaction.reply({
        content: "West Marches API access is not configured, so I cannot manage marketplace listings yet.",
        ephemeral: true,
      });
      return;
    }

    try {
      if (subcommand === "list") {
        const characters = await listOwnedActiveWestMarchesCharacters(interaction.user.id);
        if (characters.length === 0) {
          await interaction.reply({
            content: "I could not find any active WestMarches.games characters under your Discord account.",
            ephemeral: true,
          });
          return;
        }

        await interaction.reply({
          content: "Choose which character is selling.",
          components: [buildSellCharacterRow(interaction.user.id, characters)],
          ephemeral: true,
        });
        return;
      }

      const listings = await listActiveListingsForDiscordUser(interaction.user.id);
      if (listings.length === 0) {
        await interaction.reply({
          content: "You have no active marketplace listings.",
          ephemeral: true,
        });
        return;
      }

      await interaction.reply({
        content: "Choose a listing to cancel.",
        components: [buildCancelListingRow(interaction.user.id, listings)],
        ephemeral: true,
      });
    } catch (error) {
      console.error("Failed to process /sell:", error);
      await interaction.reply({
        content: "Something went wrong while loading the marketplace. Please try again.",
        ephemeral: true,
      });
    }

    return;
  }

  if (interaction.commandName === "request") {
    const subcommand = interaction.options.getSubcommand();

    if (!isWestMarchesConfigured()) {
      await interaction.reply({
        content: "West Marches API access is not configured, so I cannot manage marketplace requests yet.",
        ephemeral: true,
      });
      return;
    }

    try {
      if (subcommand === "post") {
        const characters = await listOwnedActiveWestMarchesCharacters(interaction.user.id);
        if (characters.length === 0) {
          await interaction.reply({
            content: "I could not find any active WestMarches.games characters under your Discord account.",
            ephemeral: true,
          });
          return;
        }

        await interaction.reply({
          content: "Choose which character is requesting.",
          components: [buildRequestCharacterRow(interaction.user.id, characters)],
          ephemeral: true,
        });
        return;
      }

      const requests = await listOpenRequestsForDiscordUser(interaction.user.id);
      if (requests.length === 0) {
        await interaction.reply({
          content: "You have no open marketplace requests.",
          ephemeral: true,
        });
        return;
      }

      await interaction.reply({
        content: "Choose a request to cancel.",
        components: [buildCancelRequestRow(interaction.user.id, requests)],
        ephemeral: true,
      });
    } catch (error) {
      console.error("Failed to process /request:", error);
      await interaction.reply({
        content: "Something went wrong while loading the marketplace. Please try again.",
        ephemeral: true,
      });
    }

    return;
  }

  if (interaction.commandName === "rp") {
    const subcommand = interaction.options.getSubcommand();
    const rpContext = getRpContext(interaction);

    try {
      await interaction.deferReply();

      if (subcommand === "start") {
        const result = await startRpSession(rpContext);

        if (result.status === "already_open") {
          const session = await getRpSessionStatus(rpContext);
          await interaction.editReply(
            [
              "An RP timer is already open in this channel or thread.",
              buildRpStatusText(session),
            ].join("\n"),
          );
          return;
        }

        await interaction.editReply(
          [
            `RP tracking started by <@${interaction.user.id}>.`,
            "Active roleplay time is now counting.",
            "Use `/rp pause` when the scene stops and `/rp end` when it is finished.",
          ].join("\n"),
        );
        return;
      }

      if (subcommand === "pause") {
        const result = await pauseRpSession(rpContext);

        if (result.status === "not_found") {
          await interaction.editReply(
            "No RP timer is active in this channel or thread. Use `/rp start` to begin one.",
          );
          return;
        }

        if (result.status === "not_allowed") {
          await interaction.editReply(
            `Only <@${result.session.startedByDiscordUserId}> or staff can pause this RP timer.`,
          );
          return;
        }

        if (result.status === "already_paused") {
          await interaction.editReply(
            [
              "The RP timer is already paused.",
              `Active time so far: **${formatRpDuration(result.session.activeSeconds)}**.`,
            ].join("\n"),
          );
          return;
        }

        await interaction.editReply(
          [
            `RP tracking paused by <@${interaction.user.id}>.`,
            `Active time so far: **${formatRpDuration(result.session.activeSeconds)}**.`,
            "Use `/rp resume` when roleplay starts again.",
          ].join("\n"),
        );
        return;
      }

      if (subcommand === "resume") {
        const result = await resumeRpSession(rpContext);

        if (result.status === "not_found") {
          await interaction.editReply(
            "No RP timer is paused in this channel or thread. Use `/rp start` to begin one.",
          );
          return;
        }

        if (result.status === "not_allowed") {
          await interaction.editReply(
            `Only <@${result.session.startedByDiscordUserId}> or staff can resume this RP timer.`,
          );
          return;
        }

        if (result.status === "already_active") {
          await interaction.editReply(
            [
              "The RP timer is already active and counting.",
              `Active time so far: **${formatRpDuration(result.session.activeSeconds)}** before this active stretch.`,
            ].join("\n"),
          );
          return;
        }

        await interaction.editReply(
          [
            `RP tracking resumed by <@${interaction.user.id}>.`,
            "Active roleplay time is counting again.",
            `Previously counted time: **${formatRpDuration(result.session.activeSeconds)}**.`,
          ].join("\n"),
        );
        return;
      }

      if (subcommand === "end") {
        const result = await endRpSession(rpContext);

        if (result.status === "not_found") {
          await interaction.editReply(
            "No RP timer is active in this channel or thread.",
          );
          return;
        }

        if (result.status === "not_allowed") {
          await interaction.editReply(
            `Only <@${result.session.startedByDiscordUserId}> or staff can end this RP timer.`,
          );
          return;
        }

        await interaction.editReply(
          [
            `RP tracking ended by <@${interaction.user.id}>.`,
            `Total active roleplay time: **${formatRpDuration(result.session.activeSeconds)}**.`,
          ].join("\n"),
        );
        return;
      }

      if (subcommand === "status") {
        const session = await getRpSessionStatus(rpContext);
        await interaction.editReply(buildRpStatusText(session));
      }
    } catch (error) {
      console.error("Failed to process /rp:", error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "Something went wrong while updating the RP timer. Please check that the RP session table exists and try again.",
        );
      } else {
        await interaction.reply({
          content:
            "Something went wrong while updating the RP timer. Please check that the RP session table exists and try again.",
          ephemeral: true,
        });
      }
    }

    return;
  }

  if (interaction.commandName === "quest") {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "acquire" || subcommand === "list") {
      if (!isWestMarchesConfigured()) {
        await interaction.reply({
          content: "West Marches API access is not configured, so I cannot load your characters yet.",
          ephemeral: true,
        });
        return;
      }

      try {
        await interaction.deferReply({ ephemeral: true });

        const characters = await listOwnedActiveWestMarchesCharacters(interaction.user.id);
        if (characters.length === 0) {
          await interaction.editReply(
            "I could not find any active WestMarches.games characters linked to your Discord account.",
          );
          return;
        }

        const visibleCharacters = characters.slice(0, 25);
        const overflowText =
          characters.length > visibleCharacters.length
            ? `\n\nI found ${characters.length} active characters. Discord menus can only show 25 options, so only the first 25 by name are listed.`
            : "";

        if (subcommand === "acquire") {
          await interaction.editReply({
            content: `Choose the character who should acquire a side-quest objective.${overflowText}`,
            components: [buildQuestAcquireCharacterRow(interaction.user.id, visibleCharacters)],
          });
        } else {
          await interaction.editReply({
            content: `Choose a character to view their side-quest objectives and guild renown.${overflowText}`,
            components: [buildQuestListCharacterRow(interaction.user.id, visibleCharacters)],
          });
        }
      } catch (error) {
        console.error(`Failed to process /quest ${subcommand}:`, error);
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(
            "Something went wrong while loading your characters. Please try again.",
          );
        } else {
          await interaction.reply({
            content: "Something went wrong while loading your characters. Please try again.",
            ephemeral: true,
          });
        }
      }

      return;
    }

    if (subcommand === "reroll") {
      try {
        await interaction.deferReply({ ephemeral: true });

        const characters = await listCharactersWithActiveObjectives(interaction.user.id);
        if (characters.length === 0) {
          await interaction.editReply(
            "You do not have any characters with active side-quest objectives to reroll.",
          );
          return;
        }

        await interaction.editReply({
          content: "Choose the character whose objective you want to reroll.",
          components: [buildQuestRerollCharacterRow(interaction.user.id, characters)],
        });
      } catch (error) {
        console.error("Failed to process /quest reroll:", error);
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(
            "Something went wrong while loading your active objectives. Please try again.",
          );
        } else {
          await interaction.reply({
            content: "Something went wrong while loading your active objectives. Please try again.",
            ephemeral: true,
          });
        }
      }

      return;
    }

    if (subcommand === "redeem") {
      try {
        await interaction.deferReply({ ephemeral: true });

        const characters = await listCharactersWithCompletedUnredeemedObjectives(
          interaction.user.id,
        );
        if (characters.length === 0) {
          await interaction.editReply(
            "You do not have any completed side-quest objectives ready to redeem yet.",
          );
          return;
        }

        await interaction.editReply({
          content: "Choose the character whose completed objectives you want to redeem.",
          components: [buildQuestRedeemCharacterRow(interaction.user.id, characters)],
        });
      } catch (error) {
        console.error("Failed to process /quest redeem:", error);
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(
            "Something went wrong while loading your completed objectives. Please try again.",
          );
        } else {
          await interaction.reply({
            content: "Something went wrong while loading your completed objectives. Please try again.",
            ephemeral: true,
          });
        }
      }

      return;
    }

    return;
  }

  if (interaction.commandName === "boss-start") {
    if (!hasRequiredRole(interaction)) {
      await interaction.reply({
        content: "You do not have the required role to start a boss fight.",
        ephemeral: true,
      });
      return;
    }

    const name = interaction.options.getString("name", true).trim();
    const maxHpOption = interaction.options.getInteger("max-hp");
    const mode = interaction.options.getString("mode") || "countdown";
    const target = interaction.options.getString("target");
    const imageUrl = interaction.options.getString("image-url")?.trim() || null;
    const trackingMode =
      mode === "countup" && target === "none" ? "countup_unbounded" : mode;
    const maxHp = maxHpOption === null ? null : BigInt(maxHpOption);

    if (!name) {
      await interaction.reply({
        content: "Boss name is required.",
        ephemeral: true,
      });
      return;
    }

    if (target === "none" && mode !== "countup") {
      await interaction.reply({
        content: "Target none can only be used with count-up mode.",
        ephemeral: true,
      });
      return;
    }

    if (trackingMode !== "countup_unbounded" && maxHp === null) {
      await interaction.reply({
        content:
          "Max HP is required unless this is a count-up tracker with target set to none.",
        ephemeral: true,
      });
      return;
    }

    try {
      await interaction.deferReply({ ephemeral: true });
      const boss = await startBossFight({
        name,
        maxHp,
        imageUrl,
        trackingMode,
      });
      const status = await postOrRefreshBossStatus(interaction, boss);
      const startedValue =
        boss.trackingMode === "countup_unbounded"
          ? "with progress target ∞"
          : boss.trackingMode === "countup"
            ? `with progress target ${formatBossHp(boss.maxHp)}`
            : `with ${formatBossHp(boss.maxHp)} HP`;
      await interaction.editReply(
        `Started **${boss.name}** ${startedValue} and ${status.created ? "posted" : "refreshed"} the boss status message.`,
      );
    } catch (error) {
      console.error("Failed to process /boss-start:", error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "Something went wrong while starting the boss fight. Please check that the boss tables exist and try again.",
        );
      } else {
        await interaction.reply({
          content:
            "Something went wrong while starting the boss fight. Please check that the boss tables exist and try again.",
          ephemeral: true,
        });
      }
    }

    return;
  }

  if (interaction.commandName === "boss-post") {
    if (!hasRequiredRole(interaction)) {
      await interaction.reply({
        content: "You do not have the required role to post the boss status.",
        ephemeral: true,
      });
      return;
    }

    try {
      await interaction.deferReply({ ephemeral: true });
      const boss = await getActiveBoss();
      if (!boss) {
        await interaction.editReply("No active boss fight is configured.");
        return;
      }

      await postOrRefreshBossStatus(interaction, boss, {
        forceNew: true,
      });
      await interaction.editReply(
        `Posted a fresh boss status message for **${boss.name}**.`,
      );
    } catch (error) {
      console.error("Failed to process /boss-post:", error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "Something went wrong while posting the boss status. Please try again.",
        );
      } else {
        await interaction.reply({
          content:
            "Something went wrong while posting the boss status. Please try again.",
          ephemeral: true,
        });
      }
    }

    return;
  }

  if (
    interaction.commandName === "boss-damage" ||
    interaction.commandName === "boss-heal"
  ) {
    const isHeal = interaction.commandName === "boss-heal";
    if (!hasRequiredRole(interaction)) {
      await interaction.reply({
        content: `You do not have the required role to ${isHeal ? "heal" : "damage"} the boss.`,
        ephemeral: true,
      });
      return;
    }

    const baseAmount = BigInt(interaction.options.getInteger("amount") ?? 1);
    const questLevel = isHeal
      ? null
      : interaction.options.getInteger("quest-level");
    const questMultiplier = isHeal
      ? 1n
      : getBossDamageQuestMultiplier(questLevel);
    const reason = interaction.options.getString("reason")?.trim() || null;

    if (!questMultiplier) {
      await interaction.reply({
        content: "Quest level must be between 4 and 20.",
        ephemeral: true,
      });
      return;
    }

    const amount = baseAmount * questMultiplier;
    const damageBreakdown =
      !isHeal && questLevel
        ? ` (${formatBossHp(baseAmount)} x ${questMultiplier.toString()} for quest level ${questLevel})`
        : "";

    try {
      await interaction.deferReply({ ephemeral: isHeal });
      const boss = await recordBossHpEntry({
        discordUserId: interaction.user.id,
        amount,
        entryType: isHeal ? "heal" : "damage",
        reason,
        baseAmount: isHeal ? null : baseAmount,
        questLevel,
        questMultiplier: isHeal ? null : questMultiplier,
      });

      if (!boss) {
        await interaction.editReply("No active boss fight is configured.");
        return;
      }

      await postOrRefreshBossStatus(interaction, boss);
      const isCountUpBoss =
        boss.trackingMode === "countup" ||
        boss.trackingMode === "countup_unbounded";
      const targetText =
        boss.trackingMode === "countup_unbounded"
          ? "∞"
          : formatBossHp(boss.maxHp);
      const updateMessage = isCountUpBoss
        ? isHeal
          ? `Removed ${formatBossHp(amount)} progress from **${boss.name}**. Progress: ${formatBossHp(boss.currentHp)} / ${targetText}.`
          : `The Voice of Altharion calls the strike true: **${boss.name}** gains **${formatBossHp(amount)} progress**${damageBreakdown}. Progress: ${formatBossHp(boss.currentHp)} / ${targetText}.`
        : isHeal
          ? `Restored ${formatBossHp(amount)} HP to **${boss.name}**. Current HP: ${formatBossHp(boss.currentHp)}/${formatBossHp(boss.maxHp)}.`
          : `The Voice of Altharion calls the strike true: **${boss.name}** suffers **${formatBossHp(amount)} damage**${damageBreakdown}. Current HP: ${formatBossHp(boss.currentHp)}/${formatBossHp(boss.maxHp)}.`;

      await interaction.editReply(updateMessage);
    } catch (error) {
      console.error(`Failed to process /${interaction.commandName}:`, error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "Something went wrong while updating the boss HP. Please try again.",
        );
      } else {
        await interaction.reply({
          content:
            "Something went wrong while updating the boss HP. Please try again.",
          ephemeral: true,
        });
      }
    }

    return;
  }

  if (interaction.commandName === "boss-status") {
    const visibility =
      interaction.options.getString("visibility") === "public"
        ? "public"
        : "private";
    const isPublic = visibility === "public";

    try {
      await interaction.deferReply({ ephemeral: !isPublic });
      const boss = await getActiveBoss();
      if (!boss) {
        await interaction.editReply("No active boss fight is configured.");
        return;
      }

      await interaction.editReply({ embeds: [buildBossHealthEmbed(boss)] });
    } catch (error) {
      console.error("Failed to process /boss-status:", error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "Something went wrong while loading the boss status. Please try again.",
        );
      } else {
        await interaction.reply({
          content:
            "Something went wrong while loading the boss status. Please try again.",
          ephemeral: true,
        });
      }
    }

    return;
  }

  if (interaction.commandName === "boss-log") {
    try {
      await interaction.deferReply({ ephemeral: true });
      const boss = await getActiveBoss();
      if (!boss) {
        await interaction.editReply("No active boss fight is configured.");
        return;
      }

      const entries = await listBossLogEntries(boss.id);
      await interaction.editReply({
        embeds: [buildBossLogEmbed(boss, entries)],
      });
    } catch (error) {
      console.error("Failed to process /boss-log:", error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "Something went wrong while loading the boss log. Please try again.",
        );
      } else {
        await interaction.reply({
          content:
            "Something went wrong while loading the boss log. Please try again.",
          ephemeral: true,
        });
      }
    }

    return;
  }

  if (interaction.commandName === "sync-level-roles") {
    if (!hasRequiredRole(interaction)) {
      await interaction.reply({
        content: "You do not have the required role to synchronize level roles.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    try {
      const preview = await previewAllLevelRoleChanges(interaction.guild);
      if (preview.changes.length > 0) {
        pendingLevelRoleSyncs.set(
          interaction.user.id,
          Date.now() + 15 * 60 * 1000,
        );
      }
      await interaction.editReply({
        content: formatReconciliationPreview(preview),
        components: preview.changes.length > 0
          ? [buildLevelRoleSyncButtons(interaction.user.id)]
          : [],
        files: preview.changes.length > 0
          ? [{
              attachment: Buffer.from(
                formatChangeDetails(
                  preview.changes,
                  "Proposed level-role reconciliation changes (dry run)",
                ),
                "utf8",
              ),
              name: "level-role-sync-preview.txt",
            }]
          : [],
      });
    } catch (error) {
      console.error("Failed to reconcile character level roles:", error);
      await interaction.editReply(
        "The level-role reconciliation failed before it could complete. Check the bot logs for details.",
      );
    }
    return;
  }

  if (interaction.commandName === "approve-character") {
    if (!hasDmOrRequiredRole(interaction)) {
      await interaction.reply({
        content: "You do not have the required role to approve characters.",
        ephemeral: true,
      });
      return;
    }

    if (!isWestMarchesConfigured()) {
      await interaction.reply({
        content:
          "West Marches API access is not configured, so I cannot approve characters yet.",
        ephemeral: true,
      });
      return;
    }

    const targetUser = interaction.options.getUser("user", true);
    const characterName = interaction.options.getString("character") || "";

    try {
      await interaction.deferReply();

      const result = await findUnapprovedCharacterForDiscordUser(
        targetUser.id,
        characterName,
      );

      if (result.status === "none") {
        await interaction.editReply(
          characterName
            ? `I could not find an unapproved active character named **${characterName}** for ${targetUser}.`
            : `I could not find any unapproved active characters linked to ${targetUser}.`,
        );
        return;
      }

      if (result.status === "ambiguous") {
        const names = result.candidates
          .slice(0, 10)
          .map((character) => `**${formatCharacterName(character)}**`)
          .join(", ");
        await interaction.editReply(
          `I found multiple unapproved active characters for ${targetUser}. Run the command again with the character option. Candidates: ${names}`,
        );
        return;
      }

      const character = result.character;
      const approved = await approveWestMarchesCharacter(character.id);
      const beginnerRoleStatus = await ensureMemberRole(
        interaction.guild,
        targetUser.id,
        config.beginnerRoleId,
      );
      await deleteStatRollsByRoller(targetUser.id).catch((err) =>
        console.error("Failed to delete stat rolls for approved user:", err),
      );
      const approverCharacters =
        await listHighestLevelActiveCharactersForDiscordUsers([
          interaction.user.id,
        ]);
      const [approverRewardCharacter] = approverCharacters.matched;
      let approverRewardText = "";

      if (approverRewardCharacter && config.westMarchesScCurrencyId) {
        await awardScToCharacters({
          awards: [approverRewardCharacter],
          amount: 2,
          reason: `Character approval: ${formatCharacterName(character)}`.slice(
            0,
            500,
          ),
        });
        approverRewardText = `\nAwarded **2 SC** to **${approverRewardCharacter.characterName}** for the approval.`;
      } else {
        approverRewardText = config.westMarchesScCurrencyId
          ? "\nI could not find an active character for the approver, so no approval SC was awarded."
          : "\nApproval SC was not awarded because WEST_MARCHES_SC_CURRENCY_ID is not configured.";
      }

      const beginnerChannelText = config.beginnerRoleChannelId
        ? `<#${config.beginnerRoleChannelId}>`
        : "Channels & Roles";
      const approvalConfirmed =
        approved?.isApproved === true
          ? "has been approved"
          : "was submitted for approval";
      const beginnerRoleText =
        beginnerRoleStatus === "assigned"
          ? "I've assigned your Beginner [1-4] role."
          : beginnerRoleStatus === "already-assigned"
            ? "You already have the Beginner [1-4] role."
            : `I couldn't assign the Beginner [1-4] role automatically; please grab it from ${beginnerChannelText}.`;

      await interaction.editReply({
        content:
          `${targetUser} Your character **${formatCharacterName(character)}** ${approvalConfirmed} by ${interaction.user}!\n` +
          `${beginnerRoleText} ` +
          approverRewardText,
        allowedMentions: {
          parse: [],
          users: [targetUser.id, interaction.user.id],
        },
      });
    } catch (error) {
      console.error("Failed to process /approve-character:", error);
      const message =
        error.status === 403
          ? "The WestMarches API key is missing write permission for character approval."
          : "Something went wrong while approving that character. Please try again.";

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(message);
      } else {
        await interaction.reply({ content: message, ephemeral: true });
      }
    }

    return;
  }

  if (interaction.commandName === "rollstats") {
    await interaction.deferReply({ ephemeral: true });
    try {
      const statLines = rollFiveStatLines();
      const lockedUntil = new Date(Date.now() + 12 * 60 * 60 * 1000);
      const lockTimestamp = Math.floor(lockedUntil.getTime() / 1000);

      const lines = statLines.map((stats, i) => {
        const total = stats.reduce((a, b) => a + b, 0);
        return `**Set ${i + 1}** — ${stats.join(", ")} *(total: ${total})*`;
      });

      const publicContent = [
        "## Stat Rolls",
        "",
        ...lines,
        "",
        `Rolled by ${interaction.user} · Open to all <t:${lockTimestamp}:R>`,
      ].join("\n");

      const publicMessage = await interaction.channel.send(publicContent);
      const discordMessageUrl = `https://discord.com/channels/${interaction.guildId}/${publicMessage.channelId}/${publicMessage.id}`;

      const savedSets = await saveStatRollSets({
        statLines,
        discordMessageUrl,
        rolledByDiscordUserId: interaction.user.id,
        rolledByUsername: interaction.user.globalName ?? interaction.user.username,
        lockedUntil,
      });

      pendingStatRolls.set(interaction.user.id, {
        statLines,
        rowIds: savedSets.map((s) => s.id),
        messageId: publicMessage.id,
        channelId: publicMessage.channelId,
        lockedUntil,
        timestamp: Date.now(),
      });

      const menu = new StringSelectMenuBuilder()
        .setCustomId(`rollstats-pick:${interaction.user.id}`)
        .setPlaceholder("Reserve a set for yourself, or skip")
        .addOptions([
          {
            label: "Reserve none",
            description: "All sets open to everyone after 12 hours",
            value: "none",
          },
          ...statLines.map((stats, i) => ({
            label: `Set ${i + 1} — Total: ${stats.reduce((a, b) => a + b, 0)}`,
            description: stats.join(", "),
            value: String(i),
          })),
        ]);

      await interaction.editReply({
        content: "Your rolls have been posted! Would you like to reserve one for yourself now? You have 12 hours exclusive access on the site before they open to everyone.",
        components: [new ActionRowBuilder().addComponents(menu)],
      });
    } catch (error) {
      console.error("Failed to process /rollstats:", error);
      await interaction.editReply("Something went wrong while rolling stat lines. Please try again.");
    }
    return;
  }

  if (interaction.commandName === "approve") {
    if (!hasRequiredRole(interaction)) {
      await interaction.reply({
        content: "You do not have the required role to approve homebrew.",
        ephemeral: true,
      });
      return;
    }

    const submissionUrl = interaction.options.getString("submission")?.trim() ?? "";

    if (submissionUrl) {
      await interaction.deferReply({ ephemeral: true });
      const idMatch = submissionUrl.match(/channels\/\d+\/(\d+)\/(\d+)/);
      let prefillStatus = "";
      if (!idMatch) {
        prefillStatus = "I could not read the submission link because it is not a valid Discord message link. The form will open without auto-filled information.";
        console.warn("Could not prefill /approve: invalid submission link", { approverId: interaction.user.id, submissionUrl });
      } else {
        const [, channelId, messageId] = idMatch;
        let channel;
        try {
          channel = await interaction.client.channels.fetch(channelId);
        } catch (error) {
          console.error("Could not prefill /approve: failed to fetch submission channel", { approverId: interaction.user.id, channelId, messageId, error });
          prefillStatus = "I could not access the submission channel. It may have been deleted, or I may be missing **View Channel** permission. The form will open without auto-filled information.";
        }
        if (channel && !channel.messages) {
          console.warn("Could not prefill /approve: channel cannot provide messages", { approverId: interaction.user.id, channelId, messageId });
          prefillStatus = "That link does not point to a channel where I can read messages. The form will open without auto-filled information.";
        } else if (channel) {
          try {
            const message = await channel.messages.fetch(messageId);
            const parsed = parseSubmissionContent(message.content, message.embeds);
            pendingApprovals.set(interaction.user.id, { ...parsed, submissionUrl });
            const missingFields = [!parsed.name && "homebrew name", !parsed.url && "homebrew link", !parsed.threadUrl && "workshop thread link"].filter(Boolean);
            if (missingFields.length) {
              prefillStatus = `I found the submission message, but could not extract the ${missingFields.join(", ")}. You can enter the missing information manually in the form.`;
              console.warn("Partially prefilled /approve submission", { approverId: interaction.user.id, channelId, messageId, missingFields });
            } else {
              prefillStatus = "I found the submission and auto-filled its information.";
            }
          } catch (error) {
            console.error("Could not prefill /approve: failed to fetch submission message", { approverId: interaction.user.id, channelId, messageId, error });
            prefillStatus = "I could not access the submission message. It may have been deleted, or I may be missing **Read Message History** permission. The form will open without auto-filled information.";
          }
        }
      }

      await interaction.editReply({
        content: `${prefillStatus}\n\nChoose the type of homebrew to approve.`,
        components: [buildApproveCategoryRow(interaction.user.id)],
      });
    } else {
      await interaction.reply({
        content: "Choose the type of homebrew to approve.",
        components: [buildApproveCategoryRow(interaction.user.id)],
        ephemeral: true,
      });
    }
    return;
  }

  if (interaction.commandName === "post-discord-content") {
    if (!hasRequiredRole(interaction)) {
      await interaction.reply({
        content: "You do not have the required role to use this command.",
        ephemeral: true,
      });
      return;
    }

    const type = interaction.options.getString("type");
    await interaction.deferReply({ ephemeral: true });

    try {
      if (type === "starting-graces") {
        const channelId = config.startingGracesChannelId;
        if (!channelId) {
          await interaction.editReply("Starting graces channel is not configured.");
          return;
        }
        const count = await postAllStartingGracesToDiscord(interaction.client, channelId);
        await interaction.editReply(`Posted or refreshed ${count} starting grace message${count === 1 ? "" : "s"}.`);
      } else if (type === "character-creation") {
        const channelId = config.characterCreationChannelId;
        if (!channelId) {
          await interaction.editReply("Character creation channel is not configured.");
          return;
        }
        const count = await postWikiSectionsToDiscord(interaction.client, "getting-set-up", channelId);
        await interaction.editReply(`Posted or refreshed ${count} character creation section${count === 1 ? "" : "s"}.`);
      }
    } catch (error) {
      console.error("Failed to process /post-discord-content:", error);
      await interaction.editReply("Something went wrong while posting content. Please try again.");
    }
    return;
  }

  if (interaction.commandName === "quest-check") {
    if (!hasDmOrRequiredRole(interaction)) {
      await interaction.reply({
        content: "Only DMs can post a quest call.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    try {
      const hoursUntilStart = interaction.options.getInteger("hours") ?? 0;
      const call = await createQuestCall(
        interaction.channelId,
        interaction.user.id,
        hoursUntilStart,
      );
      const embed = buildQuestCallEmbed(call, []);
      const components = buildQuestCallMessageComponents(call.id);

      const message = await interaction.channel.send({
        embeds: [embed],
        components,
        allowedMentions: { parse: [] },
      });
      await setQuestCallMessageId(call.id, message.id);

      await interaction.editReply(
        "Your quest call has been posted! Players can respond with the character(s) they'd like to bring.",
      );
    } catch (error) {
      console.error("Failed to process /quest-check:", error);
      await interaction.editReply(
        "Something went wrong while posting your quest call. Please try again.",
      );
    }
    return;
  }

  if (interaction.commandName !== "cc-link") {
    return;
  }

  if (!hasRequiredRole(interaction)) {
    await interaction.reply({
      content: "You do not have the required role to request a CC link.",
      ephemeral: true,
    });
    return;
  }

  try {
    await interaction.deferReply({ ephemeral: true });

    const campaign = await getOrAssignCampaign(interaction.user.id);
    if (!campaign) {
      await interaction.editReply(
        "No active campaign links are currently available. Please contact staff.",
      );
      return;
    }

    await interaction.editReply(
      `Your assigned campaign is **${campaign.code}**.\nJoin link: ${campaign.invite_url}`,
    );
  } catch (error) {
    console.error("Failed to process /cc-link:", error);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(
        "Something went wrong while fetching your link. Please try again.",
      );
    } else {
      await interaction.reply({
        content:
          "Something went wrong while fetching your link. Please try again.",
        ephemeral: true,
      });
    }
  }
}

module.exports = {
  handleInteraction,
};
