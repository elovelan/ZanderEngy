import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChildProcess } from 'node:child_process';

// Mock child_process: execFile must use node's custom promisify symbol
// so we mock the module to provide an execFile that already has a
// promisify-compatible __promisify__ method.
const mockExecFileAsync = vi.fn<(cmd: string, args: string[], opts: { maxBuffer: number }) => Promise<{ stdout: string; stderr: string }>>();

vi.mock('node:child_process', () => {
  const execFileFn = Object.assign(vi.fn(), {
    [Symbol.for('nodejs.util.promisify.custom')]: mockExecFileAsync,
    __promisify__: mockExecFileAsync,
  });
  return { execFile: execFileFn, spawn: vi.fn() };
});

// Must import after vi.mock
const { spawn } = await import('node:child_process');
const { ContainerManager } = await import('./manager.js');

const mockSpawn = spawn as unknown as ReturnType<typeof vi.fn>;

describe('ContainerManager', () => {
  let manager: InstanceType<typeof ContainerManager>;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new ContainerManager();
  });

  describe('up', () => {
    it('should return containerId on success', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({ outcome: 'success', containerId: 'abc123' }),
        stderr: '',
      });

      const result = await manager.up('/workspace/project');

      expect(result).toEqual({ containerId: 'abc123' });
      expect(mockExecFileAsync).toHaveBeenCalledWith(
        'devcontainer',
        ['up', '--workspace-folder', '/workspace/project'],
        expect.objectContaining({ maxBuffer: 10 * 1024 * 1024 }),
      );
    });

    it('should throw when outcome is not success', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({ outcome: 'error', message: 'build failed' }),
        stderr: '',
      });

      await expect(manager.up('/workspace/project')).rejects.toThrow('build failed');
    });

    it('should throw with default message when outcome fails without message', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({ outcome: 'error' }),
        stderr: '',
      });

      await expect(manager.up('/workspace/project')).rejects.toThrow('devcontainer up failed');
    });
  });

  describe('exec', () => {
    it('should spawn devcontainer exec with correct args', () => {
      const fakeProcess = { pid: 123 } as ChildProcess;
      mockSpawn.mockReturnValue(fakeProcess);

      const result = manager.exec('/workspace/project', 'bash', ['-c', 'echo hello']);

      expect(result).toBe(fakeProcess);
      expect(mockSpawn).toHaveBeenCalledWith(
        'devcontainer',
        ['exec', '--workspace-folder', '/workspace/project', 'bash', '-c', 'echo hello'],
        { stdio: ['pipe', 'pipe', 'pipe'] },
      );
    });

    it('should include --remote-env flags when env is provided', () => {
      const fakeProcess = { pid: 123 } as ChildProcess;
      mockSpawn.mockReturnValue(fakeProcess);

      manager.exec('/workspace/project', 'node', ['index.js'], {
        NODE_ENV: 'production',
        PORT: '3000',
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'devcontainer',
        [
          'exec',
          '--workspace-folder',
          '/workspace/project',
          '--remote-env',
          'NODE_ENV=production',
          '--remote-env',
          'PORT=3000',
          'node',
          'index.js',
        ],
        { stdio: ['pipe', 'pipe', 'pipe'] },
      );
    });

    it('should handle exec with no args or env', () => {
      const fakeProcess = { pid: 123 } as ChildProcess;
      mockSpawn.mockReturnValue(fakeProcess);

      manager.exec('/workspace/project', 'ls');

      expect(mockSpawn).toHaveBeenCalledWith(
        'devcontainer',
        ['exec', '--workspace-folder', '/workspace/project', 'ls'],
        { stdio: ['pipe', 'pipe', 'pipe'] },
      );
    });
  });

  describe('down', () => {
    it('should stop the container when running', async () => {
      // First call: status check (devcontainer up --expect-existing-container)
      // Second call: docker stop
      mockExecFileAsync
        .mockResolvedValueOnce({
          stdout: JSON.stringify({ outcome: 'success', containerId: 'abc123' }),
          stderr: '',
        })
        .mockResolvedValueOnce({ stdout: '', stderr: '' });

      await manager.down('/workspace/project');

      expect(mockExecFileAsync).toHaveBeenCalledTimes(2);
      expect(mockExecFileAsync).toHaveBeenLastCalledWith(
        'docker',
        ['stop', 'abc123'],
        expect.objectContaining({ maxBuffer: 10 * 1024 * 1024 }),
      );
    });

    it('should do nothing when container is not running', async () => {
      mockExecFileAsync.mockRejectedValue(new Error('no container'));

      await manager.down('/workspace/project');

      expect(mockExecFileAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('status', () => {
    it('should return running=true with containerId when container exists', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({ outcome: 'success', containerId: 'abc123' }),
        stderr: '',
      });

      const result = await manager.status('/workspace/project');

      expect(result).toEqual({ running: true, containerId: 'abc123' });
      expect(mockExecFileAsync).toHaveBeenCalledWith(
        'devcontainer',
        ['up', '--workspace-folder', '/workspace/project', '--expect-existing-container'],
        expect.objectContaining({ maxBuffer: 10 * 1024 * 1024 }),
      );
    });

    it('should return running=false when no container exists', async () => {
      mockExecFileAsync.mockRejectedValue(new Error('no container'));

      const result = await manager.status('/workspace/project');

      expect(result).toEqual({ running: false });
    });

    it('should return running=false when outcome is not success', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({ outcome: 'error' }),
        stderr: '',
      });

      const result = await manager.status('/workspace/project');

      expect(result).toEqual({ running: false });
    });
  });
});
