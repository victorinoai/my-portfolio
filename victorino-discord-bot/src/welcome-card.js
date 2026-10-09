const sharp = require('sharp');

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function fitName(value = '') {
  const clean = String(value).trim();
  return clean.length > 24 ? `${clean.slice(0, 22)}…` : clean;
}

async function avatarDataUri(member) {
  try {
    const url = member.user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
    const response = await fetch(url);
    if (!response.ok) return null;
    const input = Buffer.from(await response.arrayBuffer());
    const png = await sharp(input).resize(220, 220, { fit: 'cover' }).png().toBuffer();
    return `data:image/png;base64,${png.toString('base64')}`;
  } catch (error) {
    console.error('welcome-card avatar fetch failed:', error.message);
    return null;
  }
}

async function buildWelcomeCard(member, levelLabel = 'LEVEL 1 | ARRIVAL') {
  const width = 1200;
  const height = 440;
  const displayName = escapeXml(fitName(member.displayName || member.user.globalName || member.user.username));
  const memberNumber = Number(member.guild.memberCount || 1).toLocaleString('en-US');
  const avatar = await avatarDataUri(member);

  const avatarMarkup = avatar
    ? `<image href="${avatar}" x="75" y="110" width="220" height="220" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatarClip)"/>`
    : `<circle cx="185" cy="220" r="110" fill="#202028"/><text x="185" y="245" text-anchor="middle" font-size="86" font-family="sans-serif" font-weight="800" fill="#bfc4cd">V</text>`;

  const svg = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#07080b"/>
        <stop offset="52%" stop-color="#101218"/>
        <stop offset="100%" stop-color="#050609"/>
      </linearGradient>
      <linearGradient id="metal" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#f5f7fa"/>
        <stop offset="45%" stop-color="#8d939d"/>
        <stop offset="72%" stop-color="#e7e9ed"/>
        <stop offset="100%" stop-color="#747a84"/>
      </linearGradient>
      <radialGradient id="glow" cx="75%" cy="40%" r="60%">
        <stop offset="0%" stop-color="#b7becb" stop-opacity="0.14"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>
      <clipPath id="avatarClip"><circle cx="185" cy="220" r="110"/></clipPath>
      <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.7"/>
      </filter>
    </defs>

    <rect width="1200" height="440" rx="24" fill="url(#bg)"/>
    <rect width="1200" height="440" rx="24" fill="url(#glow)"/>

    <g opacity="0.16" stroke="#8f96a2" stroke-width="1">
      <path d="M0 86 L340 0"/><path d="M0 178 L640 0"/><path d="M0 330 L960 0"/>
      <path d="M520 440 L1200 215"/><path d="M780 440 L1200 302"/>
    </g>

    <rect x="28" y="28" width="8" height="384" rx="4" fill="url(#metal)"/>

    <circle cx="185" cy="220" r="122" fill="none" stroke="#626975" stroke-width="2"/>
    <circle cx="185" cy="220" r="116" fill="none" stroke="url(#metal)" stroke-width="5" opacity="0.9" filter="url(#shadow)"/>
    ${avatarMarkup}

    <text x="350" y="92" font-family="sans-serif" font-size="20" font-weight="700" letter-spacing="5" fill="#9ba1ab">VICTORINO</text>
    <text x="350" y="175" font-family="sans-serif" font-size="76" font-weight="900" letter-spacing="2" fill="url(#metal)">WELCOME</text>
    <text x="350" y="240" font-family="sans-serif" font-size="46" font-weight="750" fill="#f5f6f8">${displayName}</text>
    <text x="350" y="287" font-family="sans-serif" font-size="24" font-weight="600" fill="#aeb4be">Member #${memberNumber}</text>

    <rect x="350" y="322" width="305" height="48" rx="24" fill="#171a21" stroke="#555b66" stroke-width="1"/>
    <text x="502" y="354" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="800" letter-spacing="1" fill="#e7e9ec">${escapeXml(levelLabel)}</text>

    <text x="350" y="404" font-family="sans-serif" font-size="17" font-weight="600" letter-spacing="2" fill="#737985">AI CREATIVE AGENCY • INTERNAL OPERATIONS</text>

    <g opacity="0.075" transform="translate(900 80)">
      <text x="0" y="260" font-family="sans-serif" font-size="310" font-weight="900" font-style="italic" fill="#ffffff">V</text>
    </g>
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

module.exports = { buildWelcomeCard };
