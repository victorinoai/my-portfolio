require('dotenv').config();

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
} = require('discord.js');

const {
  roles: roleDefinitions,
  categories: categoryDefinitions,
  roleButtons,
} = require('./config');

for (const key of ['DISCORD_TOKEN', 'DISCORD_GUILD_ID']) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

function canonicalName(value = '') {
  return value
    .normalize('NFKC')
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function findRole(guild, desiredName) {
  const desired = canonicalName(desiredName);
  return guild.roles.cache.find(role => canonicalName(role.name) === desired);
}

function findChannel(guild, desiredName, type = null, parentId = undefined) {
  const desired = canonicalName(desiredName);
  return guild.channels.cache.find(channel => {
    if (type !== null && channel.type !== type) return false;
    if (parentId !== undefined && channel.parentId !== parentId) return false;
    return canonicalName(channel.name) === desired;
  });
}

async function syncNames(guild) {
  await guild.roles.fetch();
  await guild.channels.fetch();

  let changed = 0;

  for (const def of roleDefinitions) {
    const role = findRole(guild, def.name);
    if (role && role.name !== def.name) {
      await role.setName(def.name, 'VICTORINO clean emoji naming');
      changed += 1;
    }
  }

  for (const categoryDef of categoryDefinitions) {
    let category = findChannel(guild, categoryDef.name, ChannelType.GuildCategory);
    if (!category) continue;

    if (category.name !== categoryDef.name) {
      await category.setName(categoryDef.name, 'VICTORINO clean emoji naming');
      changed += 1;
    }

    for (const [desiredName, type] of categoryDef.channels) {
      const channelType = type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
      const channel = findChannel(guild, desiredName, channelType, category.id);
      if (channel && channel.name !== desiredName) {
        await channel.setName(desiredName, 'VICTORINO clean emoji naming');
        changed += 1;
      }
    }
  }

  await guild.channels.fetch();
  const chooseRole = findChannel(guild, 'choose-role', ChannelType.GuildText);
  if (chooseRole) {
    const messages = await chooseRole.messages.fetch({ limit: 50 }).catch(() => null);
    const panel = messages?.find(
      message => message.author.id === client.user.id &&
        message.embeds.some(embed => embed.footer?.text === 'VICTORINO_ROLE_PANEL'),
    );

    if (panel) {
      const row = new ActionRowBuilder();
      for (const button of roleButtons) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(button.customId)
            .setLabel(button.label)
            .setEmoji(button.emoji)
            .setStyle(ButtonStyle.Secondary),
        );
      }

      const embed = new EmbedBuilder()
        .setTitle('🎭 Choose your primary production role')
        .setDescription('Select the role that best matches what you currently do inside VICTORINO. This grants access to the internal team areas. Management roles are assigned separately by leadership.')
        .setFooter({ text: 'VICTORINO_ROLE_PANEL' });

      await panel.edit({ embeds: [embed], components: [row] });
    }
  }

  console.log(`Clean naming migration complete. Renamed ${changed} managed Discord items.`);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once(Events.ClientReady, async () => {
  try {
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    await syncNames(guild);
    await client.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Name migration failed:', error);
    await client.destroy().catch(() => null);
    process.exit(1);
  }
});

client.login(process.env.DISCORD_TOKEN);
