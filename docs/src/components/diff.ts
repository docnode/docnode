// If I put this in the mdx file, prettier will mess up the formatting.
export const diff = `
\`\`\`ts
type Diff = {
  /**
   * Set of IDs of the nodes inserted during the transaction.
   */
  inserted: Set<string>;
  /**
   * Map of DocNode IDs to the DocNodes that were deleted during the transaction.
   */
  deleted: Map<string, DocNode>;
  /**
   * Set of IDs of the nodes that were moved during the transaction, either
   * because the move operation was used, or because they were deleted and
   * reinserted.
   */
  moved: Set<string>;
  /**
   * Set of IDs of the nodes whose state was updated during the transaction.
   * It does not include nodes that were inserted or deleted in the same transaction.
   */
  updated: Set<string>;
};
\`\`\`
`;
