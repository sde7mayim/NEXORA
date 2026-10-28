const fs = require('fs');
const path = require('path');

// Ensure base directories exist without destructive rmSync on OneDrive
const commonDirs = [
  '.next',
  '.next/server',
  '.next/server/app',
  '.next/server/app/api',
  '.next/server/app/app',
];

for (const d of commonDirs) {
  const full = path.join(__dirname, '..', d);
  try {
    fs.mkdirSync(full, { recursive: true });
  } catch (err) {}
}
