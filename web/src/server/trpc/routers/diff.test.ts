import { describe, it, expect, afterEach } from 'vitest';
import { appRouter } from '../root';
import { setupTestDb, type TestContext } from '../test-helpers';

describe('diff router', () => {
  let ctx: TestContext;

  afterEach(() => {
    ctx?.cleanup();
  });

  describe('getStatus', () => {
    it('throws when no daemon is connected', async () => {
      ctx = setupTestDb();
      const caller = appRouter.createCaller({ state: ctx.state });

      await expect(caller.diff.getStatus({ repoDir: '/tmp/repo' })).rejects.toThrow(
        'No daemon connected',
      );
    });
  });

  describe('getFileDiff', () => {
    it('throws when no daemon is connected', async () => {
      ctx = setupTestDb();
      const caller = appRouter.createCaller({ state: ctx.state });

      await expect(
        caller.diff.getFileDiff({ repoDir: '/tmp/repo', filePath: 'file.txt' }),
      ).rejects.toThrow('No daemon connected');
    });
  });

  describe('getLog', () => {
    it('throws when no daemon is connected', async () => {
      ctx = setupTestDb();
      const caller = appRouter.createCaller({ state: ctx.state });

      await expect(caller.diff.getLog({ repoDir: '/tmp/repo' })).rejects.toThrow(
        'No daemon connected',
      );
    });
  });

  describe('getCommitDiff', () => {
    it('throws when no daemon is connected', async () => {
      ctx = setupTestDb();
      const caller = appRouter.createCaller({ state: ctx.state });

      await expect(
        caller.diff.getCommitDiff({ repoDir: '/tmp/repo', commitHash: 'abc123' }),
      ).rejects.toThrow('No daemon connected');
    });
  });

  describe('getBranchDiff', () => {
    it('throws when no daemon is connected', async () => {
      ctx = setupTestDb();
      const caller = appRouter.createCaller({ state: ctx.state });

      await expect(
        caller.diff.getBranchDiff({ repoDir: '/tmp/repo', base: 'origin/main' }),
      ).rejects.toThrow('No daemon connected');
    });
  });
});
