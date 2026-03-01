import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as schema from './schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createTestDb() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('journal_mode = WAL');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(__dirname, 'migrations') });
  return { db, sqlite };
}

describe('Database Schema', () => {
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let sqlite: Database.Database;

  beforeAll(() => {
    const result = createTestDb();
    db = result.db;
    sqlite = result.sqlite;
  });

  afterAll(() => {
    sqlite.close();
  });

  describe('workspaces', () => {
    it('should create a workspace', () => {
      const result = db
        .insert(schema.workspaces)
        .values({ name: 'Test Workspace', slug: 'test-workspace' })
        .returning()
        .get();

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Test Workspace');
      expect(result.slug).toBe('test-workspace');
      expect(result.createdAt).toBeDefined();
    });

    it('should enforce unique slug', () => {
      expect(() =>
        db.insert(schema.workspaces).values({ name: 'Another', slug: 'test-workspace' }).run(),
      ).toThrow();
    });
  });

  describe('projects', () => {
    it('should create a project linked to a workspace', () => {
      const workspace = db
        .insert(schema.workspaces)
        .values({ name: 'Project WS', slug: 'project-ws' })
        .returning()
        .get();

      const project = db
        .insert(schema.projects)
        .values({
          workspaceId: workspace.id,
          name: 'Default',
          slug: 'default',
          isDefault: true,
        })
        .returning()
        .get();

      expect(project.workspaceId).toBe(workspace.id);
      expect(project.isDefault).toBe(true);
      expect(project.status).toBe('planning');
    });

    it('should cascade delete projects when workspace is deleted', () => {
      const ws = db
        .insert(schema.workspaces)
        .values({ name: 'Cascade WS', slug: 'cascade-ws' })
        .returning()
        .get();

      db.insert(schema.projects)
        .values({ workspaceId: ws.id, name: 'P1', slug: 'p1' })
        .run();

      db.delete(schema.workspaces).where(eq(schema.workspaces.id, ws.id)).run();

      const remaining = db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.workspaceId, ws.id))
        .all();

      expect(remaining).toHaveLength(0);
    });
  });

  describe('milestones', () => {
    it('should create a milestone with default values', () => {
      const ws = db
        .insert(schema.workspaces)
        .values({ name: 'MS WS', slug: 'ms-ws' })
        .returning()
        .get();

      const proj = db
        .insert(schema.projects)
        .values({ workspaceId: ws.id, name: 'MS Project', slug: 'ms-proj' })
        .returning()
        .get();

      const milestone = db
        .insert(schema.milestones)
        .values({ projectId: proj.id, title: 'M1 Foundation' })
        .returning()
        .get();

      expect(milestone.status).toBe('planned');
      expect(milestone.sortOrder).toBe(0);
      expect(milestone.scope).toBeNull();
    });
  });

  describe('task_groups', () => {
    it('should create a task group with JSON repos', () => {
      const ws = db
        .insert(schema.workspaces)
        .values({ name: 'TG WS', slug: 'tg-ws' })
        .returning()
        .get();

      const proj = db
        .insert(schema.projects)
        .values({ workspaceId: ws.id, name: 'TG Project', slug: 'tg-proj' })
        .returning()
        .get();

      const ms = db
        .insert(schema.milestones)
        .values({ projectId: proj.id, title: 'TG Milestone' })
        .returning()
        .get();

      const group = db
        .insert(schema.taskGroups)
        .values({
          milestoneId: ms.id,
          name: 'Frontend Group',
          repos: ['/repo/web', '/repo/common'],
        })
        .returning()
        .get();

      expect(group.repos).toEqual(['/repo/web', '/repo/common']);
      expect(group.status).toBe('planned');
    });
  });

  describe('tasks', () => {
    it('should create a task with nullable relations', () => {
      const task = db
        .insert(schema.tasks)
        .values({
          title: 'Standalone task',
          description: 'A task without project or milestone',
        })
        .returning()
        .get();

      expect(task.projectId).toBeNull();
      expect(task.milestoneId).toBeNull();
      expect(task.taskGroupId).toBeNull();
      expect(task.status).toBe('todo');
      expect(task.type).toBe('human');
      expect(task.dependencies).toEqual([]);
    });

    it('should store dependencies as JSON array', () => {
      const task = db
        .insert(schema.tasks)
        .values({
          title: 'Dependent task',
          dependencies: [1, 2, 3],
        })
        .returning()
        .get();

      expect(task.dependencies).toEqual([1, 2, 3]);
    });
  });

  describe('agent_sessions', () => {
    it('should create a session with unique session_id', () => {
      const session = db
        .insert(schema.agentSessions)
        .values({ sessionId: 'sess-001' })
        .returning()
        .get();

      expect(session.status).toBe('active');
      expect(session.state).toBeNull();
    });

    it('should enforce unique session_id', () => {
      db.insert(schema.agentSessions).values({ sessionId: 'sess-unique' }).run();

      expect(() =>
        db.insert(schema.agentSessions).values({ sessionId: 'sess-unique' }).run(),
      ).toThrow();
    });
  });

  describe('fleeting_memories', () => {
    it('should create a fleeting memory with defaults', () => {
      const ws = db
        .insert(schema.workspaces)
        .values({ name: 'Mem WS', slug: 'mem-ws' })
        .returning()
        .get();

      const memory = db
        .insert(schema.fleetingMemories)
        .values({
          workspaceId: ws.id,
          content: 'Remember this pattern',
        })
        .returning()
        .get();

      expect(memory.type).toBe('capture');
      expect(memory.source).toBe('agent');
      expect(memory.promoted).toBe(false);
    });
  });

  describe('project_memories', () => {
    it('should create a project memory with confidence', () => {
      const ws = db
        .insert(schema.workspaces)
        .values({ name: 'PM WS', slug: 'pm-ws' })
        .returning()
        .get();

      const proj = db
        .insert(schema.projects)
        .values({ workspaceId: ws.id, name: 'PM Project', slug: 'pm-proj' })
        .returning()
        .get();

      const memory = db
        .insert(schema.projectMemories)
        .values({
          projectId: proj.id,
          content: 'Use event sourcing for audit trail',
          type: 'decision',
          confidence: 0.9,
        })
        .returning()
        .get();

      expect(memory.type).toBe('decision');
      expect(memory.confidence).toBe(0.9);
    });
  });

  describe('plan_content', () => {
    it('should create plan content linked to a milestone', () => {
      const ws = db
        .insert(schema.workspaces)
        .values({ name: 'Plan WS', slug: 'plan-ws' })
        .returning()
        .get();

      const proj = db
        .insert(schema.projects)
        .values({ workspaceId: ws.id, name: 'Plan Project', slug: 'plan-proj' })
        .returning()
        .get();

      const ms = db
        .insert(schema.milestones)
        .values({ projectId: proj.id, title: 'Plan Milestone' })
        .returning()
        .get();

      const plan = db
        .insert(schema.planContent)
        .values({ milestoneId: ms.id, content: '## Implementation Plan\n\nStep 1...' })
        .returning()
        .get();

      expect(plan.milestoneId).toBe(ms.id);
      expect(plan.taskId).toBeNull();
    });
  });

  describe('comments', () => {
    it('should create a comment with anchor positions', () => {
      const ws = db
        .insert(schema.workspaces)
        .values({ name: 'Comment WS', slug: 'comment-ws' })
        .returning()
        .get();

      const comment = db
        .insert(schema.comments)
        .values({
          workspaceId: ws.id,
          documentPath: 'specs/auth/spec.md',
          anchorStart: 10,
          anchorEnd: 25,
          content: 'Consider using JWT here',
        })
        .returning()
        .get();

      expect(comment.anchorStart).toBe(10);
      expect(comment.anchorEnd).toBe(25);
      expect(comment.resolved).toBe(false);
    });
  });
});
