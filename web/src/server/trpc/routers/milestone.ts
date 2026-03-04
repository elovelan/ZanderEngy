import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc';
import { getDb } from '../../db/client';
import { milestones } from '../../db/schema';

const MILESTONE_STATUS_ORDER = ['planned', 'planning', 'active', 'complete'] as const;

function validateMilestoneStatusTransition(current: string, next: string): void {
  const currentIdx = MILESTONE_STATUS_ORDER.indexOf(
    current as (typeof MILESTONE_STATUS_ORDER)[number],
  );
  const nextIdx = MILESTONE_STATUS_ORDER.indexOf(next as (typeof MILESTONE_STATUS_ORDER)[number]);
  if (nextIdx !== currentIdx + 1) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `invalid milestone status transition: "${current}" → "${next}"`,
    });
  }
}

export const milestoneRouter = router({
  create: publicProcedure
    .input(
      z.object({
        projectId: z.number(),
        title: z.string().min(1),
        scope: z.string().optional(),
        sortOrder: z.number().optional(),
      }),
    )
    .mutation(({ input }) => {
      const db = getDb();
      return db
        .insert(milestones)
        .values({
          projectId: input.projectId,
          title: input.title,
          scope: input.scope,
          sortOrder: input.sortOrder ?? 0,
        })
        .returning()
        .get();
    }),

  list: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(milestones)
        .where(eq(milestones.projectId, input.projectId))
        .orderBy(asc(milestones.sortOrder))
        .all();
    }),

  get: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => {
    const db = getDb();
    const milestone = db.select().from(milestones).where(eq(milestones.id, input.id)).get();
    if (!milestone) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Milestone not found' });
    }
    return milestone;
  }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        status: z.enum(['planned', 'planning', 'active', 'complete']).optional(),
        scope: z.string().optional(),
        sortOrder: z.number().optional(),
      }),
    )
    .mutation(({ input }) => {
      const db = getDb();
      const { id, ...updates } = input;

      if (updates.status) {
        const existing = db.select().from(milestones).where(eq(milestones.id, id)).get();
        if (!existing) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Milestone not found' });
        }
        validateMilestoneStatusTransition(existing.status, updates.status);
      }

      const result = db
        .update(milestones)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(eq(milestones.id, id))
        .returning()
        .get();

      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Milestone not found' });
      }
      return result;
    }),

  reorder: publicProcedure
    .input(z.array(z.object({ id: z.number(), sortOrder: z.number() })))
    .mutation(({ input }) => {
      const db = getDb();
      for (const item of input) {
        db.update(milestones)
          .set({ sortOrder: item.sortOrder, updatedAt: new Date().toISOString() })
          .where(eq(milestones.id, item.id))
          .run();
      }
      return { success: true };
    }),

  delete: publicProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => {
    const db = getDb();
    db.delete(milestones).where(eq(milestones.id, input.id)).run();
    return { success: true };
  }),
});
