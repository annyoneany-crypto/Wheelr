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

function readPathFromRequest(url: URL): string {
  const negotiatedPath = url.searchParams.get('path')?.trim();
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

export default async function handler(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  const originalPath = readPathFromRequest(requestUrl);

  if (originalPath.startsWith('/api/')) {
    const markdown = '# Wheelr Markdown Endpoint\n\nThis endpoint serves negotiated markdown responses.\n';

    return new Response(markdown, {
      status: 200,
      headers: {
        'content-type': 'text/markdown; charset=utf-8',
        vary: 'Accept',
        'x-markdown-tokens': String(tokenEstimate(markdown)),
        'x-markdown-source': 'vercel-function'
      }
    });
  }

  const targetUrl = new URL(originalPath, requestUrl.origin);
  targetUrl.search = requestUrl.searchParams.get('query') ?? '';

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

  return new Response(markdown, {
    status: upstreamResponse.status,
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      vary: 'Accept',
      'x-markdown-tokens': String(tokenEstimate(markdown)),
      'x-markdown-source': 'vercel-function'
    }
  });
}