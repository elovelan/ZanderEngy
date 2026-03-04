import fs from 'node:fs';
import path from 'node:path';

function validatePath(base: string, target: string): string {
  const resolved = path.resolve(base, target);
  const rel = path.relative(base, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Path traversal detected: ${target}`);
  }
  return resolved;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function milestoneFilename(sortOrder: number, title: string): string {
  return `m${sortOrder + 1}-${slugify(title)}.plan.md`;
}

export function writePlanFile(
  specsDir: string,
  specSlug: string,
  filename: string,
  content: string,
): void {
  const specDir = validatePath(specsDir, specSlug);
  const filePath = validatePath(specDir, filename);
  fs.mkdirSync(specDir, { recursive: true });
  fs.writeFileSync(filePath, content);
}

export function readPlanFile(
  specsDir: string,
  specSlug: string,
  filename: string,
): string | null {
  const specDir = validatePath(specsDir, specSlug);
  const filePath = validatePath(specDir, filename);

  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf-8');
}

export function listPlanFiles(specsDir: string, specSlug: string): string[] {
  const specDir = path.join(specsDir, specSlug);
  if (!fs.existsSync(specDir)) return [];

  return fs
    .readdirSync(specDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.plan.md'))
    .map((entry) => entry.name)
    .sort();
}

export function deletePlanFile(
  specsDir: string,
  specSlug: string,
  filename: string,
): void {
  const specDir = validatePath(specsDir, specSlug);
  const filePath = validatePath(specDir, filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Plan file "${filename}" not found`);
  }
  fs.unlinkSync(filePath);
}

export function renamePlanFile(
  specsDir: string,
  specSlug: string,
  oldFilename: string,
  newFilename: string,
): void {
  const specDir = validatePath(specsDir, specSlug);
  const oldPath = validatePath(specDir, oldFilename);
  const newPath = validatePath(specDir, newFilename);

  if (!fs.existsSync(oldPath)) return;
  fs.renameSync(oldPath, newPath);
}
