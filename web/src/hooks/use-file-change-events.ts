'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

interface FileChangeMessage {
  type: 'FILE_CHANGE';
  payload: {
    workspaceSlug: string;
    path: string;
    eventType: 'add' | 'change' | 'unlink';
  };
}

const DEBOUNCE_MS = 500;

export function useFileChangeEvents(workspaceSlug: string, projectSlug: string) {
  const utils = trpc.useUtils();
  const router = useRouter();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    function handlePlanEvent(taskSlug: string, eventType: string) {
      // Debounce: chokidar fires add+change in quick succession
      const existing = debounceTimers.current.get(taskSlug);
      if (existing) clearTimeout(existing);

      debounceTimers.current.set(
        taskSlug,
        setTimeout(() => {
          debounceTimers.current.delete(taskSlug);

          utils.project.getBySlug.invalidate();

          if (eventType !== 'unlink') {
            toast(`Plan ready for ${taskSlug}`, {
              action: {
                label: 'Review',
                onClick: () => {
                  router.push(
                    `/w/${workspaceSlug}/projects/${projectSlug}/docs?file=plans/${taskSlug}.plan.md`,
                  );
                },
              },
            });
          }
        }, DEBOUNCE_MS),
      );
    }

    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/events`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        let msg: FileChangeMessage;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }

        if (msg.type !== 'FILE_CHANGE') return;
        if (msg.payload.workspaceSlug !== workspaceSlug) return;

        const planMatch = msg.payload.path.match(/\/plans\/([^/]+)\.plan\.md$/);
        if (!planMatch) return;

        handlePlanEvent(planMatch[1], msg.payload.eventType);
      };

      ws.onclose = () => {
        wsRef.current = null;
        reconnectTimer.current = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer.current);
      for (const timer of debounceTimers.current.values()) clearTimeout(timer);
      debounceTimers.current.clear();
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [workspaceSlug, projectSlug, utils, router]);
}
