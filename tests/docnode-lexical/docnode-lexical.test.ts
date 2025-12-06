import { test, expect } from "vitest";
import { Doc } from "docnode";
import { docToLexical } from "@docnode/lexical";
import { assertJson } from "../docnode/utils.js";

test("docnode to lexical", () => {
  // const doc = new Doc({ extensions: [{ nodes: [LexicalDocNode] }] });
  const { editor, doc } = docToLexical({
    namespace: "MyEditor",
    onError: (error) => {
      console.error(error);
    },
  });
  expect(doc).toBeInstanceOf(Doc);
  const jsonEditorState = editor.getEditorState().toJSON();
  expect(jsonEditorState).toStrictEqual({
    root: {
      children: [],
      direction: null,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  });
  const rootJson = JSON.stringify(jsonEditorState.root);
  expect(rootJson).toStrictEqual(
    '{"children":[],"direction":null,"format":"","indent":0,"type":"root","version":1}',
  );
  assertJson(doc, ["root", {}, [["l", { j: rootJson }]]]);
});
