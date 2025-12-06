/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  defineNode,
  type DocNode,
  string,
  Doc,
  type JsonDoc,
  defineState,
} from "docnode";
import {
  $getRoot,
  $parseSerializedNode,
  createEditor,
  type CreateEditorArgs,
  type LexicalEditor,
  type SerializedLexicalNode,
  type LexicalNode,
  $getNodeByKey,
  $isElementNode,
} from "lexical";

export function docToLexical(
  config: CreateEditorArgs,
  // If no doc is provided, it will create a new one.
  doc = new Doc({ extensions: [{ nodes: [LexicalDocNode] }] }),
): { editor: LexicalEditor; doc: Doc } {
  const lexicalKeyToDocNodeId = new Map<string, string>();
  const docNodeIdToLexicalKey = new Map<string, string>();

  if (!doc.root.first) {
    const rootNode = doc.createNode(LexicalDocNode);
    rootNode.state.j.set({
      children: [],
      direction: null,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    });
    doc.root.append(rootNode);
  }

  const editor = createEditor(config);
  editor.update(() => {
    $getRoot().clear();
    const iterate = (docnode: DocNode) => {
      const children: LexicalNode[] = [];
      docnode.children().forEach((child) => {
        console.log("child", child);
        if (!child.is(LexicalDocNode))
          throw new Error("Expected child to be a LexicalDocNode");
        const serializedLexicalNode = child.state.j.get();

        const lexicalNode = $parseSerializedNode(serializedLexicalNode);
        lexicalKeyToDocNodeId.set(lexicalNode.getKey(), child.id);
        children.push(lexicalNode);
      });
      const lexicalParentKey = docNodeIdToLexicalKey.get(docnode.id);
      const lexicalParent = lexicalParentKey
        ? $getNodeByKey(lexicalParentKey)
        : undefined;
      if ($isElementNode(lexicalParent)) lexicalParent?.append(...children);
      iterate(doc.root);
    };
  });

  return { editor, doc };
}

export const LexicalDocNode = defineNode({
  type: "l",
  state: {
    j: defineState({
      fromJSON: (json) =>
        (json ?? {}) as SerializedLexicalNode & { [key: string]: unknown },
    }),
  },
});
