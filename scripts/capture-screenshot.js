const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

async function main() {
  const targetImage = process.argv[2] || 'screenshot.png';
  const port = process.argv[3] || '3456';
  const url = `http://localhost:${port}`;
  const outPath = path.resolve('C:/Users/MayimDazzle_10/.gemini/antigravity/brain/e92fc285-5c7d-4a95-8da7-00f2c6e92787', targetImage);

  try {
    execSync('node scripts/clean-next.js', { stdio: 'inherit' });
  } catch (e) {}

  console.log(`Starting next dev on port ${port}...`);
  const server = spawn('node', ['node_modules/next/dist/bin/next', 'dev', '-p', port], {
    stdio: 'inherit',
    shell: false,
    detached: false
  });

  try {
    // Wait for server to come up
    let connected = false;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 1000));
      try {
        const res = execSync(`curl -s http://localhost:${port}/`).toString();
        if (res && res.includes('Nexora')) {
          connected = true;
          console.log('Server is ready and page compiled!');
          break;
        }
      } catch (e) {
        // retry
      }
    }

    if (!connected) {
      console.error('Failed to connect to next server');
      process.exit(1);
    }

    // Wait 2.5s for all staggered entrance animations to settle
    await new Promise(r => setTimeout(r, 2500));

    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    console.log(`Capturing screenshot to ${outPath}...`);
    execSync(`"${chromePath}" --headless=new --disable-gpu --screenshot="${outPath}" --window-size=1440,1080 "${url}"`);
    console.log(`Screenshot saved to ${outPath} (${fs.statSync(outPath).size} bytes)`);

    // Also mobile view
    const mobileOut = outPath.replace('.png', '-mobile.png');
    execSync(`"${chromePath}" --headless=new --disable-gpu --screenshot="${mobileOut}" --window-size=390,844 "${url}"`);
    console.log(`Mobile screenshot saved to ${mobileOut} (${fs.statSync(mobileOut).size} bytes)`);

  } finally {
    // Kill the server process tree
    try {
      execSync(`taskkill /F /T /PID ${server.pid}`);
    } catch (e) {}
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

