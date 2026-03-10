export function shellEscape(s: string): string {
  return s.replace(/'/g, "'\\''");
}

export function buildAddDirFlags(dirs: string[]): string {
  if (dirs.length === 0) return '';
  return dirs.map((d) => ` --add-dir '${shellEscape(d)}'`).join('');
}
