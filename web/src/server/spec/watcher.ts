import type { AppState } from '../trpc/context';

const DEBOUNCE_MS = 300;
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function handleSpecFileChange(workspaceSlug: string, state: AppState): void {
  const existing = debounceTimers.get(workspaceSlug);
  if (existing) clearTimeout(existing);

  debounceTimers.set(
    workspaceSlug,
    setTimeout(() => {
      state.specLastChanged.set(workspaceSlug, Date.now());
      debounceTimers.delete(workspaceSlug);
    }, DEBOUNCE_MS),
  );
}

export function getSpecLastChanged(workspaceSlug: string, state: AppState): number | null {
  return state.specLastChanged.get(workspaceSlug) ?? null;
}

export function clearDebounceTimers(): void {
  for (const timer of debounceTimers.values()) {
    clearTimeout(timer);
  }
  debounceTimers.clear();
}
