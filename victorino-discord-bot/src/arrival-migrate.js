require('dotenv').config();

const {
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
} = require('discord.js');

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

function findTextChannel(guild, name) {
  const desired = canonicalName(name);
  return guild.channels.cache.find(
    channel => channel.type === ChannelType.GuildText && canonicalName(channel.name) === desired,
  );
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async () => {
  try {
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    await guild.channels.fetch();

    const arrival = findTextChannel(guild, 'arrival');
    const welcome = findTextChannel(guild, 'welcome');

    if (!arrival && welcome) {
      await welcome.setName('📌arrival', 'VICTORINO personalized arrival upgrade');
      console.log('Renamed welcome channel to 📌arrival.');
    } else if (arrival) {
      console.log('Arrival channel already present.');
    } else {
      console.log('No legacy welcome channel found; main setup will create arrival if needed.');
    }

    await client.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Arrival channel migration failed:', error);
    await client.destroy().catch(() => null);
    process.exit(1);
  }
});

client.login(process.env.DISCORD_TOKEN);
