const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function loadConfig() {
  const cwd = process.cwd();
  for (const file of ['config.yaml', 'config.yml', 'config.json']) {
    const full = path.join(cwd, file);
    if (fs.existsSync(full)) {
      const raw = fs.readFileSync(full, 'utf8');
      try {
        return file.endsWith('.json') ? JSON.parse(raw) : yaml.load(raw);
      } catch (err) {
        throw new Error(
          `Failed to parse configuration file ${file}: ${err.message}`,
        );
      }
    }
  }
  return {};
}

const config = loadConfig();
config.loadConfig = loadConfig;
module.exports = config;
