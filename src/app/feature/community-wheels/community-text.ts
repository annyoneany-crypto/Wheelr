/**
 * The free text of a community's info popup, written by hand per community in
 * `community-wheels.data.ts`.
 *
 * It is plain text with a few markdown-like conventions, turned into blocks the
 * template renders itself — never `innerHTML`, so nothing written here can
 * inject markup:
 *
 *   - a blank line starts a new paragraph; a single line break stays a line break
 *   - `## Title` on its own line is a heading
 *   - lines starting with `- ` form a bulleted list
 *   - `**words**` are bold
 *
 * Leading indentation is ignored, so the text can be indented to match the code.
 */

/** One language for every visitor, or one version per language (keyed by hreflang). */
export type CommunityText = string | Partial<Record<CommunityTextLanguage, string>>;

/** The site's languages, as `SiteLocale.hreflang`. */
export type CommunityTextLanguage = 'en' | 'it' | 'de' | 'fr' | 'es' | 'zh';

/** A run of text, bold or not. */
export interface CommunityTextSpan {
  text: string;
  bold: boolean;
}

/** A line of spans; consecutive lines of a paragraph are separated by a line break. */
export type CommunityTextLine = readonly CommunityTextSpan[];

export type CommunityTextBlock =
  | { kind: 'heading'; lines: readonly CommunityTextLine[] }
  | { kind: 'paragraph'; lines: readonly CommunityTextLine[] }
  | { kind: 'list'; items: readonly CommunityTextLine[] };

/**
 * The version for `language`, else English, else whichever exists. Undefined
 * when there is no text at all, so the caller can fall back to its default.
 */
export function pickCommunityText(
  text: CommunityText | undefined,
  language: string,
): string | undefined {
  if (text === undefined || typeof text === 'string') {
    return text?.trim() ? text : undefined;
  }
  const versions = text as Record<string, string | undefined>;
  const found = versions[language] ?? versions['en'] ?? Object.values(versions).find(Boolean);
  return found?.trim() ? found : undefined;
}

export function parseCommunityText(source: string): CommunityTextBlock[] {
  const blocks: CommunityTextBlock[] = [];
  let paragraph: CommunityTextLine[] = [];
  let list: CommunityTextLine[] = [];

  const flush = () => {
    if (paragraph.length) {
      blocks.push({ kind: 'paragraph', lines: paragraph });
      paragraph = [];
    }
    if (list.length) {
      blocks.push({ kind: 'list', items: list });
      list = [];
    }
  };

  for (const rawLine of source.replace(/\r\n?/g, '\n').split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      flush();
    } else if (line.startsWith('## ')) {
      flush();
      blocks.push({ kind: 'heading', lines: [parseSpans(line.slice(3))] });
    } else if (line.startsWith('- ')) {
      if (paragraph.length) {
        flush();
      }
      list.push(parseSpans(line.slice(2)));
    } else {
      if (list.length) {
        flush();
      }
      paragraph.push(parseSpans(line));
    }
  }
  flush();
  return blocks;
}

/** Splits `**bold**` runs out of a line; an unmatched `**` is kept as text. */
function parseSpans(line: string): CommunityTextSpan[] {
  const spans: CommunityTextSpan[] = [];
  const pattern = /\*\*(.+?)\*\*/g;
  let last = 0;
  for (const match of line.matchAll(pattern)) {
    if (match.index > last) {
      spans.push({ text: line.slice(last, match.index), bold: false });
    }
    spans.push({ text: match[1], bold: true });
    last = match.index + match[0].length;
  }
  if (last < line.length) {
    spans.push({ text: line.slice(last), bold: false });
  }
  return spans;
}
