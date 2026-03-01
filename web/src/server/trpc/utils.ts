import { eq, and } from 'drizzle-orm';
import { getDb } from '../db/client';
import { workspaces, projects } from '../db/schema';

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function uniqueWorkspaceSlug(name: string): Promise<string> {
  const db = getDb();
  const base = generateSlug(name);
  let slug = base;
  let counter = 2;

  while (true) {
    const existing = db.select().from(workspaces).where(eq(workspaces.slug, slug)).get();
    if (!existing) return slug;
    slug = `${base}-${counter}`;
    counter++;
  }
}

export function uniqueProjectSlug(workspaceId: number, name: string): string {
  const db = getDb();
  const base = generateSlug(name);
  let slug = base;
  let counter = 2;

  while (true) {
    const existing = db
      .select()
      .from(projects)
      .where(and(eq(projects.workspaceId, workspaceId), eq(projects.slug, slug)))
      .get();
    if (!existing) return slug;
    slug = `${base}-${counter}`;
    counter++;
  }
}
