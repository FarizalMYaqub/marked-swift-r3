// Driver for the markdown-render-speed-02 entry: reads every case from
// $MAKEFUN_INPUT_DIR/cases.json (or /input), renders each one on its own with
// parse() from parse.js, and writes $MAKEFUN_OUTPUT_DIR/html.json (or
// /output): a JSON array of the HTML strings, one per case, in the cases'
// order. Run by the harness as `node /bot/main.ts` (node 22).
//
// Revision: preallocate the output array and fill it by index (avoids push
// growth on the 40 long README docs), create the output directory if the
// harness did not, and report the render time on stderr so a slow run is
// visible without touching the output file.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from './parse.js';

const INPUT_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const cases = JSON.parse(readFileSync(join(INPUT_DIR, 'cases.json'), 'utf8')) as { id: string; markdown: string }[];
const html: string[] = new Array(cases.length);
const t0 = Date.now();
for (let i = 0; i < cases.length; i++) html[i] = parse(cases[i].markdown);
const ms = Date.now() - t0;
mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(join(OUTPUT_DIR, 'html.json'), JSON.stringify(html));
console.error(`rendered ${cases.length} cases in ${ms}ms`);
