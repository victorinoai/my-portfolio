require('dotenv').config();

const fs = require('fs');
const {
  ChannelType,
  Client,
  GatewayIntentBits,
} = require('discord.js');

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;
const TARGET_NAME = 'VICTO HQ';
const MARKER_PATH = '/data/victo-hq-brand-migrated-v1';

if (!token || !guildId) {
  console.error('VICTO HQ brand migration skipped: missing Discord credentials.');
  process.exit(1);
}

if (fs.existsSync(MARKER_PATH)) {
  console.log('VICTO HQ brand migration already completed.');
  process.exit(0);
}

function rebrandText(value) {
  return String(value)
    .replaceAll('VICTORINO HQ', TARGET_NAME)
    .replaceAll('VICTORINO', TARGET_NAME);
}

function deepRebrand(value) {
  if (typeof value === 'string') return rebrandText(value);
  if (Array.isArray(value)) return value.map(deepRebrand);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, deepRebrand(entry)]));
  }
  return value;
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once('ready', async () => {
  try {
    const guild = await client.guilds.fetch(guildId);
    await guild.fetch();

    if (guild.name !== TARGET_NAME) {
      await guild.setName(TARGET_NAME, 'VICTORINO rebrand to VICTO HQ');
      console.log(`Guild renamed to ${TARGET_NAME}.`);
    }

    if (guild.description && guild.description.includes('VICTORINO')) {
      await guild.edit({ description: rebrandText(guild.description) }, 'VICTORINO rebrand to VICTO HQ');
    }

    const me = await guild.members.fetchMe().catch(() => null);
    if (me && me.manageable && me.nickname !== TARGET_NAME) {
      await me.setNickname(TARGET_NAME, 'VICTORINO rebrand to VICTO HQ').catch(() => null);
    }

    await guild.channels.fetch();

    let renamedChannels = 0;
    let updatedTopics = 0;
    let updatedMessages = 0;

    for (const channel of guild.channels.cache.values()) {
      if (channel.name && channel.name.includes('VICTORINO')) {
        const nextName = rebrandText(channel.name);
        if (nextName !== channel.name) {
          await channel.setName(nextName, 'VICTORINO rebrand to VICTO HQ').catch(() => null);
          renamedChannels += 1;
        }
      }

      if (channel.type === ChannelType.GuildText && channel.topic?.includes('VICTORINO')) {
        await channel.setTopic(rebrandText(channel.topic)).catch(() => null);
        updatedTopics += 1;
      }

      if (channel.type !== ChannelType.GuildText || !channel.messages) continue;

      const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
      if (!messages) continue;

      for (const message of messages.values()) {
        if (message.author.id !== client.user.id) continue;

        const oldContent = message.content || '';
        const oldEmbeds = message.embeds.map(embed => embed.toJSON());
        const newContent = rebrandText(oldContent);
        const newEmbeds = deepRebrand(oldEmbeds);

        const changed = newContent !== oldContent || JSON.stringify(newEmbeds) !== JSON.stringify(oldEmbeds);
        if (!changed) continue;

        await message.edit({ content: newContent, embeds: newEmbeds }).catch(() => null);
        updatedMessages += 1;
      }
    }

    fs.mkdirSync('/data', { recursive: true });
    fs.writeFileSync(MARKER_PATH, JSON.stringify({
      completedAt: new Date().toISOString(),
      guildId,
      name: TARGET_NAME,
      renamedChannels,
      updatedTopics,
      updatedMessages,
    }, null, 2));

    console.log(`VICTO HQ migration complete. Channels renamed: ${renamedChannels}. Topics updated: ${updatedTopics}. Bot messages updated: ${updatedMessages}.`);
    client.destroy();
    process.exit(0);
  } catch (error) {
    console.error('VICTO HQ brand migration failed:', error);
    client.destroy();
    process.exit(1);
  }
});

client.login(token);
