import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc';
import { getDb } from '../../db/client';
import { agentSessions, tasks, taskGroups, projects, workspaces } from '../../db/schema';
import { dispatchExecutionStart, dispatchExecutionStop } from '../../ws/server';
import { getWorkspaceDir } from '../../engy-dir/init';
import { buildContextBlock, buildQuickActionDirs } from '../../../lib/shell';

// ── Helpers ──────────────────────────────────────────────────────────

function resolveProjectContext(projectId: number) {
  const db = getDb();
  const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });

  const workspace = db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, project.workspaceId))
    .get();
  if (!workspace) throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found' });

  const repos = Array.isArray(workspace.repos) ? (workspace.repos as string[]) : [];
  const projectDir = resolveProjectDir(workspace, project);
  const dirs = buildQuickActionDirs(repos, projectDir);

  return { project, workspace, repos, projectDir, dirs };
}

function resolveTaskContext(taskId: number) {
  const db = getDb();
  const task = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) throw new TRPCError({ code: 'NOT_FOUND', message: `Task ${taskId} not found` });
  if (!task.projectId)
    throw new TRPCError({ code: 'BAD_REQUEST', message: `Task ${taskId} has no project` });

  const { project, workspace, repos, projectDir, dirs } = resolveProjectContext(task.projectId);

  return { task, project, workspace, repos, projectDir, dirs };
}

function resolveProjectDir(
  workspace: { slug: string; docsDir: string | null },
  project: { projectDir: string | null; slug: string },
): string {
  const slug = project.projectDir ?? project.slug;
  return path.join(getWorkspaceDir(workspace), 'projects', slug);
}

function buildPromptForTask(
  task: { id: number; title: string; description: string | null },
  workspace: { slug: string; id: number; implementSkill: string | null },
  project: { slug: string; id: number },
  projectDir: string,
) {
  const taskSlug = `${workspace.slug}-T${task.id}`;
  const implementSkill = workspace.implementSkill || '/engy:implement';
  const prompt = `Use ${implementSkill} for ${taskSlug}`;
  const systemPrompt = buildContextBlock({
    workspace: { id: workspace.id, slug: workspace.slug },
    project: { id: project.id, slug: project.slug, dir: projectDir },
    repos: [],
  });
  return { prompt, systemPrompt };
}

function buildPromptForMilestone(
  milestoneRef: string,
  workspace: { slug: string; id: number },
  project: { slug: string; id: number },
  projectDir: string,
) {
  const prompt = `Use /engy:implement-milestone for ${milestoneRef} in project ${project.slug}`;
  const systemPrompt = buildContextBlock({
    workspace: { id: workspace.id, slug: workspace.slug },
    project: { id: project.id, slug: project.slug, dir: projectDir },
    repos: [],
  });
  return { prompt, systemPrompt };
}

function encodeWorktreePath(worktreePath: string): string {
  return worktreePath.replace(/^\//, '').replace(/\//g, '-');
}

// ── Router ───────────────────────────────────────────────────────────

export const executionRouter = router({
  startExecution: publicProcedure
    .input(
      z.object({
        scope: z.enum(['task', 'taskGroup', 'milestone']),
        id: z.union([z.number(), z.string()]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const sessionId = randomUUID();
      let prompt: string;
      let systemPrompt: string;
      let additionalDirs: string[] = [];
      let worktreePath: string | null = null;
      let taskId: number | null = null;
      let taskGroupId: number | null = null;

      if (input.scope === 'task') {
        const id = typeof input.id === 'string' ? parseInt(input.id, 10) : input.id;
        const { task, workspace, project, projectDir, dirs } = resolveTaskContext(id);
        additionalDirs = dirs.additionalDirs;
        worktreePath = dirs.workingDir ?? null;
        taskId = task.id;
        taskGroupId = task.taskGroupId;

        const built = buildPromptForTask(task, workspace, project, projectDir);
        prompt = built.prompt;
        systemPrompt = built.systemPrompt;
      } else if (input.scope === 'taskGroup') {
        const id = typeof input.id === 'string' ? parseInt(input.id, 10) : input.id;
        const group = db.select().from(taskGroups).where(eq(taskGroups.id, id)).get();
        if (!group)
          throw new TRPCError({ code: 'NOT_FOUND', message: `Task group ${id} not found` });

        const groupTasks = db.select().from(tasks).where(eq(tasks.taskGroupId, id)).all();
        const firstTask = groupTasks[0];
        if (!firstTask?.projectId)
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Task group has no tasks with a project',
          });

        const { workspace, project, repos, projectDir, dirs } = resolveProjectContext(
          firstTask.projectId,
        );
        additionalDirs = dirs.additionalDirs;
        worktreePath = dirs.workingDir ?? null;
        taskGroupId = group.id;

        const implementSkill = workspace.implementSkill || '/engy:implement';
        prompt = `Use ${implementSkill} for task group "${group.name}"`;
        systemPrompt = buildContextBlock({
          workspace: { id: workspace.id, slug: workspace.slug },
          project: { id: project.id, slug: project.slug, dir: projectDir },
          repos,
        });
      } else {
        const milestoneRef = String(input.id);
        const allTasks = db
          .select()
          .from(tasks)
          .where(eq(tasks.milestoneRef, milestoneRef))
          .all();
        const firstTask = allTasks[0];
        if (!firstTask?.projectId)
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Milestone "${milestoneRef}" has no tasks with a project`,
          });

        const { workspace, project, projectDir, dirs } = resolveProjectContext(
          firstTask.projectId,
        );
        additionalDirs = dirs.additionalDirs;
        worktreePath = dirs.workingDir ?? null;

        const built = buildPromptForMilestone(milestoneRef, workspace, project, projectDir);
        prompt = built.prompt;
        systemPrompt = built.systemPrompt;
      }

      db.insert(agentSessions)
        .values({
          sessionId,
          executionMode: input.scope === 'taskGroup' ? 'group' : input.scope,
          status: 'active',
          worktreePath,
          taskId,
          taskGroupId,
        })
        .run();

      const flags: Record<string, unknown> = {};
      if (systemPrompt) flags.appendSystemPrompt = systemPrompt;
      if (additionalDirs.length > 0) flags.addDir = additionalDirs;

      await dispatchExecutionStart(ctx.state, prompt, flags);

      return { sessionId };
    }),

  stopExecution: publicProcedure
    .input(z.object({ sessionId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const session = db
        .select()
        .from(agentSessions)
        .where(eq(agentSessions.sessionId, input.sessionId))
        .get();
      if (!session)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });

      await dispatchExecutionStop(ctx.state, input.sessionId);

      db.update(agentSessions)
        .set({ status: 'stopped', updatedAt: new Date().toISOString() })
        .where(eq(agentSessions.sessionId, input.sessionId))
        .run();

      return { success: true };
    }),

  retryExecution: publicProcedure
    .input(z.object({ sessionId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const original = db
        .select()
        .from(agentSessions)
        .where(eq(agentSessions.sessionId, input.sessionId))
        .get();
      if (!original)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });

      const newSessionId = randomUUID();

      db.insert(agentSessions)
        .values({
          sessionId: newSessionId,
          executionMode: original.executionMode,
          status: 'active',
          worktreePath: original.worktreePath,
          taskId: original.taskId,
          taskGroupId: original.taskGroupId,
        })
        .run();

      const flags: Record<string, unknown> = { resume: input.sessionId };

      await dispatchExecutionStart(ctx.state, '', flags);

      return { sessionId: newSessionId };
    }),

  getSessionFile: publicProcedure
    .input(z.object({ sessionId: z.string().min(1) }))
    .query(({ input }) => {
      const db = getDb();
      const session = db
        .select()
        .from(agentSessions)
        .where(eq(agentSessions.sessionId, input.sessionId))
        .get();
      if (!session)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });

      if (!session.worktreePath) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Session has no worktree path',
        });
      }

      const encoded = encodeWorktreePath(session.worktreePath);
      const sessionFilePath = path.join(
        os.homedir(),
        '.claude',
        'projects',
        encoded,
        `${input.sessionId}.jsonl`,
      );

      if (!fs.existsSync(sessionFilePath)) {
        return { entries: [] };
      }

      const content = fs.readFileSync(sessionFilePath, 'utf-8');
      const entries = content
        .split('\n')
        .filter((line) => line.trim() !== '')
        .map((line) => {
          try {
            return JSON.parse(line) as Record<string, unknown>;
          } catch {
            return null;
          }
        })
        .filter((entry): entry is Record<string, unknown> => entry !== null);

      return { entries };
    }),

  getActiveSessions: publicProcedure
    .input(z.object({ projectId: z.number().optional() }))
    .query(({ input }) => {
      const db = getDb();

      const allSessions = db.select().from(agentSessions).all();

      if (!input.projectId) {
        return allSessions;
      }

      const projectTasks = db
        .select()
        .from(tasks)
        .where(eq(tasks.projectId, input.projectId))
        .all();
      const projectTaskIds = new Set(projectTasks.map((t) => t.id));
      const projectTaskGroupIds = new Set(
        projectTasks.map((t) => t.taskGroupId).filter((id): id is number => id !== null),
      );

      return allSessions.filter(
        (s) =>
          (s.taskId !== null && projectTaskIds.has(s.taskId)) ||
          (s.taskGroupId !== null && projectTaskGroupIds.has(s.taskGroupId)),
      );
    }),
});
