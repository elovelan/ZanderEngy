export function shellEscape(s: string): string {
  return s.replace(/'/g, "'\\''");
}

export function buildAddDirFlags(dirs: string[]): string {
  if (dirs.length === 0) return '';
  return dirs.map((d) => ` --add-dir '${shellEscape(d)}'`).join('');
}

// ── Quick-action directory logic — DO NOT CHANGE ──────────────────────
// When starting Claude from task quick actions (plan/implement):
//   - Working dir = 1st repo (so Claude runs inside the repo)
//   - Additional dirs = projectDir (if different) + remaining repos
// This is DIFFERENT from the default terminal which starts in projectDir.
// See use-terminal-scope.ts for the default terminal logic.
export function buildQuickActionDirs(
  repos: string[],
  projectDir?: string | null,
): { workingDir: string | undefined; additionalDirs: string[] } {
  const workingDir = repos[0] ?? projectDir ?? undefined;
  const additionalDirs = [
    ...(projectDir && projectDir !== workingDir ? [projectDir] : []),
    ...repos.slice(1),
  ];
  return { workingDir, additionalDirs };
}
