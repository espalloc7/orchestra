// Shared state for the activation hook and the statusline.

const fs = require('fs');
const path = require('path');
const os = require('os');

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');

/**
 * Is the openai-codex plugin installed and enabled?
 *
 * Checked against the user's settings files rather than the plugin cache, because a
 * cached-but-disabled plugin does not give us the /codex: commands the rules refer to.
 */
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

/**
 * Has the user switched orchestra off?
 *
 * A flag file is the primary switch because it is the only one that reliably works:
 * Claude Code does not pass the launching shell's environment through to hook
 * subprocesses, so an env var set next to `claude` never reaches this code. The env var
 * is still honoured for anyone whose setup does export it into hooks.
 */
function orchestraOff() {
  if (process.env.ORCHESTRA_OFF === '1') return true;
  return fs.existsSync(path.join(claudeDir, '.orchestra-off'));
}

module.exports = { claudeDir, codexAvailable, orchestraOff };
