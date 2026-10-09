require('dotenv').config();

const { Client, GatewayIntentBits, ChannelType, Events } = require('discord.js');

const requiredEnv = ['DISCORD_TOKEN', 'DISCORD_GUILD_ID'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, async () => {
  try {
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    await guild.channels.fetch();

    let cleaned = 0;

    for (const channel of guild.channels.cache.values()) {
      if (channel.type !== ChannelType.GuildText) continue;

      const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
      if (!messages) continue;

      for (const message of messages.values()) {
        if (message.author.id !== client.user.id || !message.embeds.length) continue;

        let changed = false;
        const embeds = message.embeds.map(embed => {
          const data = embed.toJSON();
          if (data.footer?.text?.startsWith('VICTORINO_')) {
            delete data.footer;
            changed = true;
          }
          return data;
        });

        if (changed) {
          await message.edit({ embeds }).catch(error => {
            console.error(`Could not clean footer in #${channel.name}:`, error.message);
          });
          cleaned += 1;
        }
      }
    }

    console.log(`Discord footer cleanup complete. Cleaned ${cleaned} message(s).`);
  } catch (error) {
    console.error('Discord footer cleanup failed:', error);
    process.exitCode = 1;
  } finally {
    client.destroy();
  }
});

client.login(process.env.DISCORD_TOKEN);
