const config = require("./config");
const { buildHelpMessage } = require("./commands");
const { hasRequiredRole } = require("./permissions");
const { getDisplayName } = require("./utils");
const { getOrAssignCampaign } = require("./services/campaigns");
const {
  buildBossLogEmbed,
  buildBossStatusEmbed,
  formatBossHp,
  getActiveBoss,
  listBossLogEntries,
  postOrRefreshBossStatus,
  recordBossHpEntry,
  startBossFight,
} = require("./services/bosses");
const {
  buildFaqEmbeds,
  listFaqEntries,
} = require("./services/faq");
const {
  buildCharacterListEmbed,
  formatCharacterName,
  getOwnedActiveWestMarchesCharacter,
  isWestMarchesConfigured,
  listOwnedActiveWestMarchesCharacters,
  listOwnedCharacterSummaries,
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
          content: "Use your own `/approve` command so the menu belongs to you.",
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
          content: "Use your own `/approve` command so the menu belongs to you.",
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

    if (interaction.customId.startsWith("join-guild-character:")) {
      const ownerId = interaction.customId.slice("join-guild-character:".length);
      if (ownerId !== interaction.user.id) {
        await interaction.reply({
          content: "Use your own `/join-guild` command so the menu belongs to you.",
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
          content: "Use your own `/join-guild` command so the menu belongs to you.",
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
          [
            previousMembership?.guildId,
            membership.guildId,
          ].filter(Boolean),
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
      const ownerId = interaction.customId.slice("leave-guild-character:".length);
      if (ownerId !== interaction.user.id) {
        await interaction.reply({
          content: "Use your own `/leave-guild` command so the menu belongs to you.",
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
        console.error("Failed to process /leave-guild character select:", error);
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
        content: "Use your own `/magicitem` command so the menu belongs to you.",
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
          content:
            `No published magic items are available for **${rarity.label}** yet.`,
          components: [
            buildMagicItemRarityRow(interaction.user.id, selectedRarity),
          ],
        });
        return;
      }

      await interaction.update({
        content:
          `**${rarity.label} Magic Item:** ${item.item_label}\nUse the menu to roll again.`,
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
          content: "Something went wrong while loading the FAQ. Please try again.",
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
    const maxHp = BigInt(interaction.options.getInteger("max-hp", true));
    const imageUrl = interaction.options.getString("image-url")?.trim() || null;

    if (!name) {
      await interaction.reply({
        content: "Boss name is required.",
        ephemeral: true,
      });
      return;
    }

    try {
      await interaction.deferReply({ ephemeral: true });
      const boss = await startBossFight({ name, maxHp, imageUrl });
      const status = await postOrRefreshBossStatus(interaction, boss);
      await interaction.editReply(
        `Started **${boss.name}** with ${formatBossHp(boss.maxHp)} HP and ${status.created ? "posted" : "refreshed"} the boss status message.`,
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

      const status = await postOrRefreshBossStatus(interaction, boss);
      await interaction.editReply(
        `${status.created ? "Posted" : "Refreshed"} the boss status message for **${boss.name}**.`,
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

    const amount = BigInt(interaction.options.getInteger("amount", true));
    const reason = interaction.options.getString("reason")?.trim() || null;

    try {
      await interaction.deferReply({ ephemeral: isHeal });
      const boss = await recordBossHpEntry({
        discordUserId: interaction.user.id,
        amount,
        entryType: isHeal ? "heal" : "damage",
        reason,
      });

      if (!boss) {
        await interaction.editReply("No active boss fight is configured.");
        return;
      }

      await postOrRefreshBossStatus(interaction, boss);
      const updateMessage = isHeal
        ? `Restored ${formatBossHp(amount)} HP to **${boss.name}**. Current HP: ${formatBossHp(boss.currentHp)}/${formatBossHp(boss.maxHp)}.`
        : `The Voice of Altharion calls the strike true: **${boss.name}** suffers **${formatBossHp(amount)} damage**. Current HP: ${formatBossHp(boss.currentHp)}/${formatBossHp(boss.maxHp)}.`;

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
    try {
      await interaction.deferReply({ ephemeral: true });
      const boss = await getActiveBoss();
      if (!boss) {
        await interaction.editReply("No active boss fight is configured.");
        return;
      }

      await interaction.editReply({ embeds: [buildBossStatusEmbed(boss)] });
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
      await interaction.editReply({ embeds: [buildBossLogEmbed(boss, entries)] });
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
