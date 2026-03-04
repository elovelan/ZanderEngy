/**
 * W3C Web Annotation TextQuoteSelector — anchors a comment to text content
 * rather than block IDs, so it survives markdown roundtrips.
 */
export interface TextQuoteSelector {
  /** The exact text the comment was applied to */
  exact: string;
  /** Up to 50 chars immediately before the selection (same paragraph) */
  prefix: string;
  /** Up to 50 chars immediately after the selection (same paragraph) */
  suffix: string;
}

/** Minimal duck-type for the ProseMirror Node parts we use across the module */
export interface PmNode {
  isText: boolean;
  text?: string;
  nodeSize: number;
  textContent: string;
  marks: Array<{ type: { name: string }; attrs: Record<string, unknown> }>;
  textBetween(from: number, to: number, blockSeparator?: string): string;
  descendants(fn: (node: PmNode, pos: number) => boolean | void): void;
  resolve(pos: number): { start(): number; end(): number };
}
