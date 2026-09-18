/**
 * Marks every `index.csr.html` noindex after the build — one per locale.
 *
 * Those shells are served for exactly two kinds of URL: shared wheels (`/:id`)
 * and anything that does not exist — every indexable route has its own
 * prerendered HTML. `SeoService` already sets `noindex` on those routes, but it
 * does so from JavaScript, so only a crawler that renders sees it; Bing and most
 * AI crawlers read the shell's own tags, which say `index, follow`.
 *
 * The canonical and the hreflang alternates go too: they describe the homepage
 * of that locale, and combining them with noindex sends contradictory signals.
 * The SPA sets the right ones at runtime for clients that execute it.
 *
 * Runs from `npm run build`; `vercel.json` pins the build command so the hosted
 * build cannot skip it.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const browserDir = join(root, 'dist/wheelr/browser');

const NOINDEX = 'noindex, follow';

/** Replaces exactly one tag, and refuses to silently do nothing. */
function replaceOnce(source, pattern, replacement, label, shell) {
  if (!pattern.test(source)) {
    throw new Error(`Could not find ${label} in ${shell} — refusing to ship an indexable shell.`);
  }

  return source.replace(pattern, replacement);
}

/**
 * The source locale's shell sits at the root; every other locale has its own in
 * the subdirectory Angular's `subPath` created. Missing one would leave that
 * language's shared wheels and unknown URLs indexable.
 */
async function shellPaths() {
  const entries = await readdir(browserDir, { withFileTypes: true });
  const candidates = [
    join(browserDir, 'index.csr.html'),
    ...entries
      .filter((entry) => entry.isDirectory() && /^[a-z]{2}(-[A-Za-z]{2,4})?$/.test(entry.name))
      .map((entry) => join(browserDir, entry.name, 'index.csr.html')),
  ];

  const found = [];
  for (const candidate of candidates) {
    try {
      await readFile(candidate, 'utf8');
      found.push(candidate);
    } catch {
      // A directory that only looks like a locale holds no shell; skip it.
    }
  }

  if (!found.length) {
    throw new Error(
      'No index.csr.html found under dist/wheelr/browser — has outputMode or the ' +
        'route render modes changed?'
    );
  }

  return found;
}

const shells = await shellPaths();

for (const shellPath of shells) {
  const shell = relative(browserDir, shellPath);
  let html = await readFile(shellPath, 'utf8');

  html = replaceOnce(
    html,
    /<meta name="robots" content="[^"]*">/,
    `<meta name="robots" content="${NOINDEX}">`,
    'the robots meta',
    shell
  );

  // A googlebot directive overrides the generic one for Google, so the two
  // always move together — the same trap SeoService has to avoid at runtime.
  html = replaceOnce(
    html,
    /<meta name="googlebot" content="[^"]*">/,
    `<meta name="googlebot" content="${NOINDEX}">`,
    'the googlebot meta',
    shell
  );

  // Tolerant, unlike the two above: a fresh build always carries these, but
  // running the script twice on the same output should not blow up.
  html = html.replace(/\s*<link rel="canonical" href="[^"]*">/, '');
  html = html.replace(/\s*<link rel="alternate" hreflang="[^"]*"[^>]*>/g, '');

  await writeFile(shellPath, html, 'utf8');
}

console.log(
  `index.csr.html (${shells.length} locale shells): robots + googlebot set to "${NOINDEX}", ` +
    'canonical and hreflang removed'
);
