const { ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const config = require("../config");
const pool = require("../db");
const { formatCharacterName } = require("./westMarches");

const GUILD_ROSTER_CHANGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

async function listPublishedGuilds() {
  const result = await pool.query(
    `
    SELECT id, name, slug, sort_order
    FROM guilds
    WHERE is_published = true
    ORDER BY sort_order ASC, LOWER(name) ASC, id ASC
    `,
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    sortOrder: row.sort_order,
  }));
}

function mapGuildRosterMembership(row) {
  return row
    ? {
        id: Number(row.id),
        guildId: Number(row.guild_id),
        guildName: row.guild_name,
        westMarchesCharacterId: row.westmarches_character_id,
        characterName: row.character_name,
        discordUserId: row.discord_user_id,
        lastMembershipChangeAt: row.last_membership_change_at,
      }
    : null;
}

function getGuildRosterCooldownUntil(membership) {
  return getCooldownUntilFromTimestamp(membership?.lastMembershipChangeAt);
}

function formatDiscordTimestamp(milliseconds) {
  return `<t:${Math.ceil(milliseconds / 1000)}:R>`;
}

function getCooldownUntilFromTimestamp(timestamp) {
  if (!timestamp) {
    return null;
  }

  const lastChangedAt = new Date(timestamp).getTime();
  if (Number.isNaN(lastChangedAt)) {
    return null;
  }

  const unlocksAt = lastChangedAt + GUILD_ROSTER_CHANGE_COOLDOWN_MS;
  return unlocksAt > Date.now() ? unlocksAt : null;
}

async function getGuildRosterCharacterCooldown(
  client,
  {
    characterId,
    characterName,
    discordUserId,
  },
) {
  const result = await client.query(
    `
    SELECT last_membership_change_at
    FROM guild_roster_character_cooldowns
    WHERE westmarches_character_id = $1
      OR (
        discord_user_id = $2
        AND LOWER(character_name) = LOWER($3)
      )
    ORDER BY
      CASE WHEN westmarches_character_id = $1 THEN 0 ELSE 1 END,
      updated_at DESC
    LIMIT 1
    `,
    [characterId, discordUserId, characterName],
  );

  return getCooldownUntilFromTimestamp(result.rows[0]?.last_membership_change_at);
}

async function recordGuildRosterCharacterCooldown(
  client,
  {
    characterId,
    characterName,
    discordUserId,
  },
) {
  await client.query(
    `
    INSERT INTO guild_roster_character_cooldowns (
      westmarches_character_id,
      character_name,
      discord_user_id,
      last_membership_change_at
    )
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (westmarches_character_id) DO UPDATE
    SET
      character_name = EXCLUDED.character_name,
      discord_user_id = EXCLUDED.discord_user_id,
      last_membership_change_at = NOW(),
      updated_at = NOW()
    `,
    [characterId, characterName, discordUserId],
  );
}

async function getGuildRosterMembership({
  characterId,
  characterName,
  discordUserId,
}) {
  const result = await pool.query(
    `
    SELECT
      m.id,
      m.guild_id,
      g.name AS guild_name,
      m.westmarches_character_id,
      m.character_name,
      m.discord_user_id,
      m.last_membership_change_at
    FROM guild_roster_memberships m
    JOIN guilds g ON g.id = m.guild_id
    WHERE m.westmarches_character_id = $1
      OR (
        m.discord_user_id = $2
        AND LOWER(m.character_name) = LOWER($3)
      )
    ORDER BY
      CASE WHEN m.westmarches_character_id = $1 THEN 0 ELSE 1 END,
      m.id ASC
    LIMIT 1
    `,
    [characterId, discordUserId, characterName],
  );

  return mapGuildRosterMembership(result.rows[0]);
}

async function listGuildRosterMembershipsForDiscordUser(discordUserId) {
  const result = await pool.query(
    `
    SELECT
      m.id,
      m.guild_id,
      g.name AS guild_name,
      m.westmarches_character_id,
      m.character_name,
      m.discord_user_id,
      m.last_membership_change_at
    FROM guild_roster_memberships m
    JOIN guilds g ON g.id = m.guild_id
    WHERE m.discord_user_id = $1
    ORDER BY LOWER(m.character_name) ASC, m.id ASC
    `,
    [discordUserId],
  );

  return result.rows.map(mapGuildRosterMembership);
}

async function deleteGuildRosterMembership({
  characterId,
  characterName,
  discordUserId,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingResult = await client.query(
      `
      SELECT
        m.id,
        m.guild_id,
        g.name AS guild_name,
        m.westmarches_character_id,
        m.character_name,
        m.discord_user_id,
        m.last_membership_change_at
      FROM guild_roster_memberships m
      JOIN guilds g ON g.id = m.guild_id
      WHERE m.discord_user_id = $2
        AND (
          m.westmarches_character_id = $1
          OR LOWER(m.character_name) = LOWER($3)
        )
      ORDER BY
        CASE WHEN m.westmarches_character_id = $1 THEN 0 ELSE 1 END,
        m.id ASC
      LIMIT 1
      `,
      [characterId, discordUserId, characterName],
    );
    const membership = mapGuildRosterMembership(existingResult.rows[0]);
    const cooldownUntil = getGuildRosterCooldownUntil(membership);

    if (!membership || cooldownUntil) {
      await client.query("ROLLBACK");
      return {
        membership,
        cooldownUntil,
      };
    }

    const deleteResult = await client.query(
      `
      DELETE FROM guild_roster_memberships
      WHERE id = $1
      RETURNING
        id,
        guild_id,
        westmarches_character_id,
        character_name,
        discord_user_id,
        last_membership_change_at
      `,
      [membership.id],
    );

    await recordGuildRosterCharacterCooldown(client, {
      characterId,
      characterName,
      discordUserId,
    });

    await client.query("COMMIT");

    return {
      membership: mapGuildRosterMembership({
        ...deleteResult.rows[0],
        guild_name: membership.guildName,
      }),
      cooldownUntil: null,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function upsertGuildRosterMembership({
  guildId,
  characterId,
  characterName,
  discordUserId,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const guildResult = await client.query(
      `
      SELECT id, name
      FROM guilds
      WHERE id = $1
        AND is_published = true
      LIMIT 1
      `,
      [guildId],
    );
    const guild = guildResult.rows[0];

    if (!guild) {
      await client.query("ROLLBACK");
      return null;
    }

    const existingResult = await client.query(
      `
      SELECT
        m.id,
        m.guild_id,
        g.name AS guild_name,
        m.westmarches_character_id,
        m.character_name,
        m.discord_user_id,
        m.last_membership_change_at
      FROM guild_roster_memberships m
      JOIN guilds g ON g.id = m.guild_id
      WHERE m.westmarches_character_id = $1
        OR (
          m.discord_user_id = $2
          AND LOWER(m.character_name) = LOWER($3)
        )
      ORDER BY
        CASE WHEN m.westmarches_character_id = $1 THEN 0 ELSE 1 END,
        m.id ASC
      LIMIT 1
      `,
      [characterId, discordUserId, characterName],
    );
    const previousMembership = mapGuildRosterMembership(existingResult.rows[0]);
    const cooldownUntil =
      getGuildRosterCooldownUntil(previousMembership) ||
      (await getGuildRosterCharacterCooldown(client, {
        characterId,
        characterName,
        discordUserId,
      }));
    if (cooldownUntil) {
      await client.query("ROLLBACK");
      return {
        membership: previousMembership,
        previousMembership,
        cooldownUntil,
      };
    }

    if (previousMembership?.guildId === guildId) {
      await client.query("ROLLBACK");
      return {
        membership: previousMembership,
        previousMembership,
        cooldownUntil: null,
      };
    }

    const membershipResult = previousMembership
      ? await client.query(
          `
          UPDATE guild_roster_memberships
          SET
            guild_id = $2,
            westmarches_character_id = $3,
            character_name = $4,
            discord_user_id = $5,
            last_membership_change_at = NOW(),
            updated_at = NOW()
          WHERE id = $1
          RETURNING
            id,
            guild_id,
            westmarches_character_id,
            character_name,
            discord_user_id,
            last_membership_change_at
          `,
          [
            previousMembership.id,
            guildId,
            characterId,
            characterName,
            discordUserId,
          ],
        )
      : await client.query(
          `
          INSERT INTO guild_roster_memberships (
            guild_id,
            westmarches_character_id,
            character_name,
            discord_user_id
          )
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (westmarches_character_id) DO UPDATE
          SET
            guild_id = EXCLUDED.guild_id,
            character_name = EXCLUDED.character_name,
            discord_user_id = EXCLUDED.discord_user_id,
            last_membership_change_at = NOW(),
            updated_at = NOW()
          RETURNING
            id,
            guild_id,
            westmarches_character_id,
            character_name,
            discord_user_id,
            last_membership_change_at
          `,
          [guildId, characterId, characterName, discordUserId],
        );

    await recordGuildRosterCharacterCooldown(client, {
      characterId,
      characterName,
      discordUserId,
    });

    await client.query("COMMIT");

    return {
      membership: {
        ...mapGuildRosterMembership({
          ...membershipResult.rows[0],
          guild_name: guild.name,
        }),
      },
      previousMembership,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function listGuildRosterRows() {
  const result = await pool.query(
    `
    SELECT
      g.id AS guild_id,
      g.name AS guild_name,
      g.sort_order,
      m.character_name,
      m.discord_user_id
    FROM guilds g
    LEFT JOIN guild_roster_memberships m ON m.guild_id = g.id
    WHERE g.is_published = true
    ORDER BY g.sort_order ASC, LOWER(g.name) ASC, LOWER(m.character_name) ASC NULLS LAST
    `,
  );

  const guilds = new Map();
  for (const row of result.rows) {
    const guildId = Number(row.guild_id);
    if (!guilds.has(guildId)) {
      guilds.set(guildId, {
        id: guildId,
        name: row.guild_name,
        members: [],
      });
    }

    if (row.character_name) {
      guilds.get(guildId).members.push({
        characterName: row.character_name,
        discordUserId: row.discord_user_id,
      });
    }
  }

  return [...guilds.values()];
}

const GUILD_ROSTER_DIVIDER = "----------------------------------------";

function formatRosterLine(member) {
  return `${member.characterName} <@${member.discordUserId}>`;
}

function buildGuildRosterMessage(roster) {
  const lines = [`**${roster.name}**`];
  const members = roster.members.map(formatRosterLine);
  const footerLines = [GUILD_ROSTER_DIVIDER];
  let length =
    lines.join("\n").length + footerLines.join("\n").length + 2;

  if (members.length === 0) {
    members.push("No active guild members listed yet.");
  }

  for (const memberLine of members) {
    if (length + memberLine.length + 1 > 1900) {
      lines.push("...and more.");
      break;
    }

    lines.push(memberLine);
    length += memberLine.length + 1;
  }

  lines.push(...footerLines);
  return lines.join("\n");
}

async function getGuildRosterTargetChannel(interaction) {
  const targetChannelId = config.guildRosterChannelId || interaction.channelId;
  const targetChannel = await interaction.client.channels.fetch(targetChannelId);
  if (!targetChannel?.send) {
    throw new Error("Guild roster channel is not a text channel.");
  }

  return {
    targetChannel,
    targetChannelId,
  };
}

async function updateGuildRosterMessages(interaction, guildIds = null) {
  const rosters = await listGuildRosterRows();
  const guildIdSet = guildIds
    ? new Set(guildIds.filter((guildId) => Number.isInteger(guildId)))
    : null;
  const rostersToUpdate = guildIdSet
    ? rosters.filter((roster) => guildIdSet.has(roster.id))
    : rosters;
  const messageResult = await pool.query(
    `
    SELECT guild_id, discord_channel_id, discord_message_id
    FROM guild_roster_messages
    `,
  );
  const messagesByGuildId = new Map(
    messageResult.rows.map((row) => [
      Number(row.guild_id),
      {
        channelId: row.discord_channel_id,
        messageId: row.discord_message_id,
      },
    ]),
  );
  const createdOrUpdated = [];

  for (const roster of rostersToUpdate) {
    const content = buildGuildRosterMessage(roster);
    const existingMessage = messagesByGuildId.get(roster.id);
    try {
      if (existingMessage) {
        const channel = await interaction.client.channels.fetch(
          existingMessage.channelId,
        );
        if (!channel?.messages) {
          throw new Error("Stored guild roster channel is not a text channel.");
        }

        const message = await channel.messages.fetch(existingMessage.messageId);
        await message.edit({
          content,
          allowedMentions: { parse: [] },
        });
        createdOrUpdated.push(roster.name);
        continue;
      }
    } catch (error) {
      console.error(
        `Failed to edit guild roster message for ${roster.name}; creating a new one:`,
        error,
      );
    }

    const { targetChannel, targetChannelId } =
      await getGuildRosterTargetChannel(interaction);
    const message = await targetChannel.send({
      content,
      allowedMentions: { parse: [] },
    });

    await pool.query(
      `
      INSERT INTO guild_roster_messages (
        guild_id,
        discord_channel_id,
        discord_message_id
      )
      VALUES ($1, $2, $3)
      ON CONFLICT (guild_id) DO UPDATE
      SET
        discord_channel_id = EXCLUDED.discord_channel_id,
        discord_message_id = EXCLUDED.discord_message_id,
        updated_at = NOW()
      `,
      [roster.id, targetChannelId, message.id],
    );
    createdOrUpdated.push(roster.name);
  }

  return createdOrUpdated;
}

function buildJoinGuildCharacterRow(discordUserId, characters) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`join-guild-character:${discordUserId}`)
    .setPlaceholder("Choose your character...")
    .addOptions(
      characters.slice(0, 25).map((character) => ({
        label: formatCharacterName(character).slice(0, 100),
        value: character.id,
      })),
    );

  return new ActionRowBuilder().addComponents(menu);
}

function buildLeaveGuildCharacterRow(discordUserId, memberships) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`leave-guild-character:${discordUserId}`)
    .setPlaceholder("Choose your character...")
    .addOptions(
      memberships.slice(0, 25).map((membership) => ({
        label: membership.characterName.slice(0, 100),
        description: `Currently in ${membership.guildName}`.slice(0, 100),
        value: membership.westMarchesCharacterId,
      })),
    );

  return new ActionRowBuilder().addComponents(menu);
}

function buildJoinGuildGuildRow(discordUserId, characterId, guilds, currentGuildId) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`join-guild-guild:${discordUserId}:${characterId}`)
    .setPlaceholder("Choose a guild...")
    .addOptions(
      guilds.map((guild) => ({
        label: guild.name.slice(0, 100),
        value: String(guild.id),
        default: guild.id === currentGuildId,
      })),
    );

  return new ActionRowBuilder().addComponents(menu);
}

function parseJoinGuildGuildCustomId(customId) {
  const prefix = "join-guild-guild:";
  if (!customId.startsWith(prefix)) {
    return null;
  }

  const remainder = customId.slice(prefix.length);
  const separatorIndex = remainder.indexOf(":");
  if (separatorIndex === -1) {
    return null;
  }

  return {
    ownerId: remainder.slice(0, separatorIndex),
    characterId: remainder.slice(separatorIndex + 1),
  };
}


module.exports = {
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
};
