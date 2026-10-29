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
