import fs from 'node:fs';
import path from 'node:path';
import { getEngyDir } from '../db/client';

function yamlQuote(value: string): string {
  if (/[:\-#{}&*!|>'"@`,[\]{}]/.test(value) || value.trim() !== value) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return value;
}

function validateSlug(slug: string): void {
  if (!slug || /[\/\\]/.test(slug) || slug.includes('..') || slug === '.' || slug === '..') {
    throw new Error(`Invalid workspace slug: ${slug}`);
  }
}

export function initWorkspaceDir(name: string, slug: string, repos: string[]): void {
  validateSlug(slug);

  const dir = path.join(getEngyDir(), slug);
  fs.mkdirSync(dir, { recursive: true });

  const yamlContent = [
    `name: ${yamlQuote(name)}`,
    `slug: ${yamlQuote(slug)}`,
    'repos:',
    ...repos.map((r) => `  - path: ${yamlQuote(r)}`),
  ].join('\n');
  fs.writeFileSync(path.join(dir, 'workspace.yaml'), yamlContent + '\n');

  fs.mkdirSync(path.join(dir, 'system', 'features'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'system', 'technical'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'system', 'overview.md'),
    `# ${name}\n\nWorkspace overview — edit this file to describe your project.\n`,
  );

  fs.mkdirSync(path.join(dir, 'specs'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'memory'), { recursive: true });
}

export function removeWorkspaceDir(slug: string): void {
  validateSlug(slug);

  const engyDir = path.resolve(getEngyDir());
  const dir = path.join(engyDir, slug);
  const resolved = path.resolve(dir);

  const rel = path.relative(engyDir, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Path traversal detected for slug: ${slug}`);
  }

  if (fs.existsSync(resolved)) {
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}
