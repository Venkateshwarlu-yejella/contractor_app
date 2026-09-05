import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const task = process.argv[2];
if (!['install', 'build'].includes(task)) {
  console.error('Usage: node scripts/run-task.mjs install|build');
  process.exit(64);
}

let command = 'bash';
let args = [resolve(root, 'scripts', task === 'install' ? 'install-ci.sh' : 'build-verified.sh')];
let env = { ...process.env };
if (process.platform === 'win32') {
  // Keep local caches and logs writable without requiring Linux shell utilities.
  const runtime = resolve(root, '.sites-runtime');
  for (const directory of ['npm-cache', 'tmp', 'wrangler/logs']) {
    mkdirSync(resolve(runtime, directory), { recursive: true });
  }
  env = {
    ...env,
    TMP: resolve(runtime, 'tmp'),
    TEMP: resolve(runtime, 'tmp'),
    WRANGLER_WRITE_LOGS: 'false',
    WRANGLER_LOG_PATH: resolve(runtime, 'wrangler/logs'),
    MINIFLARE_REGISTRY_PATH: resolve(runtime, 'wrangler/registry'),
  };
  command = process.execPath;
  if (task === 'install') {
    if (!process.env.npm_execpath) {
      console.error('Run npm run install:ci so the npm CLI can be located.');
      process.exit(64);
    }
    args = [process.env.npm_execpath, 'ci', '--cache', resolve(runtime, 'npm-cache')];
  } else {
    args = [resolve(root, 'node_modules/vinext/dist/cli.js'), 'build'];
  }
}

const result = spawnSync(command, args, {
  cwd: root,
  env,
  stdio: 'inherit',
  timeout: task === 'install' ? 480_000 : 180_000,
  windowsHide: true,
});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
