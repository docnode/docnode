"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { useLayoutEffect } from "react";
import ToolbarPlugin from "./ToolbarPlugin";

export default function LexicalPage() {
  useLayoutEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  }, []);

  return (
    <>
      <div className="m-2 mx-auto w-[600px] border-2 border-black pt-8">
        <LexicalComposer
          initialConfig={{
            namespace: "MyEditor",
            onError: (error) => {
              console.error(error);
            },
          }}
        >
          <ToolbarPlugin />
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="border-2 border-black bg-slate-800 p-2" />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </LexicalComposer>
      </div>
    </>
  );
}
