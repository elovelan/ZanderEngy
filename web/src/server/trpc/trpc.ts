import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import type { AppState } from './context';

const t = initTRPC.context<{ state: AppState }>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
