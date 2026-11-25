// Mandatory rule checks for pull requests. No dependencies.
// The workflow runs the copy from the BASE branch, so a PR cannot weaken it.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const { BASE_SHA, HEAD_SHA, HEAD_REF = '' } = process.env;
const MAX_FILES = 6;
const WF = 'WORKFLOW.md';
const CHAIN = ['atlas', 'nima', 'sana', 'arash', 'mina', 'kian'];
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const errors = [];
const fail = (rule, msg) => errors.push(`[${rule}] ${msg}`);
const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

function report(who, count) {
  if (errors.length) {
    for (const e of errors) console.error(`::error::${e}`);
    console.error(`\n${errors.length} rule violation(s). Fix them and push again.`);
    process.exit(1);
  }
  console.log(`All mandatory rules passed for ${who} (${count} files).`);
  process.exit(0);
}

if (!BASE_SHA || !HEAD_SHA) {
  console.error('BASE_SHA and HEAD_SHA are required');
  process.exit(1);
}

const ownership = JSON.parse(git('show', `${BASE_SHA}:.github/ownership.json`));
const range = `${BASE_SHA}...${HEAD_SHA}`;
const files = git('diff', '--no-renames', '--name-only', range).split('\n').filter(Boolean);

// R1: branch must be work/<name> or work/<name>-<topic> (for example work/nima-r2).
// Old round branches stay on GitHub, so later rounds need a new branch name.
const m = /^work\/([a-z0-9]+)(?:-[a-z0-9-]+)?$/.exec(HEAD_REF);
const owner = m ? m[1] : null;
if (!owner || !Object.hasOwn(ownership, owner)) {
  fail('R1', `Branch "${HEAD_REF}" must be work/<name> or work/<name>-<topic>. Allowed names: ${Object.keys(ownership).join(', ')}`);
  report(HEAD_REF, files.length);
}

const isAdmin = ownership[owner].includes('*');
const owns = (f) =>
  ownership[owner].some((p) => p === '*' || (p.endsWith('/') ? f.startsWith(p) : f === p));
const others = files.filter((f) => f !== WF);

// R1 / R4: only touch your own files (schema.js is Atlas only)
for (const f of others) {
  if (!owns(f)) fail(f === 'tgcloud/schema.js' ? 'R4' : 'R1', `${owner} may not change ${f}`);
}

// R10: size cap per PR
if (!isAdmin && others.length > MAX_FILES) {
  fail('R10', `${others.length} files changed; the cap is ${MAX_FILES}. Split the work or hand the rest to Dara with a LIMIT handoff.`);
}

// R3: tick + handoff, only your own box, chain order
if (!isAdmin) {
  if (!files.includes(WF)) {
    fail('R3', `${WF} must be updated: tick your box and write a Handoff.`);
  } else {
    const wfDiff = git('diff', '--no-renames', '-U0', range, '--', WF).split('\n');
    const added = wfDiff.filter((l) => l.startsWith('+') && !l.startsWith('+++'));
    const removed = wfDiff.filter((l) => l.startsWith('-') && !l.startsWith('---'));
    const headers = added.filter((l) => /^\+## Handoff:/i.test(l));
    if (headers.length === 0) fail('R3', 'Add a "## Handoff: <you> -> <next>" section to WORKFLOW.md.');
    for (const h of headers) {
      if (!h.toLowerCase().startsWith(`+## handoff: ${owner}`)) {
        fail('R3', `Handoff header must start with your name (${owner}): ${h.slice(1)}`);
      }
    }
    const ticks = added.filter((l) => l.startsWith('+- [x]'));
    if (!ticks.some((l) => new RegExp(`\\*\\*${owner}\\*\\*`, 'i').test(l))) {
      fail('R3', `Tick your own box in WORKFLOW.md ("- [x] **${owner}** ...").`);
    }
    for (const t of ticks) {
      if (!new RegExp(`\\*\\*${owner}\\*\\*`, 'i').test(t)) fail('R3', `You may only tick your own box: ${t.slice(1)}`);
    }
    if (owner !== 'atlas' && removed.some((l) => l.startsWith('-- [x]'))) {
      fail('R3', 'Only Atlas may reset boxes (at the start of a new round).');
    }
  }
  const wfText = readFileSync(WF, 'utf8');
  const idx = CHAIN.indexOf(owner);
  if (idx > 0) {
    // Members whose checklist line says "(بدون کار" have nothing to do this round: skip them.
    let k = idx - 1;
    while (k >= 0 && new RegExp(`^- \\[[ x]\\] \\*\\*${cap(CHAIN[k])}\\*\\* .*بدون کار`, 'm').test(wfText)) k -= 1;
    if (k >= 0) {
      const prevName = cap(CHAIN[k]);
      if (!new RegExp(`^- \\[x\\] \\*\\*${prevName}\\*\\*`, 'm').test(wfText)) {
        fail('R3', `Not your turn: ${prevName} has not ticked their box yet.`);
      }
    }
  }
  if (owner === 'dara' && !/^- LIMIT:/m.test(wfText)) {
    fail('R9', 'Dara may only work after a LIMIT handoff (a line starting with "- LIMIT:") exists in WORKFLOW.md.');
  }
}

// R7: forbidden paths
const FORBIDDEN = [/^\.tgcloud\//, /(^|\/)\.env(\..*)?$/, /(^|\/)credentials$/];
for (const f of files) {
  if (FORBIDDEN.some((re) => re.test(f))) fail('R7', `Forbidden file in PR: ${f}`);
}

// Platform layout: only schema.js, lib/**, handlers/*, endpoints/* may be .js under tgcloud/
for (const f of files) {
  if (!f.startsWith('tgcloud/') || !f.endsWith('.js')) continue;
  const ok =
    f === 'tgcloud/schema.js' ||
    /^tgcloud\/lib\/.+\.js$/.test(f) ||
    /^tgcloud\/(handlers|endpoints)\/[^/]+\.js$/.test(f);
  if (!ok) fail('LAYOUT', `${f} would not be deployed (handlers/ and endpoints/ are flat; other files must be in lib/).`);
}

// Content checks on added lines
const SECRETS = [
  ['tgcloud CLI token', /\bapp\d+:[A-Za-z0-9_-]{16,}/],
  ['Telegram bot token', /\b\d{7,10}:[A-Za-z0-9_-]{35}\b/],
  ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,})/],
];
const fullDiff = git('diff', '--no-renames', '-U0', range);
let cur = '';
for (const line of fullDiff.split('\n')) {
  if (line.startsWith('+++ b/')) { cur = line.slice(6); continue; }
  if (!line.startsWith('+') || line.startsWith('+++')) continue;
  const text = line.slice(1);

  for (const [name, re] of SECRETS) {
    if (re.test(text)) fail('R7', `Possible ${name} in ${cur}`);
  }

  if (cur.startsWith('tgcloud/') && cur.endsWith('.js')) {
    if (/\.references\(|\bforeignKey\(/.test(text)) fail('SDK', `${cur}: foreign keys are not allowed on this platform.`);
    if (/\brequire\(/.test(text)) fail('SDK', `${cur}: require() is not available; use ES imports.`);
    for (const mm of text.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)) {
      const spec = mm[1];
      const ok = /^sdk(\/(db|api|fetch))?$/.test(spec) || (/^\.{1,2}\//.test(spec) && spec.endsWith('.js'));
      if (!ok) fail('SDK', `${cur}: import "${spec}" is not allowed (only 'sdk', 'sdk/db|api|fetch' and relative paths ending in .js).`);
    }
  }

  if (cur.startsWith('.github/workflows/')) {
    if (/tgcloud\s+migrate/.test(text)) fail('R5', `${cur}: migrate must never run in CI.`);
    if (/tgcloud\s+push[^\n]*--force/.test(text)) fail('R5', `${cur}: push --force is forbidden.`);
    if (/tgcloud\s+push/.test(text) && cur !== '.github/workflows/deploy.yml') {
      fail('R5', `${cur}: only deploy.yml may run tgcloud push.`);
    }
  }
}

report(`work/${owner}`, files.length);
