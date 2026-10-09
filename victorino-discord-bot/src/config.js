const { PermissionFlagsBits, ChannelType } = require('discord.js');

const BRAND = 'VICTORINO';

const ROLE_NAMES = {
  founder: '👑 FOUNDER',
  cofounder: '💎 CO-FOUNDER',
  executive: '⚜️ EXECUTIVE',
  projectManager: '📋 PROJECT MANAGER',
  team: '✦ TEAM',
  aiVideo: '🤖 AI VIDEO SPECIALIST',
  videoEditor: '🎬 VIDEO EDITOR',
  scriptwriter: '✍️ SCRIPTWRITER',
  designer: '🎨 DESIGNER',
  trainee: '🌱 TRAINEE',
  client: '🤝 CLIENT',
  pending: '⏳ PENDING',
};

const roles = [
  {
    key: 'founder',
    name: ROLE_NAMES.founder,
    permissions: [PermissionFlagsBits.Administrator],
    hoist: true,
    mentionable: false,
  },
  {
    key: 'cofounder',
    name: ROLE_NAMES.cofounder,
    permissions: [PermissionFlagsBits.Administrator],
    hoist: true,
    mentionable: false,
  },
  {
    key: 'executive',
    name: ROLE_NAMES.executive,
    permissions: [
      PermissionFlagsBits.ViewAuditLog,
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.ManageThreads,
    ],
    hoist: true,
    mentionable: false,
  },
  {
    key: 'projectManager',
    name: ROLE_NAMES.projectManager,
    permissions: [
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.ManageThreads,
      PermissionFlagsBits.CreatePublicThreads,
      PermissionFlagsBits.CreatePrivateThreads,
    ],
    hoist: true,
    mentionable: false,
  },
  { key: 'team', name: ROLE_NAMES.team, permissions: [], hoist: false, mentionable: false },
  { key: 'aiVideo', name: ROLE_NAMES.aiVideo, permissions: [], hoist: false, mentionable: true },
  { key: 'videoEditor', name: ROLE_NAMES.videoEditor, permissions: [], hoist: false, mentionable: true },
  { key: 'scriptwriter', name: ROLE_NAMES.scriptwriter, permissions: [], hoist: false, mentionable: true },
  { key: 'designer', name: ROLE_NAMES.designer, permissions: [], hoist: false, mentionable: true },
  { key: 'trainee', name: ROLE_NAMES.trainee, permissions: [], hoist: false, mentionable: true },
  { key: 'client', name: ROLE_NAMES.client, permissions: [], hoist: false, mentionable: false },
  { key: 'pending', name: ROLE_NAMES.pending, permissions: [], hoist: false, mentionable: false },
];

const categories = [
  {
    name: '👋 00 | START HERE',
    access: 'everyone',
    channels: [
      ['👋welcome', 'text', true, 'Welcome to VICTORINO. Start here.'],
      ['📜rules', 'text', true, 'Internal standards, confidentiality, and team rules.'],
      ['🧭onboarding', 'text', true, 'New member onboarding steps.'],
      ['🎭choose-role', 'text', true, 'Choose your primary production role.'],
      ['📣announcements', 'text', true, 'Official VICTORINO announcements.'],
    ],
  },
  {
    name: '🏢 01 | VICTORINO HQ',
    access: 'team',
    channels: [
      ['💬general', 'text', false, 'Day-to-day internal team communication.'],
      ['📅daily-updates', 'text', false, 'Daily priorities, blockers, and delivery updates.'],
      ['🏆wins', 'text', false, 'Client wins, milestones, finished work, and team shout-outs.'],
      ['🔊 Team Room', 'voice', false, null],
      ['🎙️ Meeting Room', 'voice', false, null],
    ],
  },
  {
    name: '👑 02 | LEADERSHIP',
    access: 'leadership',
    channels: [
      ['👑founders', 'text', false, 'Founder and leadership decisions.'],
      ['🧠management', 'text', false, 'Operations, staffing, priorities, and project oversight.'],
      ['💳finance-admin', 'text', false, 'Internal finance and administrative coordination.'],
      ['🔎hiring', 'text', false, 'Recruitment, interviews, and contractor discussions.'],
      ['🔒 Leadership Room', 'voice', false, null],
    ],
  },
  {
    name: '🤝 03 | SALES & CLIENTS',
    access: 'management',
    channels: [
      ['🎯leads', 'text', false, 'Qualified leads and prospect notes.'],
      ['📝proposals', 'text', false, 'Quotes, proposals, scopes, and deal notes.'],
      ['🤝client-updates', 'text', false, 'High-level client account updates and risks.'],
    ],
  },
  {
    name: '🎬 04 | PRODUCTION',
    access: 'team',
    channels: [
      ['📋creative-briefs', 'text', false, 'Approved briefs and creative direction.'],
      ['✍️script-lab', 'text', false, 'Hooks, scripts, VSL copy, and messaging work.'],
      ['🧩storyboards', 'text', false, 'Shot plans, scene flow, and storyboard reviews.'],
      ['🤖ai-generation', 'text', false, 'Image, video, voice, and generative production.'],
      ['🎞️editing-room', 'text', false, 'Edit passes, pacing, captions, sound, and finishing.'],
      ['✅quality-control', 'text', false, 'Final QA before anything reaches the client.'],
      ['🗂️asset-library', 'text', false, 'Links to approved brand assets, templates, and shared resources.'],
      ['🎧 Editing Room', 'voice', false, null],
    ],
  },
  {
    name: '📁 05 | CLIENT PROJECTS',
    access: 'management',
    channels: [
      ['🗂️project-index', 'text', true, 'Index of active project channels. Use /project-create to open a project.'],
    ],
  },
  {
    name: '🎓 06 | TRAINING',
    access: 'team',
    channels: [
      ['🎓training-hub', 'text', true, 'Start here for internal training.'],
      ['📚sops', 'text', true, 'Standard operating procedures and production standards.'],
      ['🧠prompt-library', 'text', false, 'Approved prompt patterns and reusable AI workflows.'],
      ['🛠️tool-stack', 'text', true, 'Approved tools and how the team uses them.'],
      ['🔗resources', 'text', false, 'References, tutorials, and useful links.'],
      ['💡feedback', 'text', false, 'Constructive production feedback and coaching.'],
    ],
  },
  {
    name: '✨ 07 | CULTURE',
    access: 'team',
    channels: [
      ['🎞️showcase', 'text', false, 'Share finished work and strong creative references.'],
      ['✨inspiration', 'text', false, 'Ads, visuals, editing references, and creative inspiration.'],
      ['☕random', 'text', false, 'Off-topic team chat.'],
      ['🎙️ Lounge', 'voice', false, null],
    ],
  },
  {
    name: '📊 08 | LOGS',
    access: 'leadership',
    channels: [
      ['🤖bot-logs', 'text', true, 'Automation and bot activity.'],
      ['👥member-logs', 'text', true, 'Member joins and role changes.'],
      ['📁project-logs', 'text', true, 'Project channel creation and archive logs.'],
    ],
  },
  {
    name: '🗄️ 09 | ARCHIVE',
    access: 'leadership',
    channels: [],
  },
];

const roleButtons = [
  { customId: 'role:aiVideo', label: 'AI Video Specialist', emoji: '🤖', roleKey: 'aiVideo' },
  { customId: 'role:videoEditor', label: 'Video Editor', emoji: '🎬', roleKey: 'videoEditor' },
  { customId: 'role:scriptwriter', label: 'Scriptwriter', emoji: '✍️', roleKey: 'scriptwriter' },
  { customId: 'role:designer', label: 'Designer', emoji: '🎨', roleKey: 'designer' },
  { customId: 'role:trainee', label: 'Trainee', emoji: '🌱', roleKey: 'trainee' },
];

function channelType(type) {
  return type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
}

module.exports = {
  BRAND,
  ROLE_NAMES,
  roles,
  categories,
  roleButtons,
  channelType,
};
