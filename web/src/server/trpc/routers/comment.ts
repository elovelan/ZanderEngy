import { z } from 'zod';
import { eq, and, asc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc';
import { getDb } from '../../db/client';
import { comments, workspaces } from '../../db/schema';

function validateWorkspace(workspaceSlug: string) {
  const db = getDb();
  const ws = db.select().from(workspaces).where(eq(workspaces.slug, workspaceSlug)).get();
  if (!ws) {
    throw new TRPCError({ code: 'NOT_FOUND', message: `Workspace "${workspaceSlug}" not found` });
  }
  return ws;
}

function getOwnedComment(workspaceSlug: string, commentId: number) {
  const ws = validateWorkspace(workspaceSlug);
  const db = getDb();
  const comment = db.select().from(comments).where(eq(comments.id, commentId)).get();
  if (!comment) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Comment not found' });
  }
  if (comment.workspaceId !== ws.id) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Comment belongs to another workspace' });
  }
  return { ws, comment, db };
}

export const commentRouter = router({
  create: publicProcedure
    .input(
      z.object({
        workspaceSlug: z.string(),
        documentPath: z.string().min(1),
        content: z.string().min(1),
        anchorStart: z.number().int().nonnegative().optional(),
        anchorEnd: z.number().int().nonnegative().optional(),
      }),
    )
    .mutation(({ input }) => {
      const ws = validateWorkspace(input.workspaceSlug);
      const db = getDb();
      return db
        .insert(comments)
        .values({
          workspaceId: ws.id,
          documentPath: input.documentPath,
          content: input.content,
          anchorStart: input.anchorStart ?? null,
          anchorEnd: input.anchorEnd ?? null,
        })
        .returning()
        .get();
    }),

  list: publicProcedure
    .input(
      z.object({
        workspaceSlug: z.string(),
        documentPath: z.string(),
      }),
    )
    .query(({ input }) => {
      const ws = validateWorkspace(input.workspaceSlug);
      const db = getDb();
      return db
        .select()
        .from(comments)
        .where(and(eq(comments.workspaceId, ws.id), eq(comments.documentPath, input.documentPath)))
        .orderBy(asc(comments.anchorStart))
        .all();
    }),

  update: publicProcedure
    .input(
      z.object({
        workspaceSlug: z.string(),
        id: z.number(),
        content: z.string().min(1),
      }),
    )
    .mutation(({ input }) => {
      const { db } = getOwnedComment(input.workspaceSlug, input.id);
      return db
        .update(comments)
        .set({ content: input.content, updatedAt: new Date().toISOString() })
        .where(eq(comments.id, input.id))
        .returning()
        .get();
    }),

  resolve: publicProcedure
    .input(z.object({ workspaceSlug: z.string(), id: z.number() }))
    .mutation(({ input }) => {
      const { db } = getOwnedComment(input.workspaceSlug, input.id);
      return db
        .update(comments)
        .set({ resolved: true, updatedAt: new Date().toISOString() })
        .where(eq(comments.id, input.id))
        .returning()
        .get();
    }),

  unresolve: publicProcedure
    .input(z.object({ workspaceSlug: z.string(), id: z.number() }))
    .mutation(({ input }) => {
      const { db } = getOwnedComment(input.workspaceSlug, input.id);
      return db
        .update(comments)
        .set({ resolved: false, updatedAt: new Date().toISOString() })
        .where(eq(comments.id, input.id))
        .returning()
        .get();
    }),

  delete: publicProcedure
    .input(z.object({ workspaceSlug: z.string(), id: z.number() }))
    .mutation(({ input }) => {
      const { db } = getOwnedComment(input.workspaceSlug, input.id);
      db.delete(comments).where(eq(comments.id, input.id)).run();
      return { success: true };
    }),
});
