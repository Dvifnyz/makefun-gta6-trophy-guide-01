// Leonida Trophy Ledger — a gta6-trophy-guide-01 entry (Node 22, stdlib only).
//
// The guide itself is plain static files in app/ (index.html, style.css,
// app.js and app/data/trophies.json), opened in a desktop browser with no
// build step and no network: everything it loads is a file under app/, and
// the checklist is kept in the browser's localStorage. This program hands
// the guide in: it copies app/ and screenshots/ from beside this file to
// /output and writes /output/dossier.json with the vendored make.fun
// library, which is what the judge reads (screenshots plus an outline of
// the source). Leave vendor/makefun-frontend.ts untouched — the scorer
// requires dossier.json to be byte for byte what its own copy writes.
//
// Serve the guide locally with any static server rooted at app/, for
// example: `node -e "require('node:http')"` is overkill —
// `python3 -m http.server 8080 --directory app` works, or `npx serve app`.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's caps for this bounty: at most 4 screenshots, each at most
// 256 KiB; app/ at most 993 files and directories and 48 MiB in all; the
// dossier text at most 163,840 bytes. buildDossier refuses anything past
// them, so a bad entry fails here instead of silently passing.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
