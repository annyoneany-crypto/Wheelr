/**
 * Merges `tools/i18n-translations.json` into the per-locale XLIFF files.
 *
 * `ng extract-i18n` only ever writes `src/locale/messages.xlf` (the source); the
 * translated files are ours to maintain. Doing it by hand across five languages
 * is how translations silently rot, so this regenerates each one from the
 * current source file plus the dictionary, and **reports every message it could
 * not translate** instead of quietly emitting an English string.
 *
 * Run after `ng extract-i18n`, via `npm run i18n`.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const localeDir = join(root, 'src/locale');
const LOCALES = ['it', 'de', 'fr', 'es', 'zh'];

const dictionary = JSON.parse(await readFile(join(root, 'tools/i18n-translations.json'), 'utf8'));
const source = await readFile(join(localeDir, 'messages.xlf'), 'utf8');

/** XLIFF keeps markup inside <source>; escaping the translation would break it. */
function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const unitRe = /<trans-unit id="([^"]+)"([^>]*)>([\s\S]*?)<\/trans-unit>/g;
const sourceIds = [...source.matchAll(unitRe)].map((match) => match[1]);

const unknown = Object.keys(dictionary).filter(
  (id) => !id.startsWith('_') && !sourceIds.includes(id)
);
if (unknown.length) {
  throw new Error(
    `Translations exist for ids that are no longer extracted: ${unknown.join(', ')}. ` +
      'Remove them from i18n-translations.json or restore the markup.'
  );
}

for (const locale of LOCALES) {
  const missing = [];

  const body = source
    .replace(/<file source-language="en-US"/, `<file source-language="en-US" target-language="${locale}"`)
    .replace(unitRe, (whole, id, attrs, inner) => {
      const translation = dictionary[id]?.[locale];

      if (!translation) {
        missing.push(id);
        return whole;
      }

      // A <target> may already be there from a previous run; replace it.
      const withoutTarget = inner.replace(/\s*<target[^>]*>[\s\S]*?<\/target>/, '');
      const indent = (withoutTarget.match(/\n(\s*)<source>/) ?? ['', '        '])[1];

      return `<trans-unit id="${id}"${attrs}>${withoutTarget.replace(
        /(<\/source>)/,
        `$1\n${indent}<target>${escapeXml(translation)}</target>`
      )}</trans-unit>`;
    });

  await writeFile(join(localeDir, `messages.${locale}.xlf`), body, 'utf8');

  const done = sourceIds.length - missing.length;
  console.log(
    `messages.${locale}.xlf: ${done}/${sourceIds.length} translated` +
      (missing.length ? ` — missing: ${missing.join(', ')}` : '')
  );
}
