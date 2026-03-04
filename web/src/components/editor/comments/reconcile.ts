import type { CommentStore } from "../thread-store";
import type { PmNode, TextQuoteSelector } from "./types";
import { findTextQuoteMatch } from "./matcher";

/** Minimal duck-type for the Tiptap editor parts we need */
interface TiptapEditor {
  state: {
    doc: PmNode;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tr: any;
    schema: {
      marks: Record<string, { create(attrs: Record<string, unknown>): unknown } | undefined>;
    };
  };
  view: {
    dispatch(tr: unknown): void;
  };
}

/**
 * After loading fresh blocks from markdown, re-apply comment marks by matching
 * each thread's stored TextQuoteSelector anchor against the new document text.
 * Threads without an anchor (not yet saved) are skipped — their marks are
 * already present if the editor was not remounted.
 */
export function reconcileAnchors(tiptapEditor: TiptapEditor, threadStore: CommentStore): void {
  const threads = threadStore.getThreads();
  if (threads.size === 0) return;

  const { state } = tiptapEditor;
  const commentMarkType = state.schema.marks.comment;
  if (!commentMarkType) return;

  // Build a single transaction for all marks — dispatching one per thread causes
  // "mismatched transaction" errors because each dispatch updates editor state.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tr: any = state.tr;
  let hasMarks = false;

  for (const [threadId, thread] of threads) {
    if (thread.deletedAt || thread.resolved) continue;
    const meta = thread.metadata as { anchor?: TextQuoteSelector } | undefined;
    const anchor = meta?.anchor;
    if (!anchor?.exact) continue;

    const match = findTextQuoteMatch(state.doc, anchor);
    if (!match) continue;

    const mark = commentMarkType.create({ orphan: false, threadId });
    tr = tr.addMark(match.from, match.to, mark);
    hasMarks = true;
  }

  if (hasMarks) tiptapEditor.view.dispatch(tr);
}
