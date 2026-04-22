'use strict';

/**
 * Copies the Twilio Voice SDK browser bundle from node_modules to public/js
 * so it can be served locally — no CDN dependency.
 */

const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'node_modules', '@twilio', 'voice-sdk', 'dist', 'twilio.min.js');
const dest = path.join(__dirname, '..', 'public', 'js', 'twilio.min.js');

if (!fs.existsSync(src)) {
  console.error('[copy-twilio-sdk] Source not found:', src);
  process.exit(1);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log('[copy-twilio-sdk] Copied Twilio Voice SDK to public/js/twilio.min.js');
