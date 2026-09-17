/**
 * Marks `index.csr.html` noindex after the build.
 *
 * That shell is served for exactly two kinds of URL: shared wheels (`/:id`) and
 * anything that does not exist — every indexable route has its own prerendered
 * HTML. `SeoService` already sets `noindex` on those routes, but it does so from
 * JavaScript, so only a crawler that renders sees it; Bing and most AI crawlers
 * read the shell's own tags, which say `index, follow`.
 *
 * The canonical goes too: it points at the homepage, and combining a canonical
 * with noindex sends contradictory signals. The SPA sets the right canonical at
 * runtime for clients that execute it.
 *
 * Runs from `npm run build`; `vercel.json` pins the build command so the hosted
 * build cannot skip it.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shellPath = join(root, 'dist/wheelr/browser/index.csr.html');

const NOINDEX = 'noindex, follow';

let html;
try {
  html = await readFile(shellPath, 'utf8');
} catch {
  throw new Error(
    `${shellPath} not found. It is emitted by the static build for client-rendered ` +
      'routes — has outputMode or the route render modes changed?'
  );
}

/** Replaces exactly one tag, and refuses to silently do nothing. */
function replaceOnce(source, pattern, replacement, label) {
  const matches = source.match(pattern);

  if (!matches) {
    throw new Error(`Could not find ${label} in index.csr.html — refusing to ship an indexable shell.`);
  }

  return source.replace(pattern, replacement);
}

html = replaceOnce(
  html,
  /<meta name="robots" content="[^"]*">/,
  `<meta name="robots" content="${NOINDEX}">`,
  'the robots meta'
);

// A googlebot directive overrides the generic one for Google, so the two always
// move together — the same trap SeoService has to avoid at runtime.
html = replaceOnce(
  html,
  /<meta name="googlebot" content="[^"]*">/,
  `<meta name="googlebot" content="${NOINDEX}">`,
  'the googlebot meta'
);

// Tolerant, unlike the two above: a fresh build always has the canonical, but
// running this script twice on the same output should not blow up.
const canonical = /\s*<link rel="canonical" href="[^"]*">/;
const hadCanonical = canonical.test(html);
html = html.replace(canonical, '');

await writeFile(shellPath, html, 'utf8');

console.log(
  `index.csr.html: robots + googlebot set to "${NOINDEX}"` +
    (hadCanonical ? ", canonical removed" : ", canonical already absent")
);
