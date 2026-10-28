const fs = require('fs');
const path = require('path');

const nextDir = path.join(__dirname, '..', '.next');
if (fs.existsSync(nextDir)) {
  try {
    fs.rmSync(nextDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
    console.log('[clean-next] Successfully cleaned .next directory.');
  } catch (err) {
    console.warn('[clean-next] Notice: .next cleanup skipped or partially locked by OneDrive/Process:', err.message);
  }
}

