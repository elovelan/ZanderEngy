import { describe, it, expect } from 'vitest';
import {
  shellEscape,
  buildAddDirFlags,
  buildRepoContext,
  buildClaudeCommand,
  buildQuickActionDirs,
} from './shell';

describe('shell utilities', () => {
  describe('shellEscape', () => {
    it('should return string unchanged when no single quotes', () => {
      expect(shellEscape('hello world')).toBe('hello world');
    });

    it('should escape single quotes', () => {
      expect(shellEscape("it's")).toBe("it'\\''s");
    });

    it('should escape multiple single quotes', () => {
      expect(shellEscape("it's a 'test'")).toBe("it'\\''s a '\\''test'\\''");
    });
  });

  describe('buildAddDirFlags', () => {
    it('should return empty string for empty array', () => {
      expect(buildAddDirFlags([])).toBe('');
    });

    it('should build single --add-dir flag', () => {
      expect(buildAddDirFlags(['/path/to/repo'])).toBe(" --add-dir '/path/to/repo'");
    });

    it('should build multiple --add-dir flags', () => {
      expect(buildAddDirFlags(['/repo1', '/repo2', '/repo3'])).toBe(
        " --add-dir '/repo1' --add-dir '/repo2' --add-dir '/repo3'",
      );
    });

    it('should escape single quotes in paths', () => {
      expect(buildAddDirFlags(["/path/it's"])).toBe(" --add-dir '/path/it'\\''s'");
    });
  });

  describe('buildRepoContext', () => {
    it('should return empty string for empty repos', () => {
      expect(buildRepoContext([])).toBe('');
    });

    it('should return singular label for single repo', () => {
      expect(buildRepoContext(['/Users/me/repo1'])).toBe('. Code repo: /Users/me/repo1');
    });

    it('should return plural label for multiple repos', () => {
      expect(buildRepoContext(['/Users/me/repo1', '/Users/me/repo2'])).toBe(
        '. Code repos: /Users/me/repo1, /Users/me/repo2',
      );
    });
  });

  describe('buildClaudeCommand', () => {
    it('should return base command with permission mode when no options', () => {
      expect(buildClaudeCommand()).toBe('claude --permission-mode acceptEdits');
    });

    it('should include prompt when provided', () => {
      expect(buildClaudeCommand({ prompt: 'Use /engy:plan to plan engy-T1' })).toBe(
        "claude 'Use /engy:plan to plan engy-T1' --permission-mode acceptEdits",
      );
    });

    it('should include add-dir flags when provided', () => {
      expect(buildClaudeCommand({ additionalDirs: ['/some/dir'] })).toBe(
        "claude --add-dir '/some/dir' --permission-mode acceptEdits",
      );
    });

    it('should include prompt and add-dir flags together', () => {
      expect(
        buildClaudeCommand({
          prompt: 'Use /engy:plan to plan engy-T1',
          additionalDirs: ['/some/dir'],
        }),
      ).toBe("claude 'Use /engy:plan to plan engy-T1' --add-dir '/some/dir' --permission-mode acceptEdits");
    });

    it('should escape single quotes in prompt', () => {
      expect(buildClaudeCommand({ prompt: "it's a test" })).toBe(
        "claude 'it'\\''s a test' --permission-mode acceptEdits",
      );
    });
  });

  describe('buildQuickActionDirs', () => {
    it('should use 1st repo as workingDir, projectDir + remaining repos as additionalDirs', () => {
      const result = buildQuickActionDirs(['/repo1', '/repo2', '/repo3'], '/project');
      expect(result.workingDir).toBe('/repo1');
      expect(result.additionalDirs).toEqual(['/project', '/repo2', '/repo3']);
    });

    it('should use projectDir as workingDir when no repos', () => {
      const result = buildQuickActionDirs([], '/project');
      expect(result.workingDir).toBe('/project');
      expect(result.additionalDirs).toEqual([]);
    });

    it('should not duplicate projectDir in additionalDirs when it equals 1st repo', () => {
      const result = buildQuickActionDirs(['/same-path', '/repo2'], '/same-path');
      expect(result.workingDir).toBe('/same-path');
      expect(result.additionalDirs).toEqual(['/repo2']);
    });

    it('should return undefined workingDir when no repos and no projectDir', () => {
      const result = buildQuickActionDirs([], null);
      expect(result.workingDir).toBeUndefined();
      expect(result.additionalDirs).toEqual([]);
    });

    it('should return undefined workingDir when no repos and projectDir is undefined', () => {
      const result = buildQuickActionDirs([]);
      expect(result.workingDir).toBeUndefined();
      expect(result.additionalDirs).toEqual([]);
    });

    it('should handle single repo with projectDir', () => {
      const result = buildQuickActionDirs(['/repo1'], '/project');
      expect(result.workingDir).toBe('/repo1');
      expect(result.additionalDirs).toEqual(['/project']);
    });

    it('should handle single repo without projectDir', () => {
      const result = buildQuickActionDirs(['/repo1'], null);
      expect(result.workingDir).toBe('/repo1');
      expect(result.additionalDirs).toEqual([]);
    });
  });
});
