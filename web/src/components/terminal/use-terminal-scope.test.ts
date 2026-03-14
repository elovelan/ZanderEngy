import { describe, it, expect } from 'vitest';
import { deriveScope } from './use-terminal-scope';

describe('deriveScope', () => {
  describe('project scope', () => {
    it('should use projectDir as workingDir and add ALL repos as --add-dir', () => {
      const scope = deriveScope('my-ws', '/home/user/.engy/my-ws', ['/repo1', '/repo2'], 'my-proj');
      expect(scope.scopeType).toBe('project');
      expect(scope.workingDir).toBe('/home/user/.engy/my-ws/projects/my-proj');
      expect(scope.command).toBe("claude --add-dir '/repo1' --add-dir '/repo2' --permission-mode acceptEdits");
    });

    it('should handle single repo', () => {
      const scope = deriveScope('ws', '/ws-dir', ['/repo1'], 'proj');
      expect(scope.workingDir).toBe('/ws-dir/projects/proj');
      expect(scope.command).toBe("claude --add-dir '/repo1' --permission-mode acceptEdits");
    });

    it('should handle no repos', () => {
      const scope = deriveScope('ws', '/ws-dir', [], 'proj');
      expect(scope.workingDir).toBe('/ws-dir/projects/proj');
      expect(scope.command).toBe('claude --permission-mode acceptEdits');
    });

    it('should set scopeLabel with project slug', () => {
      const scope = deriveScope('ws', '/ws-dir', [], 'my-proj');
      expect(scope.scopeLabel).toBe('project: my-proj');
    });
  });

  describe('workspace scope', () => {
    it('should use workspaceDir as workingDir and add ALL repos as --add-dir', () => {
      const scope = deriveScope('my-ws', '/home/user/.engy/my-ws', ['/repo1', '/repo2']);
      expect(scope.scopeType).toBe('workspace');
      expect(scope.workingDir).toBe('/home/user/.engy/my-ws');
      expect(scope.command).toBe("claude --add-dir '/repo1' --add-dir '/repo2' --permission-mode acceptEdits");
    });

    it('should handle no repos', () => {
      const scope = deriveScope('ws', '/ws-dir', []);
      expect(scope.workingDir).toBe('/ws-dir');
      expect(scope.command).toBe('claude --permission-mode acceptEdits');
    });

    it('should set scopeLabel with workspace slug', () => {
      const scope = deriveScope('my-ws', '/ws-dir', []);
      expect(scope.scopeLabel).toBe('my-ws');
    });
  });
});
