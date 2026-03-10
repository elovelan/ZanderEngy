import { describe, it, expect } from 'vitest';
import { shellEscape, buildAddDirFlags, buildQuickActionDirs } from './shell';

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
