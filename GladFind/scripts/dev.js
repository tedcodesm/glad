#!/usr/bin/env node
// Runs the API and the Vite dev server side by side with prefixed output.
// Keeps the project's "no tooling dependencies" promise: this replaces `concurrently`.
//
// Children are spawned as `node <entry>` rather than `npm run …`. On Windows
// `npm` is a `.cmd` shim, and since Node 20.12 (CVE-2024-27980) spawning a
// `.cmd` without a shell throws `EINVAL`. Going straight to the entry points
// also means Ctrl+C reaches both processes directly instead of orphaning them
// behind a `cmd.exe` wrapper.

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const clientDir = path.join(root, 'client');
const serverDir = path.join(root, 'server');

// Vite's `exports` map blocks `require.resolve('vite/bin/vite.js')`, so resolve
// the package manifest (which is exported) and read its `bin` entry instead.
const require = createRequire(path.join(clientDir, 'noop.js'));
const vitePkgPath = require.resolve('vite/package.json');
const vitePkg = require('vite/package.json');
const viteBin = typeof vitePkg.bin === 'string' ? vitePkg.bin : vitePkg.bin.vite;
const viteEntry = path.resolve(path.dirname(vitePkgPath), viteBin);

const ESC = '\u001b';
const RESET = `${ESC}[0m`;
const DIM = `${ESC}[2m`;

const TARGETS = [
  {
    name: 'api',
    color: `${ESC}[36m`,
    cwd: serverDir,
    args: ['--watch', 'src/index.js'],
  },
  {
    name: 'web',
    color: `${ESC}[35m`,
    cwd: clientDir,
    args: [viteEntry],
  },
];

const children = [];
let shuttingDown = false;

function prefix(target) {
  return `${target.color}[${target.name}]${RESET} ${DIM}\u2502${RESET} `;
}

function pipe(stream, target) {
  let buffer = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.trim() !== '') process.stdout.write(`${prefix(target)}${line}\n`);
    }
  });
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill('SIGTERM');
  }
  // Give both children a moment to close their listeners before we go.
  setTimeout(() => process.exit(code), 300);
}

for (const target of TARGETS) {
  const child = spawn(process.execPath, target.args, {
    cwd: target.cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  child.on('error', (e) => {
    process.stderr.write(`${prefix(target)}failed to start: ${e.message}\n`);
    shutdown(1);
  });

  pipe(child.stdout, target);
  pipe(child.stderr, target);

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    const how = signal ? `signal ${signal}` : `code ${code}`;
    process.stdout.write(`${prefix(target)}exited with ${how}\n`);
    shutdown(code ?? 1);
  });

  children.push(child);
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => shutdown(0));
}