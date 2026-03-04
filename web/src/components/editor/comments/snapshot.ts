import type { CommentStore } from "../thread-store";
import type { PmNode, TextQuoteSelector } from "./types";

const CONTEXT_CHARS = 50;

/**
 * Walk the ProseMirror document, find all active "comment" marks, and persist
 * their text anchors into thread.metadata. Called before each save so anchors
 * stay current as the user edits.
 */
export function snapshotAnchors(doc: PmNode, threadStore: CommentStore): void {
  const ranges = new Map<string, { from: number; to: number }>();

  doc.descendants((node, pos) => {
    if (!node.isText) return;
    for (const mark of node.marks) {
      if (mark.type.name !== "comment") continue;
      const threadId = mark.attrs.threadId as string | undefined;
      if (!threadId) continue;

      const nodeEnd = pos + node.nodeSize;
      const existing = ranges.get(threadId);
      ranges.set(threadId, {
        from: existing ? Math.min(existing.from, pos) : pos,
        to: existing ? Math.max(existing.to, nodeEnd) : nodeEnd,
      });
    }
  });

  for (const [threadId, { from, to }] of ranges) {
    const exact = doc.textBetween(from, to);
    if (!exact) continue;

    const blockStart = doc.resolve(from).start();
    const blockEnd = doc.resolve(to).end();

    const anchor: TextQuoteSelector = {
      exact,
      prefix: doc.textBetween(Math.max(blockStart, from - CONTEXT_CHARS), from),
      suffix: doc.textBetween(to, Math.min(blockEnd, to + CONTEXT_CHARS)),
    };

    // Store nested so it satisfies the generic Record<string, unknown> signature
    threadStore.setThreadMetadata(threadId, { anchor });
  }
}
