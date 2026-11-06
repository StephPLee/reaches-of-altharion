const { pool } = require("./db");
const { homebrewForumChannelId } = require("./config");
const {
  createForumThread,
  deleteChannelMessage,
  editChannel,
  fetchChannel,
} = require("./discord");
const {
  DISCORD_MSG_LIMIT,
  packTokens,
  syncMessageParts,
} = require("./discordSync");
const { listHomebrewEntriesBySection } = require("./homebrew");

// One row per bot-owned forum post. `sections` are homebrew_entries.section
// values; each published entry in them becomes one message in the post.
// `tag` is matched by name against the forum's available tags.
const HOMEBREW_FORUM_POSTS = [
  {
    key: "feats",
    sections: ["feats"],
    title: "Homebrew Feats",
    tag: "Feat",
    intro:
      "The following list contains the Homebrew Feats within the realm of Altharion",
  },
  {
    key: "spells",
    sections: ["spells"],
    title: "Homebrew Spells",
    tag: "Spell",
    intro:
      "The following list contains the Homebrew Spells within the realm of Altharion",
  },
  {
    key: "species",
    sections: ["species"],
    title: "Homebrew Species",
    tag: "Species",
    intro:
      "The following list contains the Homebrew Species within the realm of Altharion",
  },
  {
    key: "subclasses",
    sections: ["subclasses"],
    title: "Homebrew Subclasses",
    tag: "Subclass",
    intro:
      "The following list contains the Homebrew Subclasses within the realm of Altharion",
  },
  {
    key: "weapons",
    sections: ["weapons"],
    title: "Homebrew Items - Weapons",
    tag: "Item",
    intro:
      "The following list contains the Homebrew Weapons within the realm of Altharion",
  },
  {
    key: "wondrous-items",
    sections: ["wondrous-items"],
    title: "Homebrew Items - Wondrous Items",
    tag: "Item",
    intro:
      "The following list contains the Homebrew Wondrous Items within the realm of Altharion",
  },
  {
    key: "item-sets",
    sections: ["item-sets"],
    title: "Homebrew Items - Sets",
    tag: "Item",
    intro:
      "The following list contains the Homebrew Item Sets within the realm of Altharion",
  },
  {
    key: "guild-feats",
    sections: ["guild-feats"],
    title: "Homebrew Feats - Guilds",
    tag: "Feat",
    intro:
      "The following list contains the Homebrew Feats for Guild Bonuses within the realm of Altharion",
    loadEntryHeaders: (entries) => loadGuildFeatHeaders(entries),
  },
  {
    key: "familiars",
    sections: ["familiars"],
    title: 'Homebrew "Familiars & Monsters"',
    tag: null,
    intro:
      "The following list contains the Homebrew Monsters within the realm of Altharion that players can use for spells such as Find Familiar and Find Greater Familiar",
  },
];

const SYNC_DEBOUNCE_MS = 3000;

function findPostForSection(section) {
  return HOMEBREW_FORUM_POSTS.find((post) => post.sections.includes(section));
}

function isUnknownChannelError(error) {
  return (
    error?.statusCode === 404 || String(error?.message).includes("10003")
  );
}

// Angle brackets around the URL stop Discord from adding link previews.
function formatItemLink(label, href, { bold = true } = {}) {
  const text = bold ? `**${label}**` : label;
  return href ? `[${text}](<${href}>)` : text;
}

function renderItemBlock(item, section) {
  const lines = [formatItemLink(item.label, item.href)];

  if (!item.href && section === "spells") {
    const spellName = item.label.split(" - ")[0].trim();
    lines.push(`Do \`!spell "${spellName}"\``);
  }

  for (const child of item.children) {
    lines.push(`- ${formatItemLink(child.label, child.href, { bold: false })}`);
  }

  return lines.join("\n");
}

// Renders one subcategory (homebrew entry) as one or more message contents,
// splitting between items if the list goes over Discord's limit.
// `headerLines` replaces the default "## {title}" heading.
function renderEntryMessages(entry, section, headerLines) {
  const header = headerLines || [`## ${entry.title}`];
  const tokens = [
    header.join("\n"),
    ...entry.items.map((item) => renderItemBlock(item, section)),
  ];
  return packTokens(tokens, "\n\n", DISCORD_MSG_LIMIT);
}

// Guild feat lists are homebrew entries with slug "guild-feats-<guild slug>".
// Their Discord heading shows the guild's HQ channel and summary.
async function loadGuildFeatHeaders(entries) {
  const result = await pool.query(
    "SELECT slug, name, summary, discord_hq_channel_id FROM guilds",
  );
  const guildsBySlug = new Map(result.rows.map((row) => [row.slug, row]));
  const headers = new Map();

  for (const entry of entries) {
    const guild = guildsBySlug.get(entry.slug.replace(/^guild-feats-/, ""));
    if (!guild) {
      continue;
    }

    const channel = guild.discord_hq_channel_id
      ? `<#${guild.discord_hq_channel_id}>`
      : "channel tbd";
    headers.set(
      entry.id,
      [`## ${guild.name}   |   ${channel}`, guild.summary].filter(Boolean),
    );
  }

  return headers;
}

async function buildDesiredMessages(post) {
  const desired = [];

  for (const section of post.sections) {
    const entries = await listHomebrewEntriesBySection(section);
    const headers = post.loadEntryHeaders
      ? await post.loadEntryHeaders(entries)
      : new Map();

    for (const entry of entries) {
      desired.push({
        entryId: entry.id,
        parts: renderEntryMessages(entry, section, headers.get(entry.id)),
      });
    }
  }

  return desired;
}

async function loadPostRow(postKey) {
  const result = await pool.query(
    "SELECT thread_id, entry_messages FROM homebrew_discord_posts WHERE post_key = $1",
    [postKey],
  );
  return result.rows[0] || null;
}

async function savePostRow(postKey, threadId, entryMessages) {
  await pool.query(
    `INSERT INTO homebrew_discord_posts (post_key, thread_id, entry_messages, updated_at)
     VALUES ($1, $2, $3::jsonb, NOW())
     ON CONFLICT (post_key)
     DO UPDATE SET thread_id = $2, entry_messages = $3::jsonb, updated_at = NOW()`,
    [postKey, threadId, JSON.stringify(entryMessages)],
  );
}

async function createPostThread(post) {
  let tag = null;
  if (post.tag) {
    const forum = await fetchChannel(homebrewForumChannelId);
    tag = (forum.available_tags || []).find(
      (candidate) => candidate.name.toLowerCase() === post.tag.toLowerCase(),
    );
  }

  const thread = await createForumThread(homebrewForumChannelId, {
    name: post.title,
    applied_tags: tag ? [tag.id] : [],
    message: {
      content: post.intro,
      allowed_mentions: { parse: [] },
    },
  });

  return thread.id;
}

// Returns a usable thread id: unarchives the existing post, or creates a new
// one if it has never been posted or was deleted on Discord.
async function ensurePostThread(post, existingThreadId) {
  if (existingThreadId) {
    try {
      await editChannel(existingThreadId, { archived: false });
      return { threadId: existingThreadId, created: false };
    } catch (error) {
      if (!isUnknownChannelError(error)) {
        throw error;
      }
    }
  }

  return { threadId: await createPostThread(post), created: true };
}

function canEditInPlace(stored, desired) {
  if (stored.length > desired.length) {
    return false;
  }

  return stored.every(
    (storedEntry, index) =>
      storedEntry.entryId === desired[index].entryId &&
      (storedEntry.messageIds || []).length === desired[index].parts.length,
  );
}

async function syncHomebrewForumPost(postKey, { repost = false } = {}) {
  const post = HOMEBREW_FORUM_POSTS.find((candidate) => candidate.key === postKey);
  if (!post) {
    throw new Error(`Unknown homebrew forum post: ${postKey}`);
  }

  if (!homebrewForumChannelId) {
    return { postKey, skipped: true };
  }

  const row = await loadPostRow(postKey);
  const { threadId, created } = await ensurePostThread(post, row?.thread_id);
  let stored = created ? [] : row?.entry_messages || [];
  const desired = await buildDesiredMessages(post);

  // Forum messages can't be reordered, so anything other than editing or
  // appending at the end means clearing the post and reposting in order.
  const fullRepost = repost || !canEditInPlace(stored, desired);
  if (fullRepost) {
    for (const storedEntry of stored) {
      for (const messageId of storedEntry.messageIds || []) {
        await deleteChannelMessage(threadId, messageId).catch(() => {});
      }
    }
    stored = [];
  }

  const entryMessages = [];
  for (let i = 0; i < desired.length; i++) {
    const { entryId, parts } = desired[i];
    const storedEntry = stored[i];

    // Skip Discord calls for subcategories whose text hasn't changed.
    const unchanged =
      storedEntry &&
      Array.isArray(storedEntry.contents) &&
      storedEntry.contents.length === parts.length &&
      storedEntry.contents.every((content, index) => content === parts[index]);

    const messageIds = unchanged
      ? storedEntry.messageIds
      : await syncMessageParts(threadId, storedEntry?.messageIds || [], parts);

    entryMessages.push({ entryId, messageIds, contents: parts });
  }

  await savePostRow(postKey, threadId, entryMessages);

  return {
    postKey,
    threadId,
    createdThread: created,
    reposted: fullRepost,
    messageCount: entryMessages.reduce(
      (total, entry) => total + entry.messageIds.length,
      0,
    ),
  };
}

// Syncs for the same post run one at a time so overlapping admin edits
// can't interleave their Discord edits.
const postChains = new Map();

function runExclusive(postKey, task) {
  const previous = postChains.get(postKey) || Promise.resolve();
  const next = previous.then(task, task);
  postChains.set(
    postKey,
    next.catch(() => {}),
  );
  return next;
}

async function syncHomebrewForumPosts({ postKey, repost = false } = {}) {
  const posts = postKey
    ? HOMEBREW_FORUM_POSTS.filter((post) => post.key === postKey)
    : HOMEBREW_FORUM_POSTS;

  if (posts.length === 0) {
    throw new Error(`Unknown homebrew forum post: ${postKey}`);
  }

  const results = [];
  for (const post of posts) {
    results.push(
      await runExclusive(post.key, () =>
        syncHomebrewForumPost(post.key, { repost }),
      ),
    );
  }
  return results;
}

const pendingTimers = new Map();

// Fire-and-forget sync after a homebrew edit. Debounced so a burst of admin
// edits results in a single pass over the post.
function queueHomebrewDiscordSync(section) {
  const post = findPostForSection(section);
  if (!post || !homebrewForumChannelId) {
    return;
  }

  clearTimeout(pendingTimers.get(post.key));
  pendingTimers.set(
    post.key,
    setTimeout(() => {
      pendingTimers.delete(post.key);
      runExclusive(post.key, () => syncHomebrewForumPost(post.key)).catch(
        (err) =>
          console.error(
            `Failed to sync homebrew "${post.key}" to Discord:`,
            err,
          ),
      );
    }, SYNC_DEBOUNCE_MS),
  );
}

module.exports = {
  HOMEBREW_FORUM_POSTS,
  queueHomebrewDiscordSync,
  renderEntryMessages,
  syncHomebrewForumPosts,
};
