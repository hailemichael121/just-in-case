// Publishes the static folder with the Netlify CLI, the same way the Kakeibo
// project does it: plain directory, no build, explicit site name.
import { spawn } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const site = process.env.NETLIFY_SITE ?? 'justincase-widget';
const defaultUrl = 'https://justincase-widget.netlify.app';

const run = (args, capture = false) =>
  new Promise((resolve, reject) => {
    const child = spawn('npx', ['--yes', 'netlify', ...args], {
      cwd: root,
      stdio: capture ? ['inherit', 'pipe', 'inherit'] : 'inherit',
    });
    let out = '';
    child.stdout?.on('data', (chunk) => (out += chunk));
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve(out) : reject(new Error(`netlify exited ${code}`))));
  });

const output = await run(
  ['deploy', '--dir', '.', '--prod', '--no-build', '--site', site, '--json'],
  true,
);

let url = defaultUrl;
try {
  const result = JSON.parse(output.slice(output.indexOf('{'), output.lastIndexOf('}') + 1));
  if (result.url) url = result.url;
} catch {}

const live = url.replace(/\/+$/, '');
for (const pathname of ['/', '/about', '/downloads', '/about.html']) {
  const response = await fetch(live + pathname);
  console.log(`${response.ok ? '✓' : '✗'} ${live + pathname} (${response.status})`);
  if (!response.ok) process.exitCode = 1;
}
console.log(`\nPublished: ${live}`);
