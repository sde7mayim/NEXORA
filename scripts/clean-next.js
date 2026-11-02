const fs = require('fs');
const path = require('path');

// 1. Patch Next.js recursive-delete to prevent Windows OneDrive readlink EINVAL crash
try {
  const targetFile = path.join(
    __dirname,
    '..',
    'node_modules',
    'next',
    'dist',
    'lib',
    'recursive-delete.js'
  );

  if (fs.existsSync(targetFile)) {
    let content = fs.readFileSync(targetFile, 'utf8');
    const buggyCode = `        if (isSymlink) {
            const linkPath = await _fs.promises.readlink(absolutePath);
            try {
                const stats = await _fs.promises.stat((0, _path.isAbsolute)(linkPath) ? linkPath : (0, _path.join)((0, _path.dirname)(absolutePath), linkPath));
                isDirectory = stats.isDirectory();
            } catch  {}
        }`;

    const fixedCode = `        if (isSymlink) {
            try {
                const linkPath = await _fs.promises.readlink(absolutePath);
                try {
                    const stats = await _fs.promises.stat((0, _path.isAbsolute)(linkPath) ? linkPath : (0, _path.join)((0, _path.dirname)(absolutePath), linkPath));
                    isDirectory = stats.isDirectory();
                } catch {}
            } catch (err) {
                // Windows / OneDrive reparse points return isSymbolicLink() === true but fail readlink with EINVAL
            }
        }`;

    if (content.includes(buggyCode)) {
      content = content.replace(buggyCode, fixedCode);
      fs.writeFileSync(targetFile, content, 'utf8');
      console.log('[clean-next] Patched next/dist/lib/recursive-delete.js for Windows/OneDrive compatibility.');
    }
  }
} catch (err) {
  // Best-effort patch
}

// 2. Safely clean or ensure .next directory exists
const nextDir = path.join(__dirname, '..', '.next');
if (fs.existsSync(nextDir)) {
  try {
    fs.rmSync(nextDir, { recursive: true, force: true });
  } catch (e) {
    // If locked by another process, ignore
  }
}

// Function to recursively find all directory relative paths
function getAllDirs(dir, baseDir = dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of list) {
      if (item.isDirectory() && item.name !== 'node_modules' && item.name !== '.next' && item.name !== '.git') {
        const fullPath = path.join(dir, item.name);
        const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
        results.push(relPath);
        results = results.concat(getAllDirs(fullPath, baseDir));
      }
    }
  } catch (e) {}
  return results;
}

const appRoot = path.join(__dirname, '..', 'app');
const appSubDirs = fs.existsSync(appRoot) ? getAllDirs(appRoot) : [];

const commonDirs = [
  '.next',
  '.next/server',
  '.next/server/app',
  '.next/server/app/api',
  '.next/server/app/app',
  '.next/static',
  '.next/static/chunks',
  '.next/static/chunks/app',
  '.next/static/chunks/app/app',
  '.next/static/chunks/app/app/files',
  '.next/types',
  '.next/types/app',
  ...appSubDirs.map(d => `.next/server/app/${d}`),
  ...appSubDirs.map(d => `.next/static/chunks/app/${d}`),
  ...appSubDirs.map(d => `.next/types/app/${d}`),
];

for (const d of commonDirs) {
  const full = path.join(__dirname, '..', d);
  try {
    fs.mkdirSync(full, { recursive: true });
  } catch (err) {}
}
