type QueryValue = string | string[] | undefined;

type VercelLikeRequest = {
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, QueryValue>;
};

type VercelLikeResponse = {
  status: (code: number) => VercelLikeResponse;
  setHeader: (name: string, value: string) => void;
  send: (body: string) => void;
};

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

function normalizePath(rawPath: string): string {
  const cleaned = rawPath.trim();
  if (!cleaned) {
    return '/';
  }

  return cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
}

function titleForPath(path: string): string {
  if (path === '/' || path === '/index.html') {
    return 'Wheelr - Free Wheel Online';
  }

  return `Wheelr Page: ${path}`;
}

function markdownForPath(path: string): string {
  const title = titleForPath(path);

  return [
    '---',
    `title: ${title}`,
    `path: ${path}`,
    'canonical: https://www.wheelr.xyz/',
    '---',
    '',
    `# ${title}`,
    '',
    'Wheelr is a free online wheel and random picker.',
    'This markdown response is provided for agent-friendly content negotiation.',
    '',
    '## Main Features',
    '- Customizable wheel colors and themes',
    '- Sound effects and winner animations',
    '- Multiple wheel views and layouts',
    '- Local storage persistence',
    '',
    'Visit the HTML experience in a browser for the full interactive app.'
  ].join('\n') + '\n';
}

function estimateTokens(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words * 1.33));
}

export default function handler(req: VercelLikeRequest, res: VercelLikeResponse): void {
  const path = normalizePath(firstQueryValue(req.query?.path));
  const markdown = markdownForPath(path);

  res.status(200);
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Vary', 'Accept');
  res.setHeader('X-Markdown-Tokens', String(estimateTokens(markdown)));
  res.send(markdown);
}
