const config = require("./config");
const { buildHelpMessage } = require("./commands");
const { hasDmOrRequiredRole, hasRequiredRole } = require("./permissions");
const { getDisplayName } = require("./utils");
const { getOrAssignCampaign } = require("./services/campaigns");
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
  awardScToCharacters,
  approveWestMarchesCharacter,
  buildCharacterListEmbed,
  buildScRewardCharacterRow,
  findUnapprovedCharacterForDiscordUser,
  formatCharacterName,
  getOwnedActiveWestMarchesCharacter,
  getScRewardCharacterPreference,
  isWestMarchesConfigured,
  listHighestLevelActiveCharactersForDiscordUsers,
  listOwnedActiveWestMarchesCharacters,
  listOwnedCharacterSummaries,
  upsertScRewardCharacterPreference,
} = require("./services/westMarches");
const {
  buildJoinGuildCharacterRow,
  buildJoinGuildGuildRow,
  buildLeaveGuildCharacterRow,
  deleteGuildRosterMembership,
  formatDiscordTimestamp,
  getGuildRosterCooldownUntil,
  getGuildRosterMembership,
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
const { rollFiveStatLines, saveStatRollSets } = require("./services/statRolls");

function getBossDamageQuestMultiplier(questLevel) {
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

async function handleInteraction(interaction) {
  if (interaction.isStringSelectMenu()) {
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

      await interaction.showModal(
        buildApproveModal(interaction.user.id, category),
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

      await interaction.showModal(
        buildApproveModal(interaction.user.id, category, detailValue),
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
      const approval = await approveHomebrew({
        category,
        detailValue: detailValue === "none" ? "" : detailValue,
        name,
        url,
        contentMarkdown,
      });

      await interaction.editReply(
        usesMarkdown
          ? approval.created
            ? `Approved **${approval.label}** under **${approval.categoryLabel}**.\n${approval.sitePath}`
            : `Updated existing **${approval.label}** under **${approval.categoryLabel}**.\n${approval.sitePath}`
          : approval.created
            ? `Approved **${approval.label}** under **${approval.title}**.\n${approval.href}`
            : `That homebrew was already listed under **${approval.title}** as **${approval.label}**.\n${approval.href}`,
      );

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

  if (interaction.commandName === "magicitem") {
    await interaction.reply({
      content: "Choose a rarity to roll a random magic item.",
      components: [buildMagicItemRarityRow(interaction.user.id)],
      ephemeral: true,
    });
    return;
  }

  if (interaction.commandName === "help") {
    await interaction.reply({
      content: buildHelpMessage(interaction),
      ephemeral: true,
    });
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

  if (interaction.commandName === "homebrew-discussion") {
    const threadInput = interaction.options.getString("thread", true);
    const messageInput = interaction.options.getString("message", true);
    const isSubclass = interaction.options.getBoolean("subclass") === true;
    const scReward = isSubclass ? 5 : 2;

    try {
      await interaction.deferReply({ ephemeral: true });

      const result = await collectHomebrewDiscussionParticipants({
        client: interaction.client,
        threadInput,
        messageInput,
        fallbackChannel: interaction.channel,
      });

      if (!result.threadOwnerId) {
        await interaction.editReply(
          "I could not identify the workshop thread creator, so I cannot award SC automatically.",
        );
        return;
      }

      if (result.threadOwnerId !== interaction.user.id) {
        await interaction.editReply(
          `Only the workshop thread creator <@${result.threadOwnerId}> can run this SC reward command.`,
        );
        return;
      }

      let matchedCharacters = [];
      let missingUserIds = result.participantIds;

      if (!isWestMarchesConfigured()) {
        await interaction.editReply(
          "West Marches API access is not configured, so I cannot award SC automatically.",
        );
        return;
      }

      if (result.participantIds.length > 0) {
        const characterResult =
          await listHighestLevelActiveCharactersForDiscordUsers(
            result.participantIds,
          );
        matchedCharacters = characterResult.matched;
        missingUserIds = characterResult.missingUserIds;

        if (matchedCharacters.length > 0) {
          await awardScToCharacters({
            awards: matchedCharacters,
            amount: scReward,
            reason: `Homebrew discussion reward: ${result.thread.name}`.slice(
              0,
              500,
            ),
          });
        }
      }

      const header = [
        `Homebrew discussion participants for **${result.thread.name}**:`,
        `${result.participantIds.length} user${result.participantIds.length === 1 ? "" : "s"} found.`,
        `Discussion posters: ${result.threadAuthorIds.length}. Submission voters: ${result.reactionUserIds.length}.`,
        `Reward: **${scReward} SC** each.`,
        `Awarded automatically: ${matchedCharacters.length}. No active character found: ${missingUserIds.length}.`,
        result.threadOwnerId
          ? `Excluded thread creator: <@${result.threadOwnerId}>.`
          : "Thread creator could not be identified.",
      ].join("\n");

      await interaction.editReply(
        `Found ${result.participantIds.length} participant${result.participantIds.length === 1 ? "" : "s"} and awarded ${scReward} SC to ${matchedCharacters.length} character${matchedCharacters.length === 1 ? "" : "s"}. Posting the public receipt now.`,
      );

      await interaction.channel.send({
        content: header,
        allowedMentions: {
          parse: [],
          users: result.threadOwnerId ? [result.threadOwnerId] : [],
        },
      });

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
            awardedMessages.push({
              content: current,
              userIds: currentUserIds,
            });
            current = `Awarded **${scReward} SC** to:\n${line.text}`;
            currentUserIds = [line.userId];
          } else {
            current = next;
            currentUserIds.push(line.userId);
          }
        }

        awardedMessages.push({
          content: current,
          userIds: currentUserIds,
        });

        for (const message of awardedMessages) {
          await interaction.channel.send({
            content: message.content,
            allowedMentions: {
              parse: [],
              users: message.userIds,
            },
          });
        }
      }

      if (missingUserIds.length > 0) {
        const missingMessages = chunkMentionLines(missingUserIds, {
          header: "I could not find an active WestMarches.games character for:",
          emptyText: "",
        });

        for (const message of missingMessages) {
          await interaction.channel.send({
            content: message.content,
            allowedMentions: {
              parse: [],
              users: message.userIds,
            },
          });
        }
      }
    } catch (error) {
      console.error("Failed to process /homebrew-discussion:", error);

      const message =
        error.message === "invalid_thread"
          ? "I could not find a thread ID in the thread option."
          : error.message === "not_thread"
            ? "That thread option did not resolve to a Discord thread."
            : error.message === "invalid_message"
              ? "I could not find a message ID in the message option."
              : error.message === "missing_message_channel"
                ? "Use a Discord message link, or run the command in the same channel as the submission message."
                : error.message === "message_channel_unavailable"
                  ? "I could not access the submission message channel."
                  : error.message === "missing_sc_currency_id"
                    ? "WEST_MARCHES_SC_CURRENCY_ID is not configured, so I cannot award SC automatically."
                    : "Something went wrong while gathering homebrew discussion participants. Check that I can view the thread, the submission channel, message history, and reactions.";

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(message);
      } else {
        await interaction.reply({ content: message, ephemeral: true });
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

    const baseAmount = BigInt(interaction.options.getInteger("amount", true));
    const questLevel = isHeal
      ? null
      : interaction.options.getInteger("quest-level", true);
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
          : `The Voice of Altharion calls the strike true: **${boss.name}** gains **${formatBossHp(amount)} progress** (${formatBossHp(baseAmount)} x ${questMultiplier.toString()} for quest level ${questLevel}). Progress: ${formatBossHp(boss.currentHp)} / ${targetText}.`
        : isHeal
          ? `Restored ${formatBossHp(amount)} HP to **${boss.name}**. Current HP: ${formatBossHp(boss.currentHp)}/${formatBossHp(boss.maxHp)}.`
          : `The Voice of Altharion calls the strike true: **${boss.name}** suffers **${formatBossHp(amount)} damage** (${formatBossHp(baseAmount)} x ${questMultiplier.toString()} for quest level ${questLevel}). Current HP: ${formatBossHp(boss.currentHp)}/${formatBossHp(boss.maxHp)}.`;

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

      await interaction.editReply({
        content:
          `${targetUser} Your character **${formatCharacterName(character)}** ${approvalConfirmed} by ${interaction.user}!\n` +
          `Don't forget to grab your Beginner [1-4] role from ${beginnerChannelText} and to add any XP you have from starting at higher than lvl 1.` +
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
    await interaction.deferReply();

    try {
      const statLines = rollFiveStatLines();

      const lines = statLines.map((stats, i) => {
        const total = stats.reduce((a, b) => a + b, 0);
        return `**Set ${i + 1}** — ${stats.join(", ")} *(total: ${total})*`;
      });

      const content = [
        "## Stat Rolls",
        "",
        ...lines,
        "",
        `Rolled by ${interaction.user}`,
      ].join("\n");

      await interaction.editReply({ content });

      const message = await interaction.fetchReply();
      const discordMessageUrl = `https://discord.com/channels/${interaction.guildId}/${message.channelId}/${message.id}`;

      await saveStatRollSets({
        statLines,
        discordMessageUrl,
        rolledByDiscordUserId: interaction.user.id,
      });
    } catch (error) {
      console.error("Failed to process /rollstats:", error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "Something went wrong while rolling stat lines. Please try again.",
        );
      }
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

    await interaction.reply({
      content: "Choose the type of homebrew to approve.",
      components: [buildApproveCategoryRow(interaction.user.id)],
      ephemeral: true,
    });
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
