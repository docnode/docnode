"use client";

import React, { createContext, use, useLayoutEffect, useState } from "react";
import { DocRenderer, DocRenderer2 } from "./renderers.js";
import { DocNodeClient, type ClientConfig } from "@docnode/sync/client";
import type { Doc } from "docnode";
export { DocRenderer, DocRenderer2 };

type ClientState = DocNodeClient | undefined;
const DocNodeClientContext = createContext<ClientState>(undefined);

export function DocNodeClientProvider(props: {
  config: ClientConfig;
  children: React.ReactNode;
}) {
  const { config, children } = props;
  const [client, setClient] = useState<ClientState>(undefined);

  useLayoutEffect(() => {
    setClient(new DocNodeClient(config));
  }, []);

  return (
    <DocNodeClientContext.Provider value={client}>
      {children}
    </DocNodeClientContext.Provider>
  );
}

export function useDoc(docId: string) {
  const [doc, setDoc] = useState<Doc | undefined>();
  const client = use(DocNodeClientContext);

  // The reason why I can't just `return client?.getDoc(docId)` is because I get error
  // "async/await is not YET supported in Client Components". Maybe in the future.
  useLayoutEffect(() => {
    client?.getDoc(docId).then(setDoc).catch(console.error);
    return () => {
      client?._unloadDoc(docId).catch(console.error);
    };
  }, [client, docId]);

  return doc;
}

export function useIndexDoc() {
  return useDoc("");
}
