/**
 * Concatenates public/md/*.md into public/llms-full.txt.
 *
 * `llms.txt` is the index an AI agent reads first; `llms-full.txt` is the whole
 * site in one fetch, which is what most of them actually pull. Keeping it
 * generated means the two can never drift from the per-page markdown.
 *
 * Run `npm run llms` after editing anything under public/md/.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mdDir = join(root, 'public', 'md');

/** Reading order matters: agents summarise from the top down. */
const ORDER = ['index.md', 'info.md', 'templates.md', 'privacy.md', 'donation.md'];

const files = await readdir(mdDir);
const ordered = [
  ...ORDER.filter((name) => files.includes(name)),
  ...files.filter((name) => name.endsWith('.md') && !ORDER.includes(name)).sort(),
];

const parts = [
  '# Wheelr — full site content',
  '',
  '> Every page of https://www.wheelr.xyz/ in one file, generated from the site source.',
  `> Generated: ${new Date().toISOString().slice(0, 10)}`,
  '',
];

/** Per-page YAML frontmatter is noise once the pages are merged into one document. */
function stripFrontmatter(source) {
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n/.exec(source);
  return match ? source.slice(match[0].length) : source;
}

for (const name of ordered) {
  const body = await readFile(join(mdDir, name), 'utf8');
  parts.push('', stripFrontmatter(body).trim(), '');
}

await writeFile(join(root, 'public', 'llms-full.txt'), parts.join('\n') + '\n', 'utf8');
console.log(`llms-full.txt written from ${ordered.length} page(s): ${ordered.join(', ')}`);
