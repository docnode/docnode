import { describe, expect, test } from "vitest";
import { Doc, type ChangeEvent } from "@docukit/docnode";
import {
  assertDoc,
  createTextDocWithUndo,
  text,
  TextExtension,
  Text,
} from "./utils.js";

describe("skipUndo", () => {
  test("keeps one observable transaction and a different inverse for user undo", () => {
    const doc = createTextDocWithUndo();
    const [trash, projects] = text(doc, "Trash", "Projects");
    doc.skipUndo(() => doc.root.append(trash!, projects!));
    doc.forceCommit();
    const events: ChangeEvent[] = [];
    doc.onChange((event) => events.push(event));
    const page = doc.skipUndo(() => {
      const [page] = text(doc, "Page");
      trash!.append(page!);
      return page!;
    });
    page.move(projects!, "append");
    expect(events).toHaveLength(0);
    doc.forceCommit();
    expect(events).toHaveLength(1);
    doc.undoManager.undo();
    expect(doc.getNodeById(page.id)).toBe(page);
    expect(page.parent).toBe(trash);
    doc.undoManager.redo();
    expect(page.parent).toBe(projects);
    expect(page.state.value.get()).toBe("Page");
    const replica = Doc.fromJSON(
      { type: "root", extensions: [TextExtension] },
      doc.toJSON(),
    );
    replica.forceCommit();
    replica.applyOperations(events[0]!.inverseOperations);
    expect(replica.getNodeById(page.id)).toBeUndefined();
    replica.dispose();
  });

  test("captures the value immediately before the undoable portion", () => {
    const doc = createTextDocWithUndo();
    const [node] = text(doc, "Original");
    doc.skipUndo(() => doc.root.append(node!));
    doc.forceCommit();
    doc.skipUndo(() => node!.state.value.set("Automatic"));
    node!.state.value.set("Manual");
    doc.forceCommit();
    doc.undoManager.undo();
    expect(node!.state.value.get()).toBe("Automatic");
    doc.undoManager.redo();
    expect(node!.state.value.get()).toBe("Manual");
  });

  test("excluded changes preserve redo and nesting is local to the document", () => {
    const doc = createTextDocWithUndo();
    const other = createTextDocWithUndo();
    doc.root.append(...text(doc, "undoable"));
    doc.forceCommit();
    doc.undoManager.undo();
    const result = doc.skipUndo(() =>
      doc.skipUndo(() => {
        doc.root.append(...text(doc, "excluded"));
        other.root.append(...text(other, "other"));
        return 42;
      }),
    );
    expect(result).toBe(42);
    doc.forceCommit();
    other.forceCommit();
    expect(doc.undoManager.canRedo()).toBe(true);
    expect(other.undoManager.canUndo()).toBe(true);
    doc.undoManager.redo();
    assertDoc(doc, ["excluded", "undoable"]);
  });

  test("an exception rolls back normal and excluded mutations", () => {
    const doc = createTextDocWithUndo();
    doc.root.append(...text(doc, "normal"));
    expect(() =>
      doc.skipUndo(() => {
        doc.root.append(...text(doc, "excluded"));
        throw new Error("failure");
      }),
    ).toThrow("failure");
    assertDoc(doc, []);
    doc.root.append(...text(doc, "next"));
    doc.forceCommit();
    doc.undoManager.undo();
    assertDoc(doc, []);
  });
});

describe("mixed history boundaries", () => {
  test("normal, excluded and normal writes share one undo step", () => {
    const doc = createTextDocWithUndo();
    const [node] = text(doc, "0");
    doc.skipUndo(() => doc.root.append(node!));
    doc.forceCommit();
    node!.state.value.set("1");
    doc.skipUndo(() => node!.state.value.set("2"));
    node!.state.value.set("3");
    doc.forceCommit();
    expect(doc.undoManager.exportHistory().undoStack).toHaveLength(1);
    doc.undoManager.undo();
    expect(node!.state.value.get()).toBe("0");
    doc.undoManager.redo();
    expect(node!.state.value.get()).toBe("3");
  });

  test("skipped state on an inserted node survives undo of a later state change", () => {
    const doc = createTextDocWithUndo();
    const [node] = text(doc, "seed");
    doc.skipUndo(() => doc.root.append(node!));
    node!.state.value.set("edited");
    doc.forceCommit();
    doc.undoManager.undo();
    expect(doc.getNodeById(node!.id)).toBe(node);
    expect(node!.state.value.get()).toBe("seed");
    doc.undoManager.redo();
    expect(node!.state.value.get()).toBe("edited");
  });

  test("a skipped deletion is not resurrected by unrelated undo", () => {
    const doc = createTextDocWithUndo();
    const [removed, kept] = text(doc, "removed", "kept");
    doc.skipUndo(() => doc.root.append(removed!, kept!));
    doc.forceCommit();
    doc.skipUndo(() => removed!.delete());
    kept!.state.value.set("changed");
    doc.forceCommit();
    doc.undoManager.undo();
    assertDoc(doc, ["kept"]);
    doc.undoManager.redo();
    assertDoc(doc, ["changed"]);
  });

  test("deleting a skipped insertion restores its ID, descendants and latest state", () => {
    const doc = createTextDocWithUndo();
    const [parent, child] = text(doc, "parent", "child");
    doc.skipUndo(() => {
      doc.root.append(parent!);
      parent!.append(child!);
    });
    const ids = [parent!.id, child!.id];
    parent!.delete();
    doc.forceCommit();
    doc.undoManager.undo();
    assertDoc(doc, ["parent", "__child"]);
    expect(doc.root.first!.id).toBe(ids[0]);
    expect(doc.root.first!.first!.id).toBe(ids[1]);
    doc.undoManager.redo();
    assertDoc(doc, []);
  });

  test("rollback restores both portions after a move and a deletion", () => {
    const doc = createTextDocWithUndo();
    const [a, b, c] = text(doc, "A", "B", "C");
    doc.skipUndo(() => doc.root.append(a!, b!, c!));
    doc.forceCommit();
    expect(() =>
      doc.skipUndo(() => {
        a!.move(b!, "append");
        c!.delete();
        throw new Error("cancel");
      }),
    ).toThrow("cancel");
    assertDoc(doc, ["A", "B", "C"]);
    expect(doc.undoManager.canUndo()).toBe(false);
  });

  test("empty portions do not create history or emit changes", () => {
    const doc = createTextDocWithUndo();
    let changes = 0;
    doc.onChange(() => changes++);
    expect(doc.skipUndo(() => undefined)).toBeUndefined();
    expect(doc.skipUndo(() => null)).toBeNull();
    expect(doc.skipUndo(() => ({ then: false }))).toStrictEqual({
      then: false,
    });
    doc.root.append(...text(doc, "temporary"));
    doc.root.deleteChildren();
    doc.skipUndo(() => undefined);
    doc.forceCommit();
    expect(changes).toBe(0);
    expect(doc.undoManager.canUndo()).toBe(false);
  });

  test("thenable results are rejected and pending mutations are rolled back", () => {
    const doc = createTextDocWithUndo();
    expect(() => {
      // @ts-expect-error Async results cannot be used with a synchronous scope.
      void doc.skipUndo(() => {
        doc.root.append(...text(doc, "discard"));
        return Promise.resolve();
      });
    }).toThrow("synchronous");
    assertDoc(doc, []);
    expect(() =>
      doc.skipUndo(() => {
        throw new Error("empty");
      }),
    ).toThrow("empty");
  });
});

for (const skipNormalization of [false, true]) {
  test(`normalization is ${skipNormalization ? "explicitly excluded" : "undoable after excluded mutations"}`, () => {
    let normalize = false;
    const doc = new Doc({
      type: "root",
      extensions: [
        {
          nodes: [Text],
          register(doc) {
            doc.onNormalize(() => {
              const first = doc.root.first;
              if (
                !normalize ||
                !first?.is(Text) ||
                first.state.value.get() === "normalized"
              )
                return;
              const update = () => first.state.value.set("normalized");
              if (skipNormalization) doc.skipUndo(update);
              else update();
            });
          },
        },
      ],
      undoManager: { maxUndoSteps: 10, mergeInterval: 0 },
    });
    doc.forceCommit();
    const [node] = text(doc, "original");
    doc.skipUndo(() => doc.root.append(node!));
    doc.forceCommit();
    normalize = true;
    doc.skipUndo(() => {
      node!.state.value.set("excluded");
      // Explicit commit inside the scope must not suppress the normalizer.
      doc.forceCommit();
    });
    expect(node!.state.value.get()).toBe("normalized");
    expect(doc.undoManager.canUndo()).toBe(!skipNormalization);
    normalize = false;
    if (!skipNormalization) {
      doc.undoManager.undo();
      expect(node!.state.value.get()).toBe("excluded");
      doc.undoManager.redo();
      expect(node!.state.value.get()).toBe("normalized");
    }
  });
}

test("mixed history and metadata survive export/import without recreating IDs", () => {
  const source = createTextDocWithUndo();
  const [node] = text(source, "seed");
  source.skipUndo(() => source.root.append(node!));
  node!.state.value.set("edited");
  const off = source.undoManager.onPush(({ meta }) =>
    meta.set("focusedId", node!.id),
  );
  source.forceCommit();
  const history = source.undoManager.exportHistory();
  off();
  const replacement = Doc.fromJSON(
    {
      type: "root",
      extensions: [TextExtension],
      undoManager: { maxUndoSteps: 10, mergeInterval: 0 },
    },
    source.toJSON(),
  );
  replacement.forceCommit();
  replacement.undoManager.importHistory(history);
  let restoredId: unknown;
  replacement.undoManager.onPop(({ meta }) => {
    restoredId = meta.get("focusedId");
  });
  replacement.undoManager.undo();
  expect(restoredId).toBe(node!.id);
  assertDoc(replacement, ["seed"]);
  expect(replacement.root.first!.id).toBe(node!.id);
  replacement.undoManager.redo();
  assertDoc(replacement, ["edited"]);
});
