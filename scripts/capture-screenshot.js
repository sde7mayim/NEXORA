const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

async function main() {
  const port = process.argv[2] || '3456';
  const baseUrl = `http://127.0.0.1:${port}`;
  const outDir = path.resolve('C:/Users/MayimDazzle_10/.gemini/antigravity/brain/e92fc285-5c7d-4a95-8da7-00f2c6e92787');

  console.log(`Starting next start on port ${port}...`);
  const server = spawn('node', ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', port], {
    stdio: 'inherit',
    shell: false,
    detached: false
  });

  try {
    // Wait for server to come up
    let connected = false;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 600));
      try {
        const body = await new Promise((resolve, reject) => {
          const req = http.get(baseUrl + '/', { timeout: 2000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
          });
          req.on('error', reject);
        });
        if (body && body.includes('Nexora')) {
          connected = true;
          console.log('Server is ready!');
          break;
        }
      } catch (e) {}
    }

    if (!connected) {
      console.error('Failed to connect to next server');
      process.exit(1);
    }

    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

    const routes = [
      { path: '/', name: 'homepage-dynamic-demo' },
      { path: '/features', name: 'features-page' },
      { path: '/models', name: 'models-page' },
      { path: '/pricing', name: 'pricing-page' },
      { path: '/security', name: 'security-page' },
      { path: '/contact', name: 'contact-page' },
    ];

    for (const route of routes) {
      const pageUrl = `${baseUrl}${route.path}`;
      const desktopFile = path.join(outDir, `${route.name}.png`);
      const mobileFile = path.join(outDir, `${route.name}-mobile.png`);

      console.log(`Capturing ${route.path}...`);
      // Touch route
      try { execSync(`curl -s ${pageUrl}`); } catch (e) {}
      await new Promise(r => setTimeout(r, 600));

      // Desktop screenshot
      execSync(`"${chromePath}" --headless=new --disable-gpu --screenshot="${desktopFile}" --window-size=1440,1150 "${pageUrl}"`);
      console.log(`Saved desktop: ${route.name}.png (${fs.statSync(desktopFile).size} bytes)`);

      // Mobile screenshot
      execSync(`"${chromePath}" --headless=new --disable-gpu --screenshot="${mobileFile}" --window-size=390,844 "${pageUrl}"`);
      console.log(`Saved mobile: ${route.name}-mobile.png (${fs.statSync(mobileFile).size} bytes)`);
    }

  } finally {
    try {
      execSync(`taskkill /F /T /PID ${server.pid}`);
    } catch (e) {}
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
