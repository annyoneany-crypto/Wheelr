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

/**
 * Messages with inline markup (`<strong>`, `<em>`, `<code>`) are extracted with
 * `<x id="START_TAG_STRONG" .../>` placeholders. In the dictionary they are
 * written as `{START_TAG_STRONG}`; here each token is swapped back for the exact
 * `<x/>` element from that unit's source. A translation that drops a placeholder,
 * or invents one the source does not have, fails the run — a missing
 * `CLOSE_TAG_STRONG` would otherwise leave the rest of the paragraph bold.
 */
function renderTarget(id, locale, translation, sourceXml) {
  const placeholders = new Map(
    [...sourceXml.matchAll(/<x id="([A-Z_0-9]+)"[^>]*\/>/g)].map((match) => [match[1], match[0]])
  );

  // Repeated tags share one name (five <strong> are five START_TAG_STRONG), so
  // "used at least once" is not enough: a translation with one CLOSE_TAG_STRONG
  // fewer would still pass and leave the rest of the paragraph bold.
  const countIn = (text, pattern) => [...text.matchAll(pattern)].map((match) => match[1]);
  const tally = (names) => names.reduce((acc, name) => acc.set(name, (acc.get(name) ?? 0) + 1), new Map());
  const expected = tally(countIn(sourceXml, /<x id="([A-Z_0-9]+)"[^>]*\/>/g));
  const actual = tally(countIn(translation, /\{([A-Z_0-9]+)\}/g));
  for (const [name, count] of expected) {
    if ((actual.get(name) ?? 0) !== count) {
      throw new Error(
        `${id} [${locale}]: {${name}} appears ${actual.get(name) ?? 0} time(s), the source has ${count}`
      );
    }
  }

  const used = new Set();
  const parts = translation.split(/(\{[A-Z_0-9]+\})/);
  const rendered = parts
    .map((part) => {
      const token = /^\{([A-Z_0-9]+)\}$/.exec(part);
      if (!token) return escapeXml(part);

      const element = placeholders.get(token[1]);
      if (!element) {
        throw new Error(`${id} [${locale}]: placeholder {${token[1]}} does not exist in the source`);
      }
      used.add(token[1]);
      return element;
    })
    .join('');

  const dropped = [...placeholders.keys()].filter((name) => !used.has(name));
  if (dropped.length) {
    throw new Error(`${id} [${locale}]: translation drops placeholder(s) ${dropped.join(', ')}`);
  }

  return rendered;
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
      const sourceXml = (withoutTarget.match(/<source>([\s\S]*?)<\/source>/) ?? ['', ''])[1];
      const target = renderTarget(id, locale, translation, sourceXml);

      return `<trans-unit id="${id}"${attrs}>${withoutTarget.replace(
        /(<\/source>)/,
        () => `</source>\n${indent}<target>${target}</target>`
      )}</trans-unit>`;
    });

  await writeFile(join(localeDir, `messages.${locale}.xlf`), body, 'utf8');

  const done = sourceIds.length - missing.length;
  console.log(
    `messages.${locale}.xlf: ${done}/${sourceIds.length} translated` +
      (missing.length ? ` — missing: ${missing.join(', ')}` : '')
  );
}
