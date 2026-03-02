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

  describe('createThread', () => {
    it('should create a thread with initial comment', async () => {
      const thread = await caller.comment.createThread({
        workspaceSlug: 'test-ws',
        documentPath: 'specs/auth/spec.md',
        threadId: 'thread-1',
        initialComment: {
          id: 'comment-1',
          body: [{ type: 'paragraph', content: 'Needs clarification' }],
        },
      });

      expect(thread.id).toBe('thread-1');
      expect(thread.documentPath).toBe('specs/auth/spec.md');
      expect(thread.resolved).toBe(false);
      expect(thread.comments).toHaveLength(1);
      expect(thread.comments[0].id).toBe('comment-1');
      expect(thread.comments[0].userId).toBe('local-user');
    });

    it('should reject unknown workspace', async () => {
      await expect(
        caller.comment.createThread({
          workspaceSlug: 'nope',
          documentPath: 'x',
          threadId: 't1',
          initialComment: { id: 'c1', body: [] },
        }),
      ).rejects.toThrow('not found');
    });
  });

  describe('listThreads', () => {
    it('should return threads with comments for a document', async () => {
      await caller.comment.createThread({
        workspaceSlug: 'test-ws',
        documentPath: 'spec.md',
        threadId: 'thread-1',
        initialComment: { id: 'c1', body: [{ type: 'paragraph', content: 'First' }] },
      });
      await caller.comment.createThread({
        workspaceSlug: 'test-ws',
        documentPath: 'spec.md',
        threadId: 'thread-2',
        initialComment: { id: 'c2', body: [{ type: 'paragraph', content: 'Second' }] },
      });

      const threads = await caller.comment.listThreads({
        workspaceSlug: 'test-ws',
        documentPath: 'spec.md',
      });
      expect(threads).toHaveLength(2);
      expect(threads[0].comments).toHaveLength(1);
      expect(threads[1].comments).toHaveLength(1);
    });

    it('should filter by documentPath', async () => {
      await caller.comment.createThread({
        workspaceSlug: 'test-ws',
        documentPath: 'spec-a.md',
        threadId: 't1',
        initialComment: { id: 'c1', body: [] },
      });
      await caller.comment.createThread({
        workspaceSlug: 'test-ws',
        documentPath: 'spec-b.md',
        threadId: 't2',
        initialComment: { id: 'c2', body: [] },
      });

      const result = await caller.comment.listThreads({
        workspaceSlug: 'test-ws',
        documentPath: 'spec-a.md',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('t1');
    });

    it('should return empty array for no threads', async () => {
      const result = await caller.comment.listThreads({
        workspaceSlug: 'test-ws',
        documentPath: 'nonexistent.md',
      });
      expect(result).toHaveLength(0);
    });
  });

  describe('addComment', () => {
    it('should add a reply to an existing thread', async () => {
      await caller.comment.createThread({
        workspaceSlug: 'test-ws',
        documentPath: 'spec.md',
        threadId: 'thread-1',
        initialComment: { id: 'c1', body: [{ type: 'paragraph', content: 'Original' }] },
      });

      const reply = await caller.comment.addComment({
        workspaceSlug: 'test-ws',
        threadId: 'thread-1',
        commentId: 'c2',
        body: [{ type: 'paragraph', content: 'Reply' }],
      });

      expect(reply.id).toBe('c2');
      expect(reply.threadId).toBe('thread-1');

      const threads = await caller.comment.listThreads({
        workspaceSlug: 'test-ws',
        documentPath: 'spec.md',
      });
      expect(threads[0].comments).toHaveLength(2);
    });
  });

  describe('updateComment', () => {
    it('should update comment body', async () => {
      await caller.comment.createThread({
        workspaceSlug: 'test-ws',
        documentPath: 'spec.md',
        threadId: 't1',
        initialComment: { id: 'c1', body: [{ type: 'paragraph', content: 'Original' }] },
      });

      await caller.comment.updateComment({
        workspaceSlug: 'test-ws',
        threadId: 't1',
        commentId: 'c1',
        body: [{ type: 'paragraph', content: 'Updated' }],
      });

      const threads = await caller.comment.listThreads({
        workspaceSlug: 'test-ws',
        documentPath: 'spec.md',
      });
      const body = threads[0].comments[0].body as Array<{ content: string }>;
      expect(body[0].content).toBe('Updated');
    });
  });

  describe('deleteComment', () => {
    it('should soft-delete a comment', async () => {
      await caller.comment.createThread({
        workspaceSlug: 'test-ws',
        documentPath: 'spec.md',
        threadId: 't1',
        initialComment: { id: 'c1', body: [{ type: 'paragraph', content: 'Delete me' }] },
      });

      await caller.comment.deleteComment({
        workspaceSlug: 'test-ws',
        threadId: 't1',
        commentId: 'c1',
      });

      const threads = await caller.comment.listThreads({
        workspaceSlug: 'test-ws',
        documentPath: 'spec.md',
      });
      expect(threads[0].comments[0].deletedAt).toBeTruthy();
      expect(threads[0].comments[0].body).toBeNull();
    });
  });

  describe('deleteThread', () => {
    it('should delete thread and cascade to comments', async () => {
      await caller.comment.createThread({
        workspaceSlug: 'test-ws',
        documentPath: 'spec.md',
        threadId: 't1',
        initialComment: { id: 'c1', body: [] },
      });

      await caller.comment.deleteThread({
        workspaceSlug: 'test-ws',
        threadId: 't1',
      });

      const threads = await caller.comment.listThreads({
        workspaceSlug: 'test-ws',
        documentPath: 'spec.md',
      });
      expect(threads).toHaveLength(0);
    });
  });

  describe('resolveThread / unresolveThread', () => {
    it('should resolve and unresolve a thread', async () => {
      await caller.comment.createThread({
        workspaceSlug: 'test-ws',
        documentPath: 'spec.md',
        threadId: 't1',
        initialComment: { id: 'c1', body: [] },
      });

      const resolved = await caller.comment.resolveThread({
        workspaceSlug: 'test-ws',
        threadId: 't1',
      });
      expect(resolved.resolved).toBe(true);
      expect(resolved.resolvedBy).toBe('local-user');
      expect(resolved.resolvedAt).toBeTruthy();

      const unresolved = await caller.comment.unresolveThread({
        workspaceSlug: 'test-ws',
        threadId: 't1',
      });
      expect(unresolved.resolved).toBe(false);
      expect(unresolved.resolvedBy).toBeNull();
      expect(unresolved.resolvedAt).toBeNull();
    });
  });

  describe('addReaction / deleteReaction', () => {
    it('should add an emoji reaction to a comment', async () => {
      await caller.comment.createThread({
        workspaceSlug: 'test-ws',
        documentPath: 'spec.md',
        threadId: 't1',
        initialComment: { id: 'c1', body: [] },
      });

      await caller.comment.addReaction({
        workspaceSlug: 'test-ws',
        threadId: 't1',
        commentId: 'c1',
        emoji: '👍',
      });

      const threads = await caller.comment.listThreads({
        workspaceSlug: 'test-ws',
        documentPath: 'spec.md',
      });
      const reactions = threads[0].comments[0].reactions as Array<{
        emoji: string;
        userIds: string[];
      }>;
      expect(reactions).toHaveLength(1);
      expect(reactions[0].emoji).toBe('👍');
      expect(reactions[0].userIds).toContain('local-user');
    });

    it('should not duplicate user in reaction', async () => {
      await caller.comment.createThread({
        workspaceSlug: 'test-ws',
        documentPath: 'spec.md',
        threadId: 't1',
        initialComment: { id: 'c1', body: [] },
      });

      await caller.comment.addReaction({
        workspaceSlug: 'test-ws',
        threadId: 't1',
        commentId: 'c1',
        emoji: '👍',
      });
      await caller.comment.addReaction({
        workspaceSlug: 'test-ws',
        threadId: 't1',
        commentId: 'c1',
        emoji: '👍',
      });

      const threads = await caller.comment.listThreads({
        workspaceSlug: 'test-ws',
        documentPath: 'spec.md',
      });
      const reactions = threads[0].comments[0].reactions as Array<{
        emoji: string;
        userIds: string[];
      }>;
      expect(reactions[0].userIds).toHaveLength(1);
    });

    it('should remove a reaction', async () => {
      await caller.comment.createThread({
        workspaceSlug: 'test-ws',
        documentPath: 'spec.md',
        threadId: 't1',
        initialComment: { id: 'c1', body: [] },
      });

      await caller.comment.addReaction({
        workspaceSlug: 'test-ws',
        threadId: 't1',
        commentId: 'c1',
        emoji: '👍',
      });
      await caller.comment.deleteReaction({
        workspaceSlug: 'test-ws',
        threadId: 't1',
        commentId: 'c1',
        emoji: '👍',
      });

      const threads = await caller.comment.listThreads({
        workspaceSlug: 'test-ws',
        documentPath: 'spec.md',
      });
      const reactions = threads[0].comments[0].reactions as Array<{
        emoji: string;
        userIds: string[];
      }>;
      expect(reactions).toHaveLength(0);
    });
  });
});
