/**
 * Writes public/md/templates/<slug>.md, one per ready-made wheel.
 *
 * The landing pages are prerendered, so a crawler already gets real HTML for
 * them — but `llms-full.txt` is the single fetch most assistants actually pull,
 * and without these files it described five pages out of twenty-five. The copy
 * is read straight from `wheel-templates.seo.ts` so the mirror cannot drift from
 * what the page says.
 *
 * Run `npm run llms` (which calls this first).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://www.wheelr.xyz';
const outDir = join(root, 'public', 'md', 'templates');

const seoSource = await readFile(
  join(root, 'src/app/feature/wheel-templates/wheel-templates.seo.ts'),
  'utf8'
);
const dataSource = await readFile(
  join(root, 'src/app/feature/wheel-templates/wheel-templates.data.ts'),
  'utf8'
);

/** Single- or double-quoted TS string literal. */
const QUOTED = String.raw`'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"`;

function unquote(raw) {
  return raw.slice(1, -1).replace(/\\(.)/g, '$1');
}

/** Entries of each template, so the markdown lists what is actually on the wheel. */
function entriesById() {
  const byId = new Map();
  const blockRe = new RegExp(
    `id: '([a-z0-9-]+)',[\\s\\S]*?names: (\\[[\\s\\S]*?\\]),\\s*\\n\\s*palette:`,
    'g'
  );

  for (const match of dataSource.matchAll(blockRe)) {
    const names = [...match[2].matchAll(new RegExp(QUOTED, 'g'))].map((m) => unquote(m[0]));
    byId.set(match[1], names);
  }

  return byId;
}

/** One `'template-id': { ... }` block of TEMPLATE_SEO, parsed into the fields we render. */
function landingPages() {
  const pages = [];
  const blockRe =
    /'([a-z0-9-]+)': \{\s*\n\s*slug: '([a-z0-9-]+)',\s*\n\s*title: '([^']*)',\s*\n\s*description:\s*\n?\s*'([^']*)',\s*\n\s*heading: '([^']*)',\s*\n\s*intro:\s*\n?\s*'((?:[^'\\]|\\.)*)',\s*\n\s*sections: \[([\s\S]*?)\n\s*\],\s*\n\s*faq: \[([\s\S]*?)\n\s*\],/g;

  for (const match of seoSource.matchAll(blockRe)) {
    const sections = [
      ...match[7].matchAll(
        /heading: '((?:[^'\\]|\\.)*)',\s*\n\s*body:\s*\n?\s*'((?:[^'\\]|\\.)*)',/g
      ),
    ].map((s) => ({ heading: unquote(`'${s[1]}'`), body: unquote(`'${s[2]}'`) }));

    const faq = [
      ...match[8].matchAll(
        /question: '((?:[^'\\]|\\.)*)',\s*\n\s*answer:\s*\n?\s*'((?:[^'\\]|\\.)*)',/g
      ),
    ].map((f) => ({ question: unquote(`'${f[1]}'`), answer: unquote(`'${f[2]}'`) }));

    pages.push({
      id: match[1],
      slug: match[2],
      title: unquote(`'${match[3]}'`),
      description: unquote(`'${match[4]}'`),
      heading: unquote(`'${match[5]}'`),
      intro: unquote(`'${match[6]}'`),
      sections,
      faq,
    });
  }

  return pages;
}

const entries = entriesById();
const pages = landingPages();

if (!pages.length) {
  throw new Error('No landing pages parsed from wheel-templates.seo.ts — has its shape changed?');
}

const incomplete = pages.filter((p) => !p.sections.length || !p.faq.length || !entries.has(p.id));
if (incomplete.length) {
  throw new Error(
    `Incomplete parse for: ${incomplete.map((p) => p.slug).join(', ')} — check the regexes in this script.`
  );
}

const today = new Date().toISOString().slice(0, 10);
await mkdir(outDir, { recursive: true });

for (const page of pages) {
  const wheelEntries = entries.get(page.id) ?? [];

  const body = [
    '---',
    `title: ${page.title}`,
    `path: /templates/${page.slug}`,
    `canonical: ${ORIGIN}/templates/${page.slug}`,
    `updated: ${today}`,
    '---',
    '',
    `# ${page.heading}`,
    '',
    page.intro,
    '',
    '## On the wheel',
    '',
    wheelEntries.map((entry) => `- ${entry}`).join('\n'),
    '',
    `The wheel can be spun directly at ${ORIGIN}/templates/${page.slug} — no account, no`,
    'installation. Copying it creates your own editable wheel; the entries, colours,',
    'sounds and effects are all replaceable.',
    '',
    ...page.sections.flatMap((section) => [`## ${section.heading}`, '', section.body, '']),
    '## FAQ',
    '',
    ...page.faq.flatMap((entry) => [`**${entry.question}**`, '', entry.answer, '']),
    '## Links',
    '',
    `- This wheel: ${ORIGIN}/templates/${page.slug}`,
    `- All templates: ${ORIGIN}/templates`,
    `- Wheel app: ${ORIGIN}/`,
    '',
  ].join('\n');

  await writeFile(join(outDir, `${page.slug}.md`), body, 'utf8');
}

// Keep the agent index in step: the section below is regenerated wholesale, so
// llms.txt can never list a slug that no longer exists.
const llmsPath = join(root, 'public', 'llms.txt');
const llms = await readFile(llmsPath, 'utf8');
const heading = '## Ready-made wheels (one page each)';
const section = [
  heading,
  '',
  'Each of these is a working wheel on its own URL, spinnable without an account.',
  'Markdown for any of them: /md/templates/<slug>.md, or request the page with',
  '`Accept: text/markdown`.',
  '',
  ...pages.map((page) => `- [${page.heading}](${ORIGIN}/templates/${page.slug}): ${page.description}`),
  '',
].join('\n');

const updated = llms.includes(heading)
  ? llms.replace(new RegExp(`${heading}[\\s\\S]*?(?=\\n## |$)`), section)
  : llms.replace('\n## Optional\n', `\n${section}\n## Optional\n`);

await writeFile(llmsPath, updated, 'utf8');

console.log(`md/templates: ${pages.length} files written, llms.txt section refreshed`);
