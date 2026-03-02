"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useCreateBlockNote,
  BlockNoteViewEditor,
  ThreadsSidebar,
  FloatingComposerController,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import { CommentsExtension } from "@blocknote/core/comments";
import type { User } from "@blocknote/core/comments";
import "@blocknote/shadcn/style.css";
import "@blocknote/react/style.css";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { RiFileCopyLine, RiCheckLine } from "@remixicon/react";
import { EngyThreadStore } from "./thread-store";

const USER_ID = "local-user";
const LOCAL_USER: User = { id: USER_ID, username: "You", avatarUrl: "" };

async function resolveUsers(): Promise<User[]> {
  return [LOCAL_USER];
}

interface SpecEditorProps {
  workspaceSlug: string;
  specSlug: string;
  documentPath: string;
  initialBody: string;
  editorJson: unknown[] | null;
  showComments?: boolean;
}

const AUTOSAVE_DELAY_MS = 1500;

export function SpecEditor({
  workspaceSlug,
  specSlug,
  documentPath,
  initialBody,
  editorJson,
  showComments,
}: SpecEditorProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);
  const [hasThreads, setHasThreads] = useState(false);
  const [copied, setCopied] = useState(false);
  const utils = trpc.useUtils();

  const updateMutation = trpc.spec.update.useMutation({
    onSuccess: () => {
      utils.spec.get.invalidate({ workspaceSlug, specSlug });
    },
    onError: (err) => {
      console.error("[spec-editor] autosave failed:", err.message);
    },
  });

  const mutateRef = useRef(updateMutation.mutate);
  useEffect(() => {
    mutateRef.current = updateMutation.mutate;
  }, [updateMutation.mutate]);

  const threadStore = useMemo(
    () => new EngyThreadStore(workspaceSlug, documentPath),
    [workspaceSlug, documentPath],
  );

  useEffect(() => {
    setHasThreads(threadStore.getThreads().size > 0);
    return threadStore.subscribe((threads) => {
      setHasThreads(threads.size > 0);
    });
  }, [threadStore]);

  const editor = useCreateBlockNote(
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialContent: editorJson ? (editorJson as any) : undefined,
      extensions: [CommentsExtension({ threadStore, resolveUsers })],
    },
    [threadStore],
  );

  useEffect(() => {
    if (editorJson || !initialBody || loadedRef.current) return;
    loadedRef.current = true;
    async function loadContent() {
      const blocks = await editor.tryParseMarkdownToBlocks(initialBody);
      editor.replaceBlocks(editor.document, blocks);
    }
    loadContent();
  }, [editor, initialBody, editorJson]);

  const handleChange = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      const markdown = await editor.blocksToMarkdownLossy(editor.document);
      const hasComments = threadStore.getThreads().size > 0;
      mutateRef.current({
        workspaceSlug,
        specSlug,
        body: markdown,
        // Only persist editor JSON when comments exist (to preserve marks)
        editorJson: hasComments ? (editor.document as unknown[]) : undefined,
      });
    }, AUTOSAVE_DELAY_MS);
  }, [editor, workspaceSlug, specSlug]);

  const handleCopyComments = useCallback(() => {
    const threads = threadStore.getThreads();
    if (threads.size === 0) return;

    const lines: string[] = [];
    for (const [, thread] of threads) {
      if (thread.deletedAt) continue;
      const comments = thread.comments.filter((c) => !c.deletedAt);
      if (comments.length === 0) continue;
      if (thread.resolved) lines.push("*(Resolved)*");
      for (const comment of comments) {
        const text = extractCommentText(comment.body);
        lines.push(`> ${text}`);
      }
      lines.push("");
    }

    navigator.clipboard.writeText(lines.join("\n").trim()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [threadStore]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <BlockNoteView
      editor={editor}
      onChange={handleChange}
      theme="dark"
      renderEditor={false}
      comments={false}
    >
      <FloatingComposerController />
      <div className="relative flex w-full h-full overflow-hidden">
        <div className="relative flex-1 min-w-0 overflow-y-auto">
          <BlockNoteViewEditor />
        </div>
        {showComments && hasThreads && (
          <div className="w-72 border-l border-border overflow-y-auto shrink-0">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Comments</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyComments}
                className="h-6 px-2 text-xs"
              >
                {copied ? (
                  <>
                    <RiCheckLine className="size-3 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <RiFileCopyLine className="size-3 mr-1" />
                    Copy All
                  </>
                )}
              </Button>
            </div>
            <div className="p-3">
              <ThreadsSidebar filter="all" sort="position" />
            </div>
          </div>
        )}
      </div>
    </BlockNoteView>
  );
}

function extractCommentText(body: unknown): string {
  if (!body || !Array.isArray(body)) return "";
  return body
    .map((block: { content?: Array<{ type: string; text?: string }> }) => {
      if (!block.content || !Array.isArray(block.content)) return "";
      return block.content
        .filter((item) => item.type === "text")
        .map((item) => item.text ?? "")
        .join("");
    })
    .join("\n")
    .trim();
}
