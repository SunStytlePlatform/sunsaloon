// Launches the Next.js CLI with FRONTEND_PORT from the shared ../.env (loaded via --env-file).
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const nextBin = require.resolve('next/dist/bin/next');

const [command = 'dev', ...rest] = process.argv.slice(2);
const args = [nextBin, command, ...rest];
if (command === 'dev' || command === 'start') {
  args.push('-p', process.env.FRONTEND_PORT || '3000');
}

const child = spawn(process.execPath, args, { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));
