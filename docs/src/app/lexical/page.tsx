"use client";

import { HeadingNode } from "@lexical/rich-text";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { useLayoutEffect } from "react";
import ToolbarPlugin from "./ToolbarPlugin";

export default function LexicalPage() {
  useLayoutEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 px-4 py-12">
      {/* Editor Container */}
      <div className="w-full max-w-2xl">
        <div className="overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-900/50 shadow-2xl shadow-black/50 backdrop-blur-sm">
          <LexicalComposer
            initialConfig={{
              namespace: "MyEditor",
              nodes: [HeadingNode],
              theme: {
                paragraph: "mb-2 text-zinc-200 leading-relaxed",
                heading: {
                  h1: "text-3xl font-bold text-white mb-4 mt-2",
                  h2: "text-2xl font-semibold text-zinc-100 mb-3 mt-2",
                  h3: "text-xl font-medium text-zinc-200 mb-2 mt-2",
                },
                text: {
                  bold: "font-bold",
                  italic: "italic",
                  underline: "underline",
                  strikethrough: "line-through",
                },
              },
              onError: (error) => {
                console.error(error);
              },
            }}
          >
            <ToolbarPlugin />
            <div className="relative">
              <RichTextPlugin
                contentEditable={
                  <ContentEditable className="min-h-[400px] px-6 py-4 text-zinc-300 outline-none focus:outline-none" />
                }
                ErrorBoundary={LexicalErrorBoundary}
                placeholder={
                  <div className="pointer-events-none absolute left-6 top-4 text-zinc-600">
                    Start writing something amazing...
                  </div>
                }
              />
            </div>
            <HistoryPlugin />
          </LexicalComposer>
        </div>
      </div>
    </div>
  );
}
