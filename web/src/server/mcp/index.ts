import type { Server as HttpServer, IncomingMessage, ServerResponse } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { getDb, getEngyDir } from '../db/client.js';
import {
  workspaces,
  projects,
  tasks,
  milestones,
  taskGroups,
  fleetingMemories,
} from '../db/schema.js';
import { generateSlug } from '../trpc/utils.js';

// ── MCP Response Helpers ──────────────────────────────────────────

type McpToolResult = { content: Array<{ type: 'text'; text: string }>; isError?: boolean };

function mcpResult(data: unknown): McpToolResult {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] };
}

function mcpError(message: string): McpToolResult {
  return { content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }], isError: true };
}

function mcpText(text: string): McpToolResult {
  return { content: [{ type: 'text' as const, text }] };
}

// ── Singleton McpServer ────────────────────────────────────────────

let mcpInstance: McpServer | null = null;

export function getMcpServer(): McpServer {
  if (mcpInstance) return mcpInstance;

  const mcp = new McpServer(
    { name: 'engy', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  registerWorkspaceTools(mcp);
  registerProjectTools(mcp);
  registerTaskTools(mcp);
  registerMilestoneTools(mcp);
  registerTaskGroupTools(mcp);
  registerMemoryTools(mcp);
  registerFileTools(mcp);

  mcpInstance = mcp;
  return mcp;
}

export function resetMcpServer(): void {
  mcpInstance = null;
}

// ── HTTP Mount ─────────────────────────────────────────────────────

const activeSessions = new Map<string, SSEServerTransport>();

export function attachMCP(server: HttpServer): void {
  const mcp = getMcpServer();

  server.on('request', (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    if (url.pathname !== '/mcp') return;

    if (req.method === 'GET') {
      handleSseConnection(mcp, req, res);
    } else if (req.method === 'POST') {
      handlePostMessage(req, res);
    } else {
      res.writeHead(405).end('Method Not Allowed');
    }
  });
}

async function handleSseConnection(
  mcp: McpServer,
  _req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const transport = new SSEServerTransport('/mcp', res);
  activeSessions.set(transport.sessionId, transport);

  transport.onclose = () => {
    activeSessions.delete(transport.sessionId);
  };

  await mcp.connect(transport);
}

async function handlePostMessage(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const sessionId = url.searchParams.get('sessionId');

  if (!sessionId) {
    res.writeHead(400).end(JSON.stringify({ error: 'Missing sessionId query parameter' }));
    return;
  }

  const transport = activeSessions.get(sessionId);
  if (!transport) {
    res.writeHead(404).end(JSON.stringify({ error: 'Session not found' }));
    return;
  }

  await transport.handlePostMessage(req, res);
}

// ── Path Safety ────────────────────────────────────────────────────

function getAllowedRoots(): string[] {
  const roots = [getEngyDir()];

  try {
    const db = getDb();
    const allWorkspaces = db.select().from(workspaces).all();
    for (const ws of allWorkspaces) {
      const wsDir = path.join(getEngyDir(), ws.slug);
      const yamlPath = path.join(wsDir, 'workspace.yaml');
      if (fs.existsSync(yamlPath)) {
        const content = fs.readFileSync(yamlPath, 'utf-8');
        const repoLines = content.split('\n').filter((l) => l.trim().startsWith('- path:'));
        for (const line of repoLines) {
          const repoPath = line.replace(/.*- path:\s*/, '').trim();
          if (repoPath) roots.push(repoPath);
        }
      }
    }
  } catch {
    // DB might not be ready yet — only engy dir allowed
  }

  return roots;
}

export function isPathAllowed(targetPath: string): boolean {
  const resolved = path.resolve(targetPath);
  const roots = getAllowedRoots();
  return roots.some((root) => resolved.startsWith(path.resolve(root)));
}

// ── Tool Registration ──────────────────────────────────────────────

function registerWorkspaceTools(mcp: McpServer): void {
  mcp.tool(
    'createWorkspace',
    'Create a new workspace. Requires the client daemon for repo validation — will fail without it.',
    { name: z.string().describe('Workspace name') },
    async (_args) => {
      return mcpError(
        'createWorkspace requires the client daemon for repo path validation. Use the web UI or tRPC API with an active daemon connection.',
      );
    },
  );

  mcp.tool(
    'getWorkspaceConfig',
    'Get workspace configuration by slug',
    { slug: z.string().describe('Workspace slug') },
    async ({ slug }) => {
      const db = getDb();
      const workspace = db.select().from(workspaces).where(eq(workspaces.slug, slug)).get();
      if (!workspace) {
        return mcpError(`Workspace "${slug}" not found`);
      }

      const yamlPath = path.join(getEngyDir(), slug, 'workspace.yaml');
      const config = fs.existsSync(yamlPath) ? fs.readFileSync(yamlPath, 'utf-8') : null;

      return mcpResult({ workspace, config });
    },
  );

  mcp.tool('listWorkspaces', 'List all workspaces', {}, async () => {
    const db = getDb();
    return mcpResult(db.select().from(workspaces).all());
  });
}

function registerProjectTools(mcp: McpServer): void {
  mcp.tool(
    'createProject',
    'Create a new project within a workspace',
    {
      workspaceId: z.number().describe('Workspace ID'),
      name: z.string().describe('Project name'),
      specPath: z.string().optional().describe('Path to project specification'),
    },
    async ({ workspaceId, name, specPath }) => {
      const db = getDb();
      const slug = generateSlug(name);
      const project = db
        .insert(projects)
        .values({ workspaceId, name, slug, specPath })
        .returning()
        .get();
      return mcpResult(project);
    },
  );

  mcp.tool(
    'getProject',
    'Get a project by ID',
    { id: z.number().describe('Project ID') },
    async ({ id }) => {
      const db = getDb();
      const project = db.select().from(projects).where(eq(projects.id, id)).get();
      if (!project) return mcpError('Project not found');
      return mcpResult(project);
    },
  );

  mcp.tool(
    'updateProjectStatus',
    'Update a project status',
    {
      id: z.number().describe('Project ID'),
      status: z.enum(['planning', 'active', 'completing', 'archived']).describe('New status'),
    },
    async ({ id, status }) => {
      const db = getDb();
      const result = db
        .update(projects)
        .set({ status, updatedAt: new Date().toISOString() })
        .where(eq(projects.id, id))
        .returning()
        .get();
      if (!result) return mcpError('Project not found');
      return mcpResult(result);
    },
  );

  mcp.tool(
    'listProjects',
    'List all projects in a workspace',
    { workspaceId: z.number().describe('Workspace ID') },
    async ({ workspaceId }) => {
      const db = getDb();
      return mcpResult(
        db.select().from(projects).where(eq(projects.workspaceId, workspaceId)).all(),
      );
    },
  );
}

function registerTaskTools(mcp: McpServer): void {
  mcp.tool(
    'createTask',
    'Create a new task',
    {
      projectId: z.number().optional().describe('Project ID'),
      milestoneId: z.number().optional().describe('Milestone ID'),
      taskGroupId: z.number().optional().describe('Task group ID'),
      title: z.string().describe('Task title'),
      description: z.string().optional().describe('Task description'),
      type: z.enum(['ai', 'human']).default('human').describe('Task type'),
      importance: z.enum(['important', 'not_important']).default('not_important').describe('Importance level'),
      urgency: z.enum(['urgent', 'not_urgent']).default('not_urgent').describe('Urgency level'),
      dependencies: z.array(z.number()).default([]).describe('IDs of tasks this depends on'),
      specId: z.string().optional().describe('Specification ID'),
    },
    async (args) => {
      const db = getDb();
      const task = db.insert(tasks).values(args).returning().get();
      return mcpResult(task);
    },
  );

  mcp.tool(
    'updateTask',
    'Update an existing task',
    {
      id: z.number().describe('Task ID'),
      title: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New description'),
      status: z.enum(['todo', 'in_progress', 'review', 'done']).optional().describe('New status'),
      type: z.enum(['ai', 'human']).optional().describe('New type'),
      importance: z.enum(['important', 'not_important']).optional().describe('New importance'),
      urgency: z.enum(['urgent', 'not_urgent']).optional().describe('New urgency'),
      dependencies: z.array(z.number()).optional().describe('New dependencies'),
      milestoneId: z.number().nullable().optional().describe('New milestone ID'),
      taskGroupId: z.number().nullable().optional().describe('New task group ID'),
    },
    async ({ id, ...updates }) => {
      const db = getDb();
      const result = db
        .update(tasks)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(eq(tasks.id, id))
        .returning()
        .get();
      if (!result) return mcpError('Task not found');
      return mcpResult(result);
    },
  );

  mcp.tool(
    'listTasks',
    'List tasks, optionally filtered by project, milestone, or task group',
    {
      projectId: z.number().optional().describe('Filter by project ID'),
      milestoneId: z.number().optional().describe('Filter by milestone ID'),
      taskGroupId: z.number().optional().describe('Filter by task group ID'),
    },
    async ({ projectId, milestoneId, taskGroupId }) => {
      const db = getDb();
      const query = db.select().from(tasks);

      if (taskGroupId) return mcpResult(query.where(eq(tasks.taskGroupId, taskGroupId)).all());
      if (milestoneId) return mcpResult(query.where(eq(tasks.milestoneId, milestoneId)).all());
      if (projectId) return mcpResult(query.where(eq(tasks.projectId, projectId)).all());
      return mcpResult(query.all());
    },
  );

  mcp.tool(
    'getTask',
    'Get a task by ID',
    { id: z.number().describe('Task ID') },
    async ({ id }) => {
      const db = getDb();
      const task = db.select().from(tasks).where(eq(tasks.id, id)).get();
      if (!task) return mcpError('Task not found');
      return mcpResult(task);
    },
  );
}

function registerMilestoneTools(mcp: McpServer): void {
  mcp.tool(
    'createMilestone',
    'Create a new milestone within a project',
    {
      projectId: z.number().describe('Project ID'),
      title: z.string().describe('Milestone title'),
      scope: z.string().optional().describe('Milestone scope description'),
      sortOrder: z.number().optional().describe('Sort order'),
    },
    async ({ projectId, title, scope, sortOrder }) => {
      const db = getDb();
      const milestone = db
        .insert(milestones)
        .values({ projectId, title, scope, sortOrder: sortOrder ?? 0 })
        .returning()
        .get();
      return mcpResult(milestone);
    },
  );

  mcp.tool(
    'listMilestones',
    'List milestones for a project',
    { projectId: z.number().describe('Project ID') },
    async ({ projectId }) => {
      const db = getDb();
      return mcpResult(
        db.select().from(milestones).where(eq(milestones.projectId, projectId)).orderBy(asc(milestones.sortOrder)).all(),
      );
    },
  );
}

function registerTaskGroupTools(mcp: McpServer): void {
  mcp.tool(
    'createTaskGroup',
    'Create a new task group within a milestone',
    {
      milestoneId: z.number().describe('Milestone ID'),
      name: z.string().describe('Task group name'),
      repos: z.array(z.string()).optional().describe('Repository paths'),
    },
    async ({ milestoneId, name, repos }) => {
      const db = getDb();
      const group = db
        .insert(taskGroups)
        .values({ milestoneId, name, repos })
        .returning()
        .get();
      return mcpResult(group);
    },
  );

  mcp.tool(
    'listTaskGroups',
    'List task groups for a milestone',
    { milestoneId: z.number().describe('Milestone ID') },
    async ({ milestoneId }) => {
      const db = getDb();
      return mcpResult(
        db.select().from(taskGroups).where(eq(taskGroups.milestoneId, milestoneId)).all(),
      );
    },
  );
}

function registerMemoryTools(mcp: McpServer): void {
  mcp.tool(
    'createFleetingMemory',
    'Create a fleeting memory note for quick capture',
    {
      workspaceId: z.number().describe('Workspace ID'),
      content: z.string().describe('Memory content'),
      type: z
        .enum(['capture', 'question', 'blocker', 'idea', 'reference'])
        .default('capture')
        .describe('Memory type'),
      source: z.enum(['agent', 'user', 'system']).default('agent').describe('Memory source'),
      projectId: z.number().optional().describe('Project ID'),
      tags: z.array(z.string()).default([]).describe('Tags for organization'),
    },
    async (args) => {
      const db = getDb();
      const memory = db.insert(fleetingMemories).values(args).returning().get();
      return mcpResult(memory);
    },
  );

  mcp.tool(
    'listMemories',
    'List fleeting memories, optionally filtered by workspace or project',
    {
      workspaceId: z.number().optional().describe('Filter by workspace ID'),
      projectId: z.number().optional().describe('Filter by project ID'),
    },
    async ({ workspaceId, projectId }) => {
      const db = getDb();
      const query = db.select().from(fleetingMemories);

      if (projectId) return mcpResult(query.where(eq(fleetingMemories.projectId, projectId)).all());
      if (workspaceId) return mcpResult(query.where(eq(fleetingMemories.workspaceId, workspaceId)).all());
      return mcpResult(query.all());
    },
  );
}

function registerFileTools(mcp: McpServer): void {
  mcp.tool(
    'readFile',
    'Read a file from an allowed path (engy dir or workspace repo)',
    { path: z.string().describe('Absolute path to the file') },
    async ({ path: filePath }) => {
      if (!isPathAllowed(filePath)) {
        return mcpError('Path not allowed. Only files within the engy directory or workspace repos are accessible.');
      }

      const resolved = path.resolve(filePath);
      if (!fs.existsSync(resolved)) return mcpError('File not found');
      if (!fs.statSync(resolved).isFile()) return mcpError('Path is not a file');

      return mcpText(fs.readFileSync(resolved, 'utf-8'));
    },
  );

  mcp.tool(
    'listDirectory',
    'List directory contents from an allowed path (engy dir or workspace repo)',
    { path: z.string().describe('Absolute path to the directory') },
    async ({ path: dirPath }) => {
      if (!isPathAllowed(dirPath)) {
        return mcpError('Path not allowed. Only directories within the engy directory or workspace repos are accessible.');
      }

      const resolved = path.resolve(dirPath);
      if (!fs.existsSync(resolved)) return mcpError('Directory not found');
      if (!fs.statSync(resolved).isDirectory()) return mcpError('Path is not a directory');

      const entries = fs.readdirSync(resolved, { withFileTypes: true }).map((entry) => ({
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : 'file',
      }));
      return mcpResult(entries);
    },
  );
}
