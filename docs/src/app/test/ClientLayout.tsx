"use client";

import { DocNodeClientProvider } from "@docnode/sync-react";
import { type ReactNode } from "react";
import { defineNode, type Doc, string } from "docnode";

export const IndexNode = defineNode({
  type: "editor-index",
  state: {
    value: string(""),
    // TODO: fromJSON and toJSON should have jsdocs
    // asd: {
    //   fromJSON: (json) => json,
    // }
  },
});

export function createIndexNode(doc: Doc, { value }: { value: string }) {
  const node = doc.createNode(IndexNode);
  node.state.value.set(value);
  return node;
}

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <DocNodeClientProvider
      config={{
        url: "ws://localhost:8081",
        userId: "user1",
        // undoManagerSize: 50, // by default is 0
        indexDoc: {
          extensions: [{ nodes: [IndexNode] }],
        },
      }}
    >
      {children}
    </DocNodeClientProvider>
  );
}
