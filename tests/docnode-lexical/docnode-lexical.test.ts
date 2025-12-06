import { test, expect } from "vitest";
import { Doc } from "docnode";
import { docToLexical, LexicalDocNode } from "@docnode/lexical";
import { LexicalEditor } from "lexical";
import { assertJson } from "../docnode/utils.js";

test("docnode to lexical", () => {
  // const doc = new Doc({ extensions: [{ nodes: [LexicalDocNode] }] });
  const { editor: _, doc } = docToLexical({
    namespace: "MyEditor",
    onError: (error) => {
      console.error(error);
    },
  });
  expect(doc).toBeInstanceOf(Doc);
  assertJson(doc, ["root", {}]);
  // expect(editor).toBeInstanceOf(createEditor);
});
