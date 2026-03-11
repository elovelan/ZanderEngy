import { describe, it, expect } from 'vitest';
import { generateDiffFeedback } from './feedback-markdown';

const REPO = '/Users/me/repo';

function makeThread(
  filePath: string,
  lineNumber: number,
  text: string,
  opts: { resolved?: boolean; codeLine?: string } = {},
) {
  return {
    documentPath: `diff://${REPO}/${filePath}`,
    resolved: opts.resolved ?? false,
    metadata: { lineNumber, codeLine: opts.codeLine ?? '' },
    comments: [{ body: text, userId: 'user', createdAt: new Date().toISOString() }],
  };
}

describe('generateDiffFeedback', () => {
  it('returns empty string for no threads', () => {
    expect(generateDiffFeedback([], REPO)).toBe('');
  });

  it('returns empty string when all threads are resolved', () => {
    const threads = [makeThread('src/app.ts', 10, 'Fix this', { resolved: true })];
    expect(generateDiffFeedback(threads, REPO)).toBe('');
  });

  it('generates markdown for a single file', () => {
    const threads = [
      makeThread('src/app.ts', 10, 'Add error handling', { codeLine: 'const x = foo()' }),
    ];
    const result = generateDiffFeedback(threads, REPO);

    expect(result).toContain('## Code Review Feedback');
    expect(result).toContain('1 comment across 1 file');
    expect(result).toContain('### src/app.ts');
    expect(result).toContain('**Line 10**');
    expect(result).toContain('const x = foo()');
    expect(result).toContain('Add error handling');
  });

  it('generates markdown for multiple files', () => {
    const threads = [
      makeThread('src/app.ts', 10, 'Fix this'),
      makeThread('src/utils.ts', 5, 'Rename this'),
      makeThread('src/app.ts', 20, 'Add test'),
    ];
    const result = generateDiffFeedback(threads, REPO);

    expect(result).toContain('3 comments across 2 files');
    expect(result).toContain('### src/app.ts');
    expect(result).toContain('### src/utils.ts');
  });

  it('sorts comments by line number within a file', () => {
    const threads = [
      makeThread('src/app.ts', 30, 'Third'),
      makeThread('src/app.ts', 10, 'First'),
      makeThread('src/app.ts', 20, 'Second'),
    ];
    const result = generateDiffFeedback(threads, REPO);

    const firstIdx = result.indexOf('First');
    const secondIdx = result.indexOf('Second');
    const thirdIdx = result.indexOf('Third');

    expect(firstIdx).toBeLessThan(secondIdx);
    expect(secondIdx).toBeLessThan(thirdIdx);
  });

  it('excludes resolved threads', () => {
    const threads = [
      makeThread('src/app.ts', 10, 'Keep this'),
      makeThread('src/app.ts', 20, 'Skip this', { resolved: true }),
    ];
    const result = generateDiffFeedback(threads, REPO);

    expect(result).toContain('Keep this');
    expect(result).not.toContain('Skip this');
    expect(result).toContain('1 comment across 1 file');
  });
});
