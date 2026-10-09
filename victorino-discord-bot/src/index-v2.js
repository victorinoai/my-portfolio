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
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder,
} = require('discord.js');

const {
  BRAND,
  roles: roleDefinitions,
  categories: categoryDefinitions,
  roleButtons,
  channelType,
} = require('./config');

const requiredEnv = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'DISCORD_GUILD_ID'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const commands = [
  new SlashCommandBuilder()
    .setName('setup-victorino')
    .setDescription('Create or synchronize the VICTORINO server structure.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName('role-panel')
    .setDescription('Repost the production role selection panel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  new SlashCommandBuilder()
    .setName('project-create')
    .setDescription('Create a private VICTORINO client project channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption(o => o.setName('name').setDescription('Project name').setRequired(true))
    .addStringOption(o => o.setName('client').setDescription('Client or brand name').setRequired(true))
    .addUserOption(o => o.setName('assignee_1').setDescription('Optional first team member'))
    .addUserOption(o => o.setName('assignee_2').setDescription('Optional second team member'))
    .addUserOption(o => o.setName('client_member').setDescription('Optional Discord client member')),
  new SlashCommandBuilder()
    .setName('project-add')
    .setDescription('Give a member access to a project channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(o => o.setName('channel').setDescription('Project channel').setRequired(true).addChannelTypes(ChannelType.GuildText))
    .addUserOption(o => o.setName('member').setDescription('Member to add').setRequired(true)),
  new SlashCommandBuilder()
    .setName('project-remove')
    .setDescription('Remove a member from a project channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(o => o.setName('channel').setDescription('Project channel').setRequired(true).addChannelTypes(ChannelType.GuildText))
    .addUserOption(o => o.setName('member').setDescription('Member to remove').setRequired(true)),
  new SlashCommandBuilder()
    .setName('project-archive')
    .setDescription('Archive a completed project channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(o => o.setName('channel').setDescription('Project channel').setRequired(true).addChannelTypes(ChannelType.GuildText)),
].map(command => command.toJSON());

function canonicalName(value = '') {
  return value
    .normalize('NFKC')
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 70) || 'project';
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

function roleMap(guild) {
  const map = {};
  for (const def of roleDefinitions) {
    const found = findRole(guild, def.name);
    if (found) map[def.key] = found;
  }
  return map;
}

function getLeadershipRoles(map) {
  return [map.founder, map.cofounder, map.executive].filter(Boolean);
}

function getManagementRoles(map) {
  return [map.founder, map.cofounder, map.executive, map.projectManager].filter(Boolean);
}

function permissionOverwrites(guild, access, readonly, map) {
  const everyone = guild.roles.everyone;
  const leadership = getLeadershipRoles(map);
  const management = getManagementRoles(map);
  const overwrites = [];

  const addRole = (role, allow = [], deny = []) => {
    if (!role) return;
    overwrites.push({ id: role.id, allow, deny });
  };

  const view = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory];
  const talk = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.Connect,
    PermissionFlagsBits.Speak,
  ];

  if (access === 'everyone') {
    addRole(everyone, view, readonly ? [PermissionFlagsBits.SendMessages] : []);
    for (const role of leadership) addRole(role, talk);
    return overwrites;
  }

  addRole(everyone, [], [PermissionFlagsBits.ViewChannel]);

  if (access === 'team') {
    addRole(map.team, readonly ? view : talk, readonly ? [PermissionFlagsBits.SendMessages] : []);
    for (const role of leadership) addRole(role, talk);
  } else if (access === 'management') {
    for (const role of management) addRole(role, talk);
  } else if (access === 'leadership') {
    for (const role of leadership) addRole(role, talk);
  }

  return overwrites;
}

async function ensureRoles(guild) {
  const changed = [];

  for (const def of roleDefinitions.slice().reverse()) {
    let role = findRole(guild, def.name);
    if (!role) {
      role = await guild.roles.create({
        name: def.name,
        permissions: def.permissions,
        hoist: def.hoist,
        mentionable: def.mentionable,
        reason: `${BRAND} automated server setup`,
      });
      changed.push(`created role ${def.name}`);
    } else {
      const oldName = role.name;
      await role.edit({
        name: def.name,
        permissions: def.permissions,
        hoist: def.hoist,
        mentionable: def.mentionable,
        reason: `${BRAND} role synchronization`,
      });
      if (oldName !== def.name) changed.push(`renamed ${oldName} → ${def.name}`);
    }
  }

  return changed;
}

async function ensureCategoriesAndChannels(guild) {
  const map = roleMap(guild);
  const changed = [];

  for (const categoryDef of categoryDefinitions) {
    let category = findChannel(guild, categoryDef.name, ChannelType.GuildCategory);

    if (!category) {
      category = await guild.channels.create({
        name: categoryDef.name,
        type: ChannelType.GuildCategory,
        permissionOverwrites: permissionOverwrites(guild, categoryDef.access, false, map),
        reason: `${BRAND} automated server setup`,
      });
      changed.push(`created ${categoryDef.name}`);
    } else {
      if (category.name !== categoryDef.name) {
        const oldName = category.name;
        await category.setName(categoryDef.name, `${BRAND} emoji synchronization`);
        changed.push(`renamed ${oldName} → ${categoryDef.name}`);
      }
      await category.permissionOverwrites.set(permissionOverwrites(guild, categoryDef.access, false, map));
    }

    for (const [name, type, readonly, topic] of categoryDef.channels) {
      const desiredType = channelType(type);
      let channel = findChannel(guild, name, desiredType, category.id);

      if (!channel) {
        channel = await guild.channels.create({
          name,
          type: desiredType,
          parent: category.id,
          topic: desiredType === ChannelType.GuildText ? topic : undefined,
          permissionOverwrites: permissionOverwrites(guild, categoryDef.access, readonly, map),
          reason: `${BRAND} automated server setup`,
        });
        changed.push(`created ${categoryDef.name}/${name}`);
      } else {
        if (channel.name !== name) {
          const oldName = channel.name;
          await channel.setName(name, `${BRAND} emoji synchronization`);
          changed.push(`renamed ${oldName} → ${name}`);
        }
        if (channel.parentId !== category.id) {
          await channel.setParent(category.id, { lockPermissions: false });
        }
        if (desiredType === ChannelType.GuildText && channel.topic !== topic) {
          await channel.setTopic(topic || null);
        }
        await channel.permissionOverwrites.set(permissionOverwrites(guild, categoryDef.access, readonly, map));
      }
    }
  }

  return changed;
}

async function upsertBotMessage(channel, marker, payload) {
  if (!channel || channel.type !== ChannelType.GuildText) return null;
  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  const existing = messages?.find(
    message => message.author.id === client.user.id && (
      message.embeds.some(embed => embed.footer?.text === marker) ||
      message.embeds.length > 0
    ),
  );

  if (existing) {
    await existing.edit(payload);
    return existing;
  }

  return channel.send(payload);
}

function infoEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description);
}

function buildRolePanel() {
  const row = new ActionRowBuilder();
  for (const button of roleButtons) {
    const component = new ButtonBuilder()
      .setCustomId(button.customId)
      .setLabel(button.label)
      .setStyle(ButtonStyle.Secondary);
    if (button.emoji) component.setEmoji(button.emoji);
    row.addComponents(component);
  }

  const embed = infoEmbed(
    '🎭 Choose your primary production role',
    'Select the role that best matches what you currently do inside VICTORINO. This grants access to the internal team areas. Management roles are assigned separately by leadership.',
    'VICTORINO_ROLE_PANEL',
  );

  return { embeds: [embed], components: [row] };
}

async function seedCoreMessages(guild) {
  const byName = name => findChannel(guild, name, ChannelType.GuildText);

  await upsertBotMessage(byName('welcome'), 'VICTORINO_WELCOME', {
    embeds: [infoEmbed(
      '👋 Welcome to VICTORINO',
      '**Internal Creative Operations**\n\nWelcome to the VICTORINO team server. This workspace is for production, training, project coordination, quality control, and company operations.\n\nStart with **📜 rules**, continue to **🧭 onboarding**, then choose your production role in **🎭 choose-role**.',
      'VICTORINO_WELCOME',
    )],
  });

  await upsertBotMessage(byName('rules'), 'VICTORINO_RULES', {
    embeds: [infoEmbed(
      '📜 Internal Standards',
      [
        '**1. Client work is confidential.** Do not repost, reuse, sell, or share unreleased client assets.',
        '**2. Keep credentials private.** Never post passwords, API keys, payment details, or private access links in public channels.',
        '**3. Keep work inside the correct project channel.** This keeps briefs, revisions, and decisions traceable.',
        '**4. Respect deadlines and flag blockers early.** Silence is not a project update.',
        '**5. AI output is not automatically final output.** Every asset must pass human review and VICTORINO quality control.',
        '**6. Do not contact clients unless assigned.** Client communication must stay coordinated through leadership or the assigned project owner.',
        '**7. Protect intellectual property.** Client files, internal prompts, SOPs, templates, and workflows stay inside VICTORINO unless approved.',
        '**8. Be professional.** Feedback should be direct, useful, and focused on improving the work.',
      ].join('\n\n'),
      'VICTORINO_RULES',
    )],
  });

  await upsertBotMessage(byName('onboarding'), 'VICTORINO_ONBOARDING', {
    embeds: [infoEmbed(
      '🧭 New Member Onboarding',
      [
        '**Step 1 — Read the rules.**',
        '**Step 2 — Choose your production role in the role-selection channel.**',
        '**Step 3 — Introduce yourself in general once team access unlocks.**',
        '**Step 4 — Review the training hub, SOPs, and tool stack.**',
        '**Step 5 — Trainees complete assigned practice tasks before receiving live client work.**',
        '**Step 6 — Use project channels only for active client work.**',
      ].join('\n\n'),
      'VICTORINO_ONBOARDING',
    )],
  });

  await upsertBotMessage(byName('choose-role'), 'VICTORINO_ROLE_PANEL', buildRolePanel());

  await upsertBotMessage(byName('announcements'), 'VICTORINO_ANNOUNCEMENTS', {
    embeds: [infoEmbed(
      '📣 Company Announcements',
      'Leadership will use this channel for official team notices, process changes, important deadlines, and company-wide updates.',
      'VICTORINO_ANNOUNCEMENTS',
    )],
  });

  await upsertBotMessage(byName('training-hub'), 'VICTORINO_TRAINING', {
    embeds: [infoEmbed(
      '🎓 Training Hub',
      'VICTORINO training is built around real production standards: research → brief → hooks/script → storyboard → asset generation → edit → QA → delivery.\n\nTrainees should follow the SOPs before working on live client deliverables.',
      'VICTORINO_TRAINING',
    )],
  });

  await upsertBotMessage(byName('quality-control'), 'VICTORINO_QC', {
    embeds: [infoEmbed(
      '✅ Pre-Delivery Quality Control',
      'Before delivery, verify: correct client/product, accurate text and spelling, approved script, clean pacing, captions, audio, aspect ratio, brand consistency, no obvious AI artifacts, no unlicensed assets, correct export settings, and final leadership approval when required.',
      'VICTORINO_QC',
    )],
  });
}

async function assignLeadership(guild) {
  const map = roleMap(guild);
  const assignments = [
    [process.env.FOUNDER_USER_ID, map.founder],
    [process.env.COFOUNDER_USER_ID, map.cofounder],
  ];

  for (const [userId, role] of assignments) {
    if (!userId || !role) continue;
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) continue;
    await member.roles.add([role, map.team].filter(Boolean), `${BRAND} leadership assignment`);
    if (map.pending && member.roles.cache.has(map.pending.id)) {
      await member.roles.remove(map.pending, `${BRAND} leadership assignment`);
    }
  }
}

async function logTo(guild, channelName, text) {
  const channel = findChannel(guild, channelName, ChannelType.GuildText);
  if (channel) await channel.send(text).catch(() => null);
}

async function provisionGuild(guild) {
  await guild.roles.fetch();
  const roleChanges = await ensureRoles(guild);
  await guild.roles.fetch();
  await guild.channels.fetch();
  const channelChanges = await ensureCategoriesAndChannels(guild);
  await guild.channels.fetch();
  await seedCoreMessages(guild);
  await assignLeadership(guild);

  await logTo(
    guild,
    'bot-logs',
    `✅ VICTORINO sync complete. Role changes: ${roleChanges.length}. Channel/category changes: ${channelChanges.length}.`,
  );

  return { roleChanges, channelChanges };
}

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
    { body: commands },
  );
}

async function handleRoleButton(interaction) {
  const def = roleButtons.find(button => button.customId === interaction.customId);
  if (!def) return;

  const map = roleMap(interaction.guild);
  const chosenRole = map[def.roleKey];
  if (!chosenRole || !map.team) {
    await interaction.reply({ content: 'The role system is not fully configured yet. Ask leadership to run /setup-victorino.', ephemeral: true });
    return;
  }

  const oldRoles = roleButtons
    .map(button => map[button.roleKey])
    .filter(role => role && interaction.member.roles.cache.has(role.id) && role.id !== chosenRole.id);

  if (oldRoles.length) await interaction.member.roles.remove(oldRoles, `${BRAND} role selection`);
  await interaction.member.roles.add([map.team, chosenRole], `${BRAND} role selection`);
  if (map.pending && interaction.member.roles.cache.has(map.pending.id)) {
    await interaction.member.roles.remove(map.pending, `${BRAND} onboarding complete`);
  }

  await logTo(interaction.guild, 'member-logs', `🎭 <@${interaction.user.id}> selected **${chosenRole.name}**.`);
  await interaction.reply({ content: `✅ Role assigned: **${chosenRole.name}**. Team access is now enabled.`, ephemeral: true });
}

function projectOverwrites(guild, members = []) {
  const map = roleMap(guild);
  const projectPerms = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.EmbedLinks,
  ];

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
  ];

  for (const role of getManagementRoles(map)) {
    overwrites.push({ id: role.id, allow: projectPerms });
  }

  for (const member of members.filter(Boolean)) {
    overwrites.push({ id: member.id, allow: projectPerms });
  }

  return overwrites;
}

async function handleProjectCreate(interaction) {
  const name = interaction.options.getString('name', true);
  const clientName = interaction.options.getString('client', true);
  const assignee1 = interaction.options.getMember('assignee_1');
  const assignee2 = interaction.options.getMember('assignee_2');
  const clientMember = interaction.options.getMember('client_member');

  const category = findChannel(interaction.guild, '05 | CLIENT PROJECTS', ChannelType.GuildCategory);
  if (!category) {
    await interaction.reply({ content: 'Run /setup-victorino first so the project category exists.', ephemeral: true });
    return;
  }

  const base = `📁・proj-${slugify(clientName)}-${slugify(name)}`.slice(0, 96);
  let channelName = base;
  let counter = 2;
  while (interaction.guild.channels.cache.some(c => c.name === channelName)) {
    channelName = `${base.slice(0, 90)}-${counter++}`;
  }

  const members = [assignee1, assignee2, clientMember].filter(Boolean);
  const channel = await interaction.guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: `[VICTORINO PROJECT] Client: ${clientName} | Project: ${name} | Status: ACTIVE`,
    permissionOverwrites: projectOverwrites(interaction.guild, members),
    reason: `${BRAND} project created by ${interaction.user.tag}`,
  });

  const kickoff = new EmbedBuilder()
    .setTitle(`📁 ${clientName} — ${name}`)
    .setDescription('Private VICTORINO project workspace.')
    .addFields(
      { name: 'Status', value: '🟢 ACTIVE', inline: true },
      { name: 'Workflow', value: '📋 Brief → ✍️ Script → 🧩 Storyboard → 🤖 Assets → 🎬 Edit → ✅ QC → 📦 Delivery' },
      { name: 'Project discipline', value: 'Keep decisions, revisions, links, and delivery notes in this channel so the project remains traceable.' },
    );

  const message = await channel.send({ embeds: [kickoff] });
  await message.pin().catch(() => null);

  const index = findChannel(interaction.guild, 'project-index', ChannelType.GuildText);
  if (index) await index.send(`📁 ${channel} — **${clientName}** / ${name}`);

  await logTo(interaction.guild, 'project-logs', `📁 ${channel} created by <@${interaction.user.id}> for **${clientName}**.`);
  await interaction.reply({ content: `✅ Project created: ${channel}`, ephemeral: true });
}

async function handleProjectAccess(interaction, action) {
  const channel = interaction.options.getChannel('channel', true);
  const member = interaction.options.getMember('member');

  if (!channel.topic?.startsWith('[VICTORINO PROJECT]')) {
    await interaction.reply({ content: 'That channel is not marked as a VICTORINO project channel.', ephemeral: true });
    return;
  }

  if (action === 'add') {
    await channel.permissionOverwrites.edit(member.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      AttachFiles: true,
      EmbedLinks: true,
    });
    await interaction.reply({ content: `✅ ${member} now has access to ${channel}.`, ephemeral: true });
  } else {
    await channel.permissionOverwrites.delete(member.id).catch(() => null);
    await interaction.reply({ content: `✅ ${member}'s direct project access was removed from ${channel}.`, ephemeral: true });
  }
}

async function handleProjectArchive(interaction) {
  const channel = interaction.options.getChannel('channel', true);
  if (!channel.topic?.startsWith('[VICTORINO PROJECT]')) {
    await interaction.reply({ content: 'That channel is not marked as a VICTORINO project channel.', ephemeral: true });
    return;
  }

  const archive = findChannel(interaction.guild, '09 | ARCHIVE', ChannelType.GuildCategory);
  if (!archive) {
    await interaction.reply({ content: 'Run /setup-victorino first so the archive category exists.', ephemeral: true });
    return;
  }

  await channel.setParent(archive.id, { lockPermissions: false });
  const cleanName = channel.name.replace(/^📁・/, '').replace(/^🗄️・/, '').replace(/^archived-/, '');
  await channel.setName(`🗄️・archived-${cleanName}`.slice(0, 100));
  if (channel.topic.includes('Status: ACTIVE')) {
    await channel.setTopic(channel.topic.replace('Status: ACTIVE', 'Status: ARCHIVED'));
  }

  const map = roleMap(interaction.guild);
  const protectedRoleIds = new Set(getLeadershipRoles(map).map(role => role.id));
  for (const overwrite of channel.permissionOverwrites.cache.values()) {
    if (protectedRoleIds.has(overwrite.id)) continue;
    await channel.permissionOverwrites.edit(overwrite.id, { SendMessages: false }).catch(() => null);
  }

  await logTo(interaction.guild, 'project-logs', `🗄️ ${channel} archived by <@${interaction.user.id}>.`);
  await interaction.reply({ content: `🗄️ Archived ${channel}.`, ephemeral: true });
}

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);
  try {
    await registerCommands();
    console.log('Guild slash commands registered.');

    if (String(process.env.AUTO_SETUP).toLowerCase() === 'true') {
      const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
      await guild.roles.fetch();
      await guild.channels.fetch();
      await provisionGuild(guild);
      console.log('AUTO_SETUP completed.');
    }
  } catch (error) {
    console.error('Startup error:', error);
  }
});

client.on(Events.GuildMemberAdd, async member => {
  if (member.guild.id !== process.env.DISCORD_GUILD_ID) return;
  const map = roleMap(member.guild);

  try {
    if (member.id === process.env.FOUNDER_USER_ID && map.founder) {
      await member.roles.add([map.founder, map.team].filter(Boolean));
    } else if (member.id === process.env.COFOUNDER_USER_ID && map.cofounder) {
      await member.roles.add([map.cofounder, map.team].filter(Boolean));
    } else if (map.pending) {
      await member.roles.add(map.pending, `${BRAND} new member onboarding`);
    }

    await logTo(member.guild, 'member-logs', `👋 <@${member.id}> joined the server.`);
  } catch (error) {
    console.error('guildMemberAdd error:', error);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isButton() && interaction.customId.startsWith('role:')) {
      await handleRoleButton(interaction);
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'setup-victorino') {
      await interaction.deferReply({ ephemeral: true });
      const result = await provisionGuild(interaction.guild);
      await interaction.editReply(
        `✅ VICTORINO synchronized. ${result.roleChanges.length} role changes and ${result.channelChanges.length} channel/category changes applied without duplicating managed items.`,
      );
      return;
    }

    if (interaction.commandName === 'role-panel') {
      const channel = findChannel(interaction.guild, 'choose-role', ChannelType.GuildText);
      if (!channel) {
        await interaction.reply({ content: 'Run /setup-victorino first.', ephemeral: true });
        return;
      }
      await upsertBotMessage(channel, 'VICTORINO_ROLE_PANEL', buildRolePanel());
      await interaction.reply({ content: '✅ Role panel synchronized.', ephemeral: true });
      return;
    }

    if (interaction.commandName === 'project-create') {
      await handleProjectCreate(interaction);
      return;
    }

    if (interaction.commandName === 'project-add') {
      await handleProjectAccess(interaction, 'add');
      return;
    }

    if (interaction.commandName === 'project-remove') {
      await handleProjectAccess(interaction, 'remove');
      return;
    }

    if (interaction.commandName === 'project-archive') {
      await handleProjectArchive(interaction);
    }
  } catch (error) {
    console.error('interaction error:', error);
    const message = 'Something failed while running that command. Check the bot logs and permissions.';
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: message }).catch(() => null);
    } else {
      await interaction.reply({ content: message, ephemeral: true }).catch(() => null);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
