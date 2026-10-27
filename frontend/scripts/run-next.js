// Launches the Next.js CLI with FRONTEND_PORT from the shared ../.env (loaded via --env-file).
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let nextBin;
try {
  nextBin = require.resolve('next/dist/bin/next');
} catch {
  console.error('Next.js is not installed - run `npm install` in the frontend folder first.');
  process.exit(1);
}

const [command = 'dev', ...rest] = process.argv.slice(2);
const args = [nextBin, command, ...rest];
if (command === 'dev') {
  args.push('-p', process.env.FRONTEND_PORT || '3000');
}

const child = spawn(process.execPath, args, { stdio: 'inherit' });
child.on('error', (err) => {
  console.error(`Failed to start Next.js: ${err.message}`);
  process.exit(1);
});
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
