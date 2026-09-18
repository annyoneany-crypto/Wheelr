/**
 * Runs `ng extract-i18n` and fails on duplicate message ids.
 *
 * Angular only *warns* when the same `@@id` carries two different texts — and
 * then keeps one of them. Shared ids are how a page's FAQ JSON-LD stays tied to
 * its visible FAQ, so a warning here means the structured data and the page have
 * drifted apart and one of them would ship with the other's translation.
 */
import { spawnSync } from 'node:child_process';

const result = spawnSync('npx', ['ng', 'extract-i18n', '--output-path', 'src/locale'], {
  encoding: 'utf8',
  shell: true,
});

const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
process.stdout.write(output);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const duplicates = [...output.matchAll(/Duplicate messages with id "([^"]+)"/g)].map((match) => match[1]);

if (duplicates.length) {
  console.error(
    `\nextract-i18n: ${duplicates.length} id(s) used with different texts: ${duplicates.join(', ')}.\n` +
      'Make every occurrence of these ids identical (template and $localize alike) before translating.'
  );
  process.exit(1);
}
