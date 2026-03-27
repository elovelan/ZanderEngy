'use client';

import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

type Scope = 'task' | 'taskGroup' | 'milestone';

export function useExecutionStatus(scope: Scope, id: number | string) {
  const utils = trpc.useUtils();

  const { data } = trpc.execution.getSessionStatus.useQuery(
    { scope, id },
    { refetchInterval: (query) => (query.state.data?.status === 'active' ? 10_000 : false) },
  );

  const status = data?.status ?? null;
  const sessionId = data?.sessionId ?? null;
  const completionSummary = data?.completionSummary ?? null;
  const isActive = status === 'active';

  const startMutation = trpc.execution.startExecution.useMutation({
    onSuccess: () => {
      utils.execution.getSessionStatus.invalidate({ scope, id });
    },
    onError: (err) => {
      toast.error('Failed to start execution', { description: err.message });
      utils.execution.getSessionStatus.invalidate({ scope, id });
    },
  });

  const stopMutation = trpc.execution.stopExecution.useMutation({
    onSuccess: () => {
      utils.execution.getSessionStatus.invalidate({ scope, id });
    },
    onError: (err) => {
      toast.error('Failed to stop execution', { description: err.message });
      utils.execution.getSessionStatus.invalidate({ scope, id });
    },
  });

  function start() {
    startMutation.mutate({ scope, id });
  }

  function stop() {
    if (sessionId) {
      stopMutation.mutate({ sessionId });
    }
  }

  return {
    status,
    sessionId,
    completionSummary,
    isActive,
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
    start,
    stop,
  };
}
