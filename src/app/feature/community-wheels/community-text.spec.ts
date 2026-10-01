import { parseCommunityText, pickCommunityText } from './community-text';

describe('parseCommunityText', () => {
  it('splits paragraphs on blank lines and keeps single line breaks', () => {
    const blocks = parseCommunityText(`
      First line
      second line

      Next paragraph
    `);
    expect(blocks).toEqual([
      {
        kind: 'paragraph',
        lines: [[{ text: 'First line', bold: false }], [{ text: 'second line', bold: false }]],
      },
      { kind: 'paragraph', lines: [[{ text: 'Next paragraph', bold: false }]] },
    ]);
  });

  it('reads headings, lists and bold runs', () => {
    const blocks = parseCommunityText('## Who we are\n- **Live** every night\n- Giveaways\nAfter the list');
    expect(blocks).toEqual([
      { kind: 'heading', lines: [[{ text: 'Who we are', bold: false }]] },
      {
        kind: 'list',
        items: [
          [
            { text: 'Live', bold: true },
            { text: ' every night', bold: false },
          ],
          [{ text: 'Giveaways', bold: false }],
        ],
      },
      { kind: 'paragraph', lines: [[{ text: 'After the list', bold: false }]] },
    ]);
  });

  it('keeps an unmatched ** as text', () => {
    expect(parseCommunityText('a ** b')).toEqual([
      { kind: 'paragraph', lines: [[{ text: 'a ** b', bold: false }]] },
    ]);
  });
});

describe('pickCommunityText', () => {
  it('prefers the language, then English, then anything', () => {
    expect(pickCommunityText({ en: 'EN', it: 'IT' }, 'it')).toBe('IT');
    expect(pickCommunityText({ en: 'EN', it: 'IT' }, 'de')).toBe('EN');
    expect(pickCommunityText({ it: 'IT' }, 'de')).toBe('IT');
    expect(pickCommunityText('Same for all', 'zh')).toBe('Same for all');
  });

  it('treats missing or blank text as absent', () => {
    expect(pickCommunityText(undefined, 'en')).toBeUndefined();
    expect(pickCommunityText('   ', 'en')).toBeUndefined();
  });
});
