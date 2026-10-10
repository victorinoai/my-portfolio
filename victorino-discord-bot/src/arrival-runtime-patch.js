const fs = require('fs');
const path = require('path');

const root = __dirname;
const sourcePath = path.join(root, 'index-v3.js');
const targetPath = path.join(root, 'index-v4.js');
const configPath = path.join(root, 'config.js');

let config = fs.readFileSync(configPath, 'utf8');
config = config.replace(
  "['👋welcome', 'text', true, 'VICTORINO arrival and landing page. Start here when you join.']",
  "['📌arrival', 'text', true, 'Personalized VICTORINO arrival cards for every new member.']",
);
fs.writeFileSync(configPath, config);

let src = fs.readFileSync(sourcePath, 'utf8');

if (!src.includes("require('./welcome-card')")) {
  src = src.replace(
    "const levelStore = require('./level-store');",
    "const levelStore = require('./level-store');\nconst { buildWelcomeCard } = require('./welcome-card');",
  );
}

if (!src.includes("require('./animated-logo')")) {
  src = src.replace(
    "const { buildWelcomeCard } = require('./welcome-card');",
    "const { buildWelcomeCard } = require('./welcome-card');\nconst { getAnimatedLogo } = require('./animated-logo');",
  );
}

src = src.replace("byName('welcome')", "byName('arrival')");

const rolePanelCommand = `  new SlashCommandBuilder()\n    .setName('role-panel')\n    .setDescription('Repost the production role selection panel.')\n    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),\n`;

if (!src.includes(".setName('arrival-preview')")) {
  const previewCommand = rolePanelCommand + `  new SlashCommandBuilder()\n    .setName('arrival-preview')\n    .setDescription('Post a preview of your VICTORINO arrival card.')\n    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),\n`;
  if (!src.includes(rolePanelCommand)) throw new Error('role-panel command anchor not found');
  src = src.replace(rolePanelCommand, previewCommand);
}

const arrivalFunction = `async function sendArrival(member, stats) {
  const channel = findChannel(member.guild, 'arrival', ChannelType.GuildText)
    || findChannel(member.guild, 'welcome', ChannelType.GuildText);
  if (!channel) return;

  const milestone = milestoneForLevel(stats.level);
  const rules = findChannel(member.guild, 'rules', ChannelType.GuildText);
  const onboarding = findChannel(member.guild, 'onboarding', ChannelType.GuildText);
  const chooseRole = findChannel(member.guild, 'choose-role', ChannelType.GuildText);

  const row = new ActionRowBuilder();
  if (rules) {
    row.addComponents(
      new ButtonBuilder()
        .setLabel('Read the rules')
        .setEmoji('📌')
        .setStyle(ButtonStyle.Link)
        .setURL(channelUrl(member.guild, rules)),
    );
  }
  if (onboarding) {
    row.addComponents(
      new ButtonBuilder()
        .setLabel('Start onboarding')
        .setEmoji('🧭')
        .setStyle(ButtonStyle.Link)
        .setURL(channelUrl(member.guild, onboarding)),
    );
  }
  if (chooseRole) {
    row.addComponents(
      new ButtonBuilder()
        .setLabel('Choose your role')
        .setEmoji('🎭')
        .setStyle(ButtonStyle.Link)
        .setURL(channelUrl(member.guild, chooseRole)),
    );
  }

  const embed = new EmbedBuilder()
    .setTitle('Welcome to VICTORINO')
    .setDescription(
      \`Welcome <@\${member.id}> 👋\\n\\n\` +
      '**VICTORINO** is our internal AI creative agency workspace for production, training, collaboration, and client delivery.\\n\\n' +
      '**What you’ll find here:** creative briefs, scripts, storyboards, AI generation, editing, quality control, team training, and live project spaces.',
    )
    .addFields(
      {
        name: 'Starting status',
        value: \`\${milestone.emoji} **Level \${stats.level} — \${milestone.label}**\`,
        inline: true,
      },
      {
        name: 'Next step',
        value: 'Read the rules, complete onboarding, then choose your production role.',
      },
    )
    .setThumbnail('attachment://victorino-emblem.gif');

  const payload = {
    content: \`Welcome <@\${member.id}> 👋\`,
    embeds: [embed],
    components: row.components.length ? [row] : [],
    allowedMentions: { users: [member.id] },
    files: [{ attachment: getAnimatedLogo(), name: 'victorino-emblem.gif' }],
  };

  try {
    const card = await buildWelcomeCard(member, \`LEVEL \${stats.level} | \${milestone.label}\`);
    embed.setImage('attachment://victorino-welcome.png');
    payload.files.push({ attachment: card, name: 'victorino-welcome.png' });
  } catch (error) {
    console.error('welcome-card generation failed:', error);
  }

  await channel.send(payload).catch(error => console.error('arrival send failed:', error));
}

async function announceLevelUp`;

const arrivalRegex = /async function sendArrival\(member, stats\) \{[\s\S]*?\n\}\n\nasync function announceLevelUp/;
if (!arrivalRegex.test(src)) throw new Error('sendArrival function anchor not found');
src = src.replace(arrivalRegex, arrivalFunction);

const levelHandler = `    if (interaction.commandName === 'level') {\n      await handleLevel(interaction);\n      return;\n    }\n`;

if (!src.includes("interaction.commandName === 'arrival-preview'")) {
  if (!src.includes(levelHandler)) throw new Error('level handler anchor not found');
  const previewHandler = `    if (interaction.commandName === 'arrival-preview') {\n      await interaction.deferReply({ ephemeral: true });\n      const member = await interaction.guild.members.fetch(interaction.user.id);\n      const stats = levelStore.getUser(member.id, profileFor(member));\n      await sendArrival(member, stats);\n      await interaction.editReply('✅ Arrival preview posted in 📌arrival.');\n      return;\n    }\n\n` + levelHandler;
  src = src.replace(levelHandler, previewHandler);
}

fs.writeFileSync(targetPath, src);
console.log('Arrival runtime patch complete. index-v4.js generated with animated emblem thumbnail.');
