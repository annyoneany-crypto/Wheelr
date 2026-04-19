type QueryValue = string | string[] | undefined;

type VercelLikeRequest = {
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, QueryValue>;
};

type VercelLikeResponse = {
  status: (code: number) => VercelLikeResponse;
  setHeader: (name: string, value: string) => void;
  send: (body: string) => void;
};

const TITLE_REGEX = /<title>([\s\S]*?)<\/title>/i;
const META_DESCRIPTION_REGEX =
  /<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']\s*\/?>(?:<\/meta>)?/i;
const CANONICAL_REGEX =
  /<link\s+rel=["']canonical["']\s+href=["']([\s\S]*?)["']\s*\/?>(?:<\/link>)?/i;
const MAIN_TEXT_REGEX = /<main\b[^>]*>([\s\S]*?)<\/main>/i;
const BODY_TEXT_REGEX = /<body\b[^>]*>([\s\S]*?)<\/body>/i;

function decodeEntities(input: string): string {
  return input
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function htmlToPlainText(input: string): string {
  const withoutNonContent = input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ');

  const withBreaks = withoutNonContent
    .replace(/<\/(p|div|section|article|li|h1|h2|h3|h4|h5|h6|br)>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '- ');

  const withoutTags = withBreaks.replace(/<[^>]+>/g, ' ');

  return decodeEntities(withoutTags)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function tokenEstimate(markdown: string): number {
  if (!markdown.trim()) {
    return 0;
  }

  const words = markdown.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words * 1.33));
}

function firstQueryValue(value: QueryValue): string {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];
    return typeof first === 'string' ? first : '';
  }

  return '';
}

function readPathFromRequest(query: Record<string, QueryValue> | undefined): string {
  const negotiatedPath = firstQueryValue(query?.path)?.trim();
  if (!negotiatedPath) {
    return '/';
  }

  return negotiatedPath.startsWith('/') ? negotiatedPath : `/${negotiatedPath}`;
}

function buildMarkdownPage(options: {
  path: string;
  title: string;
  description: string;
  canonical: string;
  content: string;
}): string {
  const lines: string[] = [];

  lines.push('---');
  lines.push(`title: ${options.title || 'Wheelr'}`);
  lines.push(`path: ${options.path}`);
  if (options.canonical) {
    lines.push(`canonical: ${options.canonical}`);
  }
  lines.push('---');
  lines.push('');
  lines.push(`# ${options.title || 'Wheelr'}`);
  lines.push('');

  if (options.description) {
    lines.push(options.description);
    lines.push('');
  }

  if (options.content) {
    lines.push(options.content);
  } else {
    lines.push('Interactive giveaway wheel web app.');
  }

  return lines.join('\n').trimEnd() + '\n';
}

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse): Promise<void> {
  const host = typeof req.headers.host === 'string' ? req.headers.host : 'localhost';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const requestUrl = new URL(req.url ?? '/', `${protocol}://${host}`);
  const originalPath = readPathFromRequest(req.query);

  if (originalPath.startsWith('/api/')) {
    const markdown = '# Wheelr Markdown Endpoint\n\nThis endpoint serves negotiated markdown responses.\n';

    res.status(200);
    res.setHeader('content-type', 'text/markdown; charset=utf-8');
    res.setHeader('vary', 'Accept');
    res.setHeader('x-markdown-tokens', String(tokenEstimate(markdown)));
    res.setHeader('x-markdown-source', 'vercel-function');
    res.send(markdown);
    return;
  }

  const targetUrl = new URL(originalPath, requestUrl.origin);
  const originalQuery = firstQueryValue(req.query?.query);
  if (originalQuery) {
    targetUrl.search = originalQuery.startsWith('?') ? originalQuery : `?${originalQuery}`;
  }

  const upstreamResponse = await fetch(targetUrl.toString(), {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'x-agent-markdown-source': '1'
    }
  });

  const html = await upstreamResponse.text();
  const title = html.match(TITLE_REGEX)?.[1]?.trim() ?? 'Wheelr';
  const description = html.match(META_DESCRIPTION_REGEX)?.[1]?.trim() ?? '';
  const canonical = html.match(CANONICAL_REGEX)?.[1]?.trim() ?? '';
  const mainContent = html.match(MAIN_TEXT_REGEX)?.[1] ?? html.match(BODY_TEXT_REGEX)?.[1] ?? '';
  const content = htmlToPlainText(mainContent);
  const markdown = buildMarkdownPage({
    path: originalPath,
    title,
    description,
    canonical,
    content
  });

  res.status(upstreamResponse.status);
  res.setHeader('content-type', 'text/markdown; charset=utf-8');
  res.setHeader('vary', 'Accept');
  res.setHeader('x-markdown-tokens', String(tokenEstimate(markdown)));
  res.setHeader('x-markdown-source', 'vercel-function');
  res.send(markdown);
}