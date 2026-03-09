import { inArray } from 'drizzle-orm';
import { getDb } from '../db/client';
import { tasks, taskDependencies } from '../db/schema';

type DepRow = { taskId: number; blockerTaskId: number };

function buildAdjMap(deps: DepRow[]): Map<number, number[]> {
  const map = new Map<number, number[]>();
  for (const dep of deps) {
    const arr = map.get(dep.taskId) ?? [];
    arr.push(dep.blockerTaskId);
    map.set(dep.taskId, arr);
  }
  return map;
}

function detectCycle(
  taskId: number,
  deps: number[],
  adjMap: Map<number, number[]>,
): boolean {
  const visited = new Set<number>();
  const stack = [...deps];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === taskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    stack.push(...(adjMap.get(current) ?? []));
  }

  return false;
}

export function validateDependencies(taskId: number | null, blockedBy: number[]): number[] {
  const unique = [...new Set(blockedBy)];
  if (unique.length === 0) return unique;

  if (taskId !== null && unique.includes(taskId)) {
    throw new Error('A task cannot block itself');
  }

  const db = getDb();

  const found = db.select({ id: tasks.id }).from(tasks)
    .where(inArray(tasks.id, unique)).all();
  const foundIds = new Set(found.map((r) => r.id));
  for (const depId of unique) {
    if (!foundIds.has(depId)) {
      throw new Error(`Task ${depId} does not exist`);
    }
  }

  if (taskId !== null) {
    const allDeps = db.select().from(taskDependencies).all();
    if (detectCycle(taskId, unique, buildAdjMap(allDeps))) {
      throw new Error('Circular dependency detected');
    }
  }

  return unique;
}

export function attachBlockedBy<T extends { id: number }>(rows: T[]): (T & { blockedBy: number[] })[] {
  if (rows.length === 0) return [];
  const db = getDb();
  const deps = db.select().from(taskDependencies)
    .where(inArray(taskDependencies.taskId, rows.map((r) => r.id))).all();
  const map = buildAdjMap(deps);
  return rows.map((r) => ({ ...r, blockedBy: map.get(r.id) ?? [] }));
}
