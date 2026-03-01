import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { appRouter } from '../root';
import { setupTestDb, type TestContext } from '../test-helpers';

describe('comment router', () => {
  let ctx: TestContext;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(async () => {
    ctx = setupTestDb();
    caller = appRouter.createCaller({ state: ctx.state });
    await caller.workspace.create({ name: 'Test WS' });
  });

  afterEach(() => {
    ctx.cleanup();
  });

  describe('create', () => {
    it('should create a comment with anchors', async () => {
      const comment = await caller.comment.create({
        workspaceSlug: 'test-ws',
        documentPath: 'specs/1_auth/spec.md',
        content: 'Needs more detail',
        anchorStart: 10,
        anchorEnd: 25,
      });

      expect(comment.content).toBe('Needs more detail');
      expect(comment.documentPath).toBe('specs/1_auth/spec.md');
      expect(comment.anchorStart).toBe(10);
      expect(comment.anchorEnd).toBe(25);
      expect(comment.resolved).toBe(false);
    });

    it('should create a comment without anchors', async () => {
      const comment = await caller.comment.create({
        workspaceSlug: 'test-ws',
        documentPath: 'specs/1_auth/spec.md',
        content: 'General feedback',
      });
      expect(comment.anchorStart).toBeNull();
      expect(comment.anchorEnd).toBeNull();
    });

    it('should reject unknown workspace', async () => {
      await expect(
        caller.comment.create({
          workspaceSlug: 'nope',
          documentPath: 'x',
          content: 'y',
        }),
      ).rejects.toThrow('not found');
    });
  });

  describe('list', () => {
    it('should return comments ordered by anchorStart', async () => {
      await caller.comment.create({
        workspaceSlug: 'test-ws',
        documentPath: 'spec.md',
        content: 'Second',
        anchorStart: 20,
      });
      await caller.comment.create({
        workspaceSlug: 'test-ws',
        documentPath: 'spec.md',
        content: 'First',
        anchorStart: 5,
      });

      const result = await caller.comment.list({
        workspaceSlug: 'test-ws',
        documentPath: 'spec.md',
      });
      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('First');
      expect(result[1].content).toBe('Second');
    });

    it('should filter by documentPath', async () => {
      await caller.comment.create({
        workspaceSlug: 'test-ws',
        documentPath: 'spec-a.md',
        content: 'A',
      });
      await caller.comment.create({
        workspaceSlug: 'test-ws',
        documentPath: 'spec-b.md',
        content: 'B',
      });

      const result = await caller.comment.list({
        workspaceSlug: 'test-ws',
        documentPath: 'spec-a.md',
      });
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('A');
    });
  });

  describe('update', () => {
    it('should update comment content', async () => {
      const comment = await caller.comment.create({
        workspaceSlug: 'test-ws',
        documentPath: 'spec.md',
        content: 'Original',
      });

      const updated = await caller.comment.update({
        workspaceSlug: 'test-ws',
        id: comment.id,
        content: 'Updated',
      });
      expect(updated.content).toBe('Updated');
    });

    it('should reject if comment belongs to another workspace', async () => {
      await caller.workspace.create({ name: 'Other WS' });
      const comment = await caller.comment.create({
        workspaceSlug: 'test-ws',
        documentPath: 'spec.md',
        content: 'Test',
      });

      await expect(
        caller.comment.update({
          workspaceSlug: 'other-ws',
          id: comment.id,
          content: 'Hacked',
        }),
      ).rejects.toThrow('belongs to another workspace');
    });

    it('should throw NOT_FOUND for missing comment', async () => {
      await expect(
        caller.comment.update({
          workspaceSlug: 'test-ws',
          id: 999,
          content: 'X',
        }),
      ).rejects.toThrow('not found');
    });
  });

  describe('resolve / unresolve', () => {
    it('should resolve and unresolve a comment', async () => {
      const comment = await caller.comment.create({
        workspaceSlug: 'test-ws',
        documentPath: 'spec.md',
        content: 'Fix this',
      });

      const resolved = await caller.comment.resolve({
        workspaceSlug: 'test-ws',
        id: comment.id,
      });
      expect(resolved.resolved).toBe(true);

      const unresolved = await caller.comment.unresolve({
        workspaceSlug: 'test-ws',
        id: comment.id,
      });
      expect(unresolved.resolved).toBe(false);
    });

    it('should reject resolve for wrong workspace', async () => {
      await caller.workspace.create({ name: 'Other WS' });
      const comment = await caller.comment.create({
        workspaceSlug: 'test-ws',
        documentPath: 'spec.md',
        content: 'Test',
      });

      await expect(
        caller.comment.resolve({ workspaceSlug: 'other-ws', id: comment.id }),
      ).rejects.toThrow('belongs to another workspace');
    });
  });

  describe('delete', () => {
    it('should delete a comment', async () => {
      const comment = await caller.comment.create({
        workspaceSlug: 'test-ws',
        documentPath: 'spec.md',
        content: 'Delete me',
      });

      await caller.comment.delete({ workspaceSlug: 'test-ws', id: comment.id });

      const result = await caller.comment.list({
        workspaceSlug: 'test-ws',
        documentPath: 'spec.md',
      });
      expect(result).toHaveLength(0);
    });

    it('should reject delete for wrong workspace', async () => {
      await caller.workspace.create({ name: 'Other WS' });
      const comment = await caller.comment.create({
        workspaceSlug: 'test-ws',
        documentPath: 'spec.md',
        content: 'Test',
      });

      await expect(
        caller.comment.delete({ workspaceSlug: 'other-ws', id: comment.id }),
      ).rejects.toThrow('belongs to another workspace');
    });

    it('should throw NOT_FOUND for missing comment', async () => {
      await expect(
        caller.comment.delete({ workspaceSlug: 'test-ws', id: 999 }),
      ).rejects.toThrow('not found');
    });
  });
});
