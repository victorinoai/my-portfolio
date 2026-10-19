const fs = require('fs');
const path = require('path');

const root = __dirname;
const targets = [
  'config.js',
  'index-v3.js',
  'arrival-runtime-patch.js',
  'arrival-migrate.js',
  'name-migrate.js',
  'footer-migrate.js',
  'welcome-card.js',
];

function rebrandText(value) {
  return value
    .replaceAll('VICTORINO HQ', 'VICTO HQ')
    .replaceAll('VICTORINO', 'VICTO HQ')
    .replaceAll('setup-victorino', 'setup-victo');
}

let changed = 0;
for (const filename of targets) {
  const filePath = path.join(root, filename);
  if (!fs.existsSync(filePath)) continue;

  const before = fs.readFileSync(filePath, 'utf8');
  const after = rebrandText(before);
  if (after !== before) {
    fs.writeFileSync(filePath, after);
    changed += 1;
  }
}

console.log(`VICTO HQ runtime brand patch complete. Updated ${changed} source files.`);
