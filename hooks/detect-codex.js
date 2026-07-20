// Shared between the activation hook and the statusline: is the openai-codex plugin
// installed and enabled?
//
// Checked against the user's settings files rather than the plugin cache, because a
// cached-but-disabled plugin does not give us the /codex: commands the rules refer to.

const fs = require('fs');
const path = require('path');
const os = require('os');

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');

function codexAvailable() {
  for (const file of ['settings.json', 'settings.local.json']) {
    try {
      const raw = fs.readFileSync(path.join(claudeDir, file), 'utf8');
      const enabled = JSON.parse(raw).enabledPlugins || {};
      for (const [key, value] of Object.entries(enabled)) {
        if (value === true && /codex/i.test(key)) return true;
      }
    } catch (e) {
      // Missing or malformed file just means "no evidence here" — keep looking.
    }
  }
  return false;
}

module.exports = { claudeDir, codexAvailable };
